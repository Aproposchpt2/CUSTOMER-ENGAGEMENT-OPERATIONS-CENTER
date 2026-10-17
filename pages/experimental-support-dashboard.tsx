import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/router';

interface CaseRow {
  caseId: string;
  customerId: string;
  createdAt: string;
  priority: string;
  product: string;
  issue: string;
  sessionId: string;
  customer: { name: string; email: string; phone: string } | null;
}

interface Usage {
  total: number;
  today: number;
  byPriority: Record<string, number>;
}

const PRIORITY_ORDER = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#ef4444',
  HIGH: '#f97316',
  NORMAL: '#3b82f6',
  LOW: '#6b7280',
};
const CHECKLIST = [
  { id: 'tenant', label: 'Staging tenant account configured', done: true },
  { id: 'writes', label: 'Database persistence verified (Gate 1)', done: true },
  { id: 'notify', label: 'Email notification working (Gate 2)', done: true },
  { id: 'security', label: 'Security gates passed (Gate 3)', done: true },
  { id: 'dashboard', label: 'Tenant dashboard live (Gate 4)', done: true },
  { id: 'prod', label: 'Production migration (Gate 5)', done: true },
];

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createBrowserClient(url, key);
}

export default function SupportDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const tenantId = (router.query.tenantId as string) || process.env.NEXT_PUBLIC_CSS_TENANT_ID || '';
  const [authMessage, setAuthMessage] = useState('Not signed in');
  const [authOk, setAuthOk] = useState(false);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<string>('');

  // Auto-detect existing Supabase session on mount
  useEffect(() => {
    supabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setAuthMessage('Signed in ✓ (' + data.session.user.email + ')');
        setAuthOk(true);
      }
    }).catch(() => {});
  }, []);

  async function sendOtp() {
    setAuthOk(false);
    try {
      const { error } = await supabaseClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error;
      setAuthMessage('Check your email for the sign-in code');
    } catch (e) { setAuthMessage(e instanceof Error ? e.message : 'Sign-in failed'); }
  }

  async function verifyOtp() {
    setAuthOk(false);
    try {
      const { error } = await supabaseClient().auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
      setAuthMessage('Signed in ✓');
      setAuthOk(true);
    } catch (e) { setAuthMessage(e instanceof Error ? e.message : 'Verification failed'); }
  }

  async function loadCases() {
    setLoading(true);
    setLoadError('');
    try {
      const r = await fetch('/api/experimental-support-cases?tenantId=' + encodeURIComponent(tenantId));
      const result = await r.json();
      if (!r.ok) { setLoadError((result.error || 'Failed to load cases') + (result.detail ? ' — ' + result.detail : '')); return; }
      setCases(result.cases || []);
      setUsage(result.usage || null);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      setLoadError('Network error — could not reach API');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authOk) return;
    loadCases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authOk]);

  const sorted = [...cases].sort((a, b) => {
    const pi = PRIORITY_ORDER.indexOf(a.priority);
    const pj = PRIORITY_ORDER.indexOf(b.priority);
    if (pi !== pj) return (pi === -1 ? 99 : pi) - (pj === -1 ? 99 : pj);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <Head><title>Stellar UC — Support Dashboard</title></Head>
      <style>{`
        :root {
          --bg: #0f1117;
          --surface: #181c27;
          --border: #2a2f3e;
          --text: #e5e9f5;
          --muted: #8891a8;
          --accent: #5b8dde;
          --accent2: #4fc3b8;
          --radius: 10px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--text); font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size: 14px; line-height: 1.55; }
        .page { max-width: 1100px; margin: 0 auto; padding: 28px 20px 60px; }
        .header { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
        .logo { width: 38px; height: 38px; background: linear-gradient(135deg,#4070d4 0%,#5b8dde 60%,#4fc3b8 100%); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .header-text h1 { font-size: 19px; font-weight: 700; letter-spacing: -.3px; }
        .header-text p { font-size: 12px; color: var(--muted); }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; background: #2a1f00; color: #f5a623; border: 1px solid #4a3600; margin-left: 8px; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 20px; }
        .card h2 { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .7px; margin-bottom: 14px; }
        .auth-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 10px; }
        .auth-row input { background: #0f1117; border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 7px 10px; font-size: 13px; flex: 1 1 180px; min-width: 0; outline: none; }
        .auth-row input:focus { border-color: var(--accent); }
        .btn { background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn:hover { filter: brightness(1.12); }
        .btn.secondary { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
        .btn.secondary:hover { border-color: var(--accent); color: var(--accent); }
        .auth-status { font-size: 12px; color: var(--muted); }
        .stats-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; }
        .stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 18px; flex: 1 1 120px; }
        .stat-val { font-size: 30px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; line-height: 1.1; }
        .stat-label { font-size: 11px; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: .5px; }
        .priority-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
        .pri-pill { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border); font-weight: 600; }
        td { padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: top; font-size: 13px; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(91,141,222,.04); }
        .pri-tag { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
        .issue-cell { max-width: 260px; color: var(--muted); font-size: 12px; }
        .case-id { font-family: monospace; font-size: 11px; color: var(--muted); }
        .time-cell { font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--muted); font-size: 12px; }
        .empty { text-align: center; padding: 40px; color: var(--muted); }
        .checklist { display: flex; flex-direction: column; gap: 8px; }
        .check-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
        .check-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
        .check-done { background: rgba(79,195,184,.15); color: var(--accent2); border: 1px solid rgba(79,195,184,.3); }
        .check-open { background: rgba(255,255,255,.04); color: var(--muted); border: 1px solid var(--border); }
        .load-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .refresh-info { font-size: 12px; color: var(--muted); }
        .error-msg { color: #ef4444; font-size: 13px; margin-top: 6px; }
      `}</style>

      <div className="page">
        <div className="header">
          <div className="logo">S</div>
          <div className="header-text">
            <h1>Stellar UC — Customer Support System</h1>
            <p>Tenant dashboard · {tenantId ? `Tenant ${tenantId.slice(0, 8)}…` : 'No tenant configured'}</p>
          </div>
        </div>

        {/* Auth card */}
        <div className="card">
          <h2>Sign-In</h2>
          <div className="auth-row">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" />
            <button className="btn" onClick={sendOtp}>Send Code</button>
          </div>
          <div className="auth-row">
            <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Sign-in code" maxLength={6} />
            <button className="btn" onClick={verifyOtp}>Verify</button>
          </div>
          <p className="auth-status">{authMessage}</p>
        </div>

        {/* Stats row */}
        {usage && (
          <div className="stats-row">
            <div className="stat">
              <div className="stat-val">{usage.total}</div>
              <div className="stat-label">Total Cases</div>
            </div>
            <div className="stat">
              <div className="stat-val">{usage.today}</div>
              <div className="stat-label">Today</div>
            </div>
            <div className="stat" style={{ flexBasis: '200px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>By Priority</div>
              <div className="priority-bar">
                {PRIORITY_ORDER.filter(p => usage.byPriority[p]).map(p => (
                  <span key={p} className="pri-pill" style={{ background: PRIORITY_COLOR[p] + '22', color: PRIORITY_COLOR[p], border: `1px solid ${PRIORITY_COLOR[p]}44` }}>
                    {p} {usage.byPriority[p]}
                  </span>
                ))}
                {Object.keys(usage.byPriority).length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
              </div>
            </div>
          </div>
        )}

        {/* Cases table */}
        <div className="card">
          <div className="load-bar">
            <h2 style={{ marginBottom: 0 }}>Support Cases</h2>
            <button className="btn secondary" onClick={loadCases} disabled={loading || !authOk}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {lastRefresh && <span className="refresh-info">Last updated: {lastRefresh}</span>}
          </div>
          {loadError && <p className="error-msg">{loadError}</p>}
          {!authOk && !loadError && <p className="empty">Sign in to load support cases.</p>}
          {authOk && !loading && cases.length === 0 && !loadError && (
            <p className="empty">No support cases found for this tenant.</p>
          )}
          {cases.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Issue</th>
                    <th>Created</th>
                    <th>Case ID</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(c => {
                    const color = PRIORITY_COLOR[c.priority] || '#6b7280';
                    const ts = c.createdAt ? new Date(c.createdAt).toLocaleString() : '—';
                    return (
                      <tr key={c.caseId}>
                        <td>
                          <span className="pri-tag" style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
                            {c.priority || '?'}
                          </span>
                        </td>
                        <td>
                          <div>{c.customer?.name || <span style={{ color: 'var(--muted)' }}>Unknown</span>}</div>
                          {c.customer?.email && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.customer.email}</div>}
                        </td>
                        <td>{c.product || '—'}</td>
                        <td className="issue-cell">{c.issue ? c.issue.slice(0, 120) + (c.issue.length > 120 ? '…' : '') : '—'}</td>
                        <td className="time-cell">{ts}</td>
                        <td className="case-id">{c.caseId?.slice(0, 8)}…</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Onboarding checklist */}
        <div className="card">
          <h2>Onboarding Progress</h2>
          <div className="checklist">
            {CHECKLIST.map(item => (
              <div className="check-item" key={item.id}>
                <div className={`check-icon ${item.done ? 'check-done' : 'check-open'}`}>
                  {item.done ? '✓' : '○'}
                </div>
                <span style={{ color: item.done ? 'var(--text)' : 'var(--muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
