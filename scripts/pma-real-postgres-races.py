#!/usr/bin/env python3
"""Run only in a disposable GitHub CI PostgreSQL service; never accept a live DSN."""
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from urllib.parse import urlparse

T = '20000000-0000-4000-8000-000000000001'
P = '40000000-0000-4000-8000-000000000001'
OWNER = '10000000-0000-4000-8000-000000000001'
SID = 'a0000000-0000-4000-8000-000000000001'
SID2 = 'a0000000-0000-4000-8000-000000000002'
CALL = 'CA' + '1' * 32
CALL2 = 'CA' + '2' * 32
VOICE = 'select public.pm_voice_turn_v1(%s,%s,%s,%s,%s::jsonb)'


def main():
    dsn = os.environ.get('PMA_QA_DATABASE_URL', '')
    target = urlparse(dsn)
    if (os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('PMA_QA_EPHEMERAL') != 'true'
            or target.hostname not in ('127.0.0.1', 'localhost') or target.port != 55432
            or target.path != '/pma005_r5_qa' or target.username != 'pma_qa_admin'):
        raise SystemExit('REFUSED: dedicated ephemeral CI database required')
    import psycopg
    evidence = {'status': 'NOT_PROVEN', 'sourceSha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
                'target': 'ephemeral-loopback-CI-pma005_r5_qa', 'scenarios': [], 'security': [], 'cleanup': 'PENDING'}
    output = Path('artifacts/pma-qa/real-postgres-races.json')
    output.parent.mkdir(parents=True, exist_ok=True)
    admin = psycopg.connect(dsn, autocommit=True, application_name='pma_r5_observer')
    owns_fixture = False

    def run(conn, sql, args=None):
        cur = conn.execute(sql, args, prepare=False)
        answer = None
        while True:
            if cur.description:
                answer = cur.fetchall()
            if not cur.nextset():
                break
        return answer

    def safe(out):
        return {k: v for k, v in out.items() if k in ('state', 'status', 'operationId', 'contactId', 'showingId', 'replayed', 'bookingConfirmed', 'domainPersisted', 'historical')}

    def identity(conn):
        row = conn.execute('select pg_backend_pid(),txid_current()::text,clock_timestamp()').fetchone()
        return dict(zip(('pid', 'txid', 'started'), row))

    def overlap(name, sql, left_args, right_args, commit_left=True, role='service_role', synthetic=False):
        a = psycopg.connect(dsn, application_name='pma_r5_left')
        b = psycopg.connect(dsn, application_name='pma_r5_right')
        proof = {'name': name, 'leftCommitted': commit_left}
        pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        pending = None
        try:
            for conn in (a, b):
                conn.execute("set local statement_timeout='12s'")
                conn.execute('set local role ' + role)
                conn.execute("select set_config('request.jwt.claims',%s,true)", (json.dumps({'sub': OWNER, 'role': role}),))
                if synthetic:
                    conn.execute("select set_config('pma.synthetic_tours_enabled','on',true)")
            proof['left'] = identity(a)
            left = a.execute(sql, left_args).fetchone()[0]
            proof['left']['outcome'] = safe(left)
            ready = threading.Event()

            def right():
                proof['right'] = identity(b)
                ready.set()
                out = b.execute(sql, right_args).fetchone()[0]
                proof['right']['finished'] = b.execute('select clock_timestamp()').fetchone()[0]
                proof['right']['outcome'] = safe(out)
                b.commit()
                return out

            pending = pool.submit(right)
            assert ready.wait(5), 'Right backend failed to begin'
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                row = admin.execute('''select pid,backend_xid::text,xact_start,query_start,
                    wait_event_type,wait_event,pg_blocking_pids(pid),clock_timestamp()
                    from pg_stat_activity where pid=%s''', (proof['right']['pid'],)).fetchone()
                if row and row[4] == 'Lock' and proof['left']['pid'] in row[6]:
                    proof['lockWitness'] = dict(zip(('pid', 'backendXid', 'xactStart', 'queryStart', 'waitType', 'waitEvent', 'blockers', 'observedAt'), row))
                    break
                if pending.done():
                    pending.result()
                    raise AssertionError('No genuine overlapping lock contention')
                time.sleep(0.025)
            assert 'lockWitness' in proof, 'Lock witness missing'
            assert proof['left']['pid'] != proof['right']['pid']
            assert proof['left']['txid'] != proof['right']['txid']
            proof['left']['releaseStarted'] = a.execute('select clock_timestamp()').fetchone()[0]
            a.commit() if commit_left else a.rollback()
            right_out = pending.result(timeout=15)
            assert proof['right']['finished'] >= proof['left']['releaseStarted']
            proof['overlapProven'] = True
            evidence['scenarios'].append(proof)
            return left, right_out
        finally:
            a.rollback()
            if pending and not pending.done():
                pending.result(timeout=15)
            pool.shutdown(wait=True)
            b.rollback()
            a.close()
            b.close()

    def voice_args(turn, sid=SID, call=CALL):
        return (T, P, sid, call, json.dumps(turn))

    try:
        assert admin.execute('select current_database()').fetchone()[0] == 'pma005_r5_qa'
        assert admin.execute("select count(*) from pg_tables where schemaname in ('public','private','auth','storage')").fetchone()[0] == 0, 'Nonempty database refused'
        owns_fixture = True
        evidence['postgresVersion'] = admin.execute('select version()').fetchone()[0]
        run(admin, Path('supabase/tests/pma_local_baseline.sql').read_text())
        for migration in sorted(Path('supabase/migrations').glob('*_pma_*.sql')):
            evidence['bootstrapPhase'] = migration.name
            run(admin, migration.read_text())
        evidence['bootstrapPhase'] = 'synthetic fixtures'
        run(admin, Path('supabase/tests/pma_acceptance.sql').read_text().split('set local role authenticated;')[0] + '\ncommit;')
        # The fixture's transaction-local set_config reverts on commit; PostgreSQL custom GUCs default to ''
        # (empty string), not NULL, causing auth.uid()'s ''::jsonb cast to fail inside pm_audit().
        # Set the session-level claims before any admin DML that triggers the audit function.
        admin.execute("select set_config('request.jwt.claims',%s,false)", (json.dumps({'sub': OWNER, 'role': 'service_role'}),))
        # metadata was added without a DEFAULT; NULL||jsonb = NULL so use coalesce to initialise it.
        admin.execute("update public.pm_properties set accepts_inquiries=true,timezone='America/Los_Angeles',metadata=coalesce(metadata,'{}'::jsonb)||'{\"pma_synthetic_tours\":true}'::jsonb where id=%s", (P,))
        admin.execute('insert into private.pm_voice_config_v1 values(%s,%s,%s,true)', (T, P, OWNER))
        for sid, call in ((SID, CALL), (SID2, CALL2)):
            admin.execute("insert into public.ai4cc_interactions(id,tenant_id,channel,status,started_at,metadata) values(%s,%s,'voice','active',now(),%s::jsonb)",
                          (sid, T, json.dumps({'synthetic': True, 'voice_demo': True, 'selected_route': 'property-management-assistant', 'property_id': P, 'call_sid': call})))
        prospect = {'action': 'prospect', 'intent': 'LEASING_INQUIRY', 'confidence': 1, 'confirmed': True, 'message': 'Synthetic consented capture',
                    'details': {'name': 'Synthetic R5 Prospect', 'email': 'pma-r5@example.invalid', 'consent': True, 'confirmed': True, 'expectedVersion': 0}}
        a, b = overlap('prospect duplicate / committed-response recovery', VOICE, voice_args(prospect), voice_args(prospect))
        assert a['state'] == b['state'] == 'CONFIRMED' and a['contactId'] == b['contactId'] and a['operationId'] == b['operationId'] and b['replayed']
        assert admin.execute('select count(*) from private.pm_voice_operations_v1 where session_id=%s and kind=\'prospect\'', (SID,)).fetchone()[0] == 1
        a, b = overlap('rolled-back capture / surviving retry', VOICE, voice_args(prospect, SID2, CALL2), voice_args(prospect, SID2, CALL2), commit_left=False)
        assert b['state'] == 'CONFIRMED' and a['contactId'] != b['contactId']
        assert admin.execute('select count(*) from public.ai4cc_contacts where id=%s', (a['contactId'],)).fetchone()[0] == 0
        assert admin.execute('select count(*) from private.pm_voice_operations_v1 where session_id=%s and kind=\'prospect\'', (SID2,)).fetchone()[0] == 1
        showing = {'action': 'showing', 'intent': 'SHOWING_REQUEST', 'confidence': 1, 'confirmed': True, 'message': 'Synthetic request', 'requestedAt': '2099-12-01T20:00:00Z'}
        a, b = overlap('duplicate request-only showing', VOICE, voice_args(showing), voice_args(showing))
        assert a['state'] == b['state'] == 'REQUESTED' and a['showingId'] == b['showingId'] and not a['bookingConfirmed'] and not b['bookingConfirmed'] and b['replayed']
        a, b = overlap('changed showing facts conflict', VOICE, voice_args(showing), voice_args({**showing, 'requestedAt': '2099-12-02T20:00:00Z'}))
        assert b['state'] == 'CONFLICT' and not b['domainPersisted']
        assert admin.execute('select count(*) from private.pm_voice_operations_v1 where session_id=%s and kind=\'showing\'', (SID,)).fetchone()[0] == 1
        slot = '90000000-0000-4000-8000-000000000001'
        admin.execute("insert into private.pm_tour_slots_v1(id,tenant_id,property_id,starts_at,ends_at,timezone,capacity,source_ref) values(%s,%s,%s,'2099-10-25T17:00:00Z','2099-10-25T17:30:00Z','America/Los_Angeles',1,'synthetic-r5-only')", (slot, T, P))
        tour = 'select public.pm_request_or_book_showing_v1(%s,%s,%s,null,%s,\'2099-10-25T17:00:00Z\',\'synthetic only\',%s,1)'
        a, b = overlap('capacity-one synthetic slot competition', tour,
                       (T, P, '30000000-0000-4000-8000-000000000001', 'pma-r5-left-slot', slot),
                       (T, P, '30000000-0000-4000-8000-000000000002', 'pma-r5-right-slot', slot), role='authenticated', synthetic=True)
        assert a['status'] == 'CONFIRMED_SYNTHETIC' and b['status'] == 'CONFLICT' and not b['bookingConfirmed']
        assert admin.execute('select count(*) from private.pm_tour_operations_v1 where slot_id=%s', (slot,)).fetchone()[0] == 1
        for role, args in [('anon', voice_args(prospect)), ('authenticated', voice_args(prospect)), ('service_role', voice_args(prospect, SID, CALL2))]:
            with psycopg.connect(dsn) as conn:
                conn.execute('set local role ' + role)
                try:
                    conn.execute(VOICE, args)
                except psycopg.Error as exc:
                    assert exc.sqlstate == '42501'
                    conn.rollback()
                    evidence['security'].append({'role': role, 'denied': True, 'sqlstate': exc.sqlstate})
                else:
                    raise AssertionError('Unauthorized voice operation accepted')
        evidence['domainAssertionsPassed'] = True
        evidence['status'] = 'PASS_REAL_POSTGRES_SEPARATE_BACKENDS'
    except Exception as exc:
        evidence['errorType'] = type(exc).__name__
        evidence['sqlstate'] = getattr(exc, 'sqlstate', None)
        evidence['diagnostic'] = getattr(getattr(exc, 'diag', None), 'message_primary', None)
        raise
    finally:
        if owns_fixture:
            for schema in ('private', 'public', 'auth', 'storage'):
                admin.execute('drop schema if exists ' + schema + ' cascade')
            assert admin.execute("select count(*) from pg_tables where schemaname in ('public','private','auth','storage')").fetchone()[0] == 0
            evidence['cleanup'] = 'PASS_ZERO_FIXTURE_TABLES_EPHEMERAL_SERVICE_REMOVED_BY_CI'
        admin.close()
        evidence['finished'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        output.write_text(json.dumps(evidence, default=str, indent=2) + '\n')
        print(json.dumps(evidence, default=str))


if __name__ == '__main__':
    main()
