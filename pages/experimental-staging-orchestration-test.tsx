import { useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { createClient } from '../utils/supabase/server';

const { createBrowserAcceptance } = require('../twilio-bridge/tests/staging-runner/gateway-browser-acceptance.staging.cjs');

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const { previewReady } = require('../twilio-bridge/tests/staging-runner/staging-gateway-node-adapter.cjs');
  if (!previewReady(process.env) || req.headers.host !== 'deploy-preview-77--stellaruc-private-voice-poc.netlify.app') return { notFound: true };
  res.setHeader('Cache-Control', 'no-store');
  const client = createClient(req, res);
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user || auth.user.is_anonymous) { res.statusCode = 401; return { props: { authorized: false } }; }
  const { data: members, error: memberError } = await client.from('tenant_users').select('tenant_id,role,status').eq('user_id', auth.user.id).eq('tenant_id', '5885a020-d363-4c27-910a-c035eda132f5').eq('status', 'ACTIVE').in('role', ['OWNER', 'ADMIN']);
  const authorized = !memberError && members?.length === 1;
  if (!authorized) res.statusCode = 403;
  return { props: { authorized: Boolean(authorized) } };
};

export default function StagingOrchestrationTest({ authorized }: { authorized: boolean }) {
  const [evidence, setEvidence] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Prepare one fictional test. Save the cleanup manifest before submitting.');
  const [manifestSaved, setManifestSaved] = useState(false);
  const runner = useRef<any>(null);
  if (!authorized) return <main><h1>Private staging test</h1><p>Sign in to the existing application with an authorized staging administrator account, then reopen this page.</p><a href="/login">Application sign-in</a></main>;
  const getRunner = () => runner.current ??= createBrowserAcceptance({
    onEvidence: setEvidence,
    post: async (action: string, body: unknown) => {
      const r = await fetch('/api/staging-orchestration/' + action, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
      return { status: r.status, body: await r.json() };
    },
  });
  const run = async (action: string) => { setBusy(true); try { await getRunner()[action](); setMessage('Observation recorded. Database verification and cleanup remain required.'); } catch { setMessage('Operation not confirmed. Preserve this manifest and use Check original operation; do not start another test.'); } finally { setBusy(false); } };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'stellar-gateway-cleanup-manifest.json'; link.click(); URL.revokeObjectURL(url); setManifestSaved(true);
  };
  return <main style={{ maxWidth: 960, margin: '40px auto', padding: 24, fontFamily: 'system-ui' }}>
    <h1>STELLAR INTELLIGENT TECHNOLOGIES</h1><p>Operated by Apropos Group LLC</p>
    <h2>Private staging gateway acceptance</h2>
    <p>Fictional data only. This page does not place calls or send notifications.</p>
    <p role="status">{message}</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button disabled={busy || Boolean(evidence)} onClick={() => run('prepare')}>Prepare fictional fixture</button>
      <button disabled={!evidence || busy} onClick={download}>Save cleanup manifest</button>
      <button disabled={busy || !manifestSaved || evidence?.fixture?.submissionAttempted} onClick={() => run('submit')}>Submit fictional request once</button>
      <button disabled={busy || !evidence} onClick={() => run('recover')}>Check original operation</button>
      <button disabled={busy || !evidence?.fixture?.caseId} onClick={() => run('repeat')}>Repeat same confirmed request</button>
      <button disabled={busy || !evidence} onClick={() => run('negatives')}>Test rejected requests</button>
      <button disabled={busy || !evidence} onClick={() => run('missing')}>Test absent operation</button>
    </div>
    <p>Keep this page open. Operation capabilities expire after 15 minutes. A page refresh or lost capability requires coordinated recovery, never a blind new submission.</p>
    <pre aria-label="Sanitized staging evidence" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{evidence ? JSON.stringify(evidence, null, 2) : 'No test fixture prepared.'}</pre>
  </main>;
}
