import {
  BookOpen,
  CheckCircle2,
  Database,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  RadioTower,
  ServerCog,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Webhook,
} from 'lucide-react';
import './PublicDocs.css';

interface PublicDocsProps {
  isAuthenticated: boolean;
}

const navItems = [
  ['overview', 'Overview'],
  ['hosted', 'Hosted setup'],
  ['self-managed', 'Self-managed setup'],
  ['sessions', 'Sessions'],
  ['api', 'API usage'],
  ['messaging', 'Messaging'],
  ['webhooks', 'Webhooks'],
  ['environment', 'Environment'],
  ['security', 'Security'],
  ['troubleshooting', 'Troubleshooting'],
] as const;

const setupOptions = [
  {
    title: 'Hosted workspace',
    description: 'Use the Aeon dashboard and API URLs assigned to your workspace. No local setup required.',
    command: 'Dashboard: https://your-aeon-dashboard.example.com\nAPI:       https://your-aeon-api.example.com/api',
  },
  {
    title: 'Development Docker stack',
    description: 'Run the API and dashboard together for internal testing.',
    command: 'docker compose -f docker-compose.dev.yml up -d --build',
  },
  {
    title: 'Minimal Docker API',
    description: 'Run the API with SQLite and local media storage.',
    command: 'cp .env.example .env\ndocker compose up -d --build',
  },
  {
    title: 'Docker with dashboard',
    description: 'Run the dashboard alongside the API.',
    command: 'docker compose --profile with-dashboard up -d --build',
  },
  {
    title: 'Docker with PostgreSQL',
    description: 'Use PostgreSQL for production-oriented deployments.',
    command:
      'DATABASE_TYPE=postgres\nDATABASE_HOST=postgres\nDATABASE_NAME=aeon_whatsapp\ndocker compose --profile postgres up -d --build',
  },
  {
    title: 'Full managed stack',
    description: 'Run proxy, dashboard, PostgreSQL, Redis queue, and S3-compatible media storage.',
    command: 'docker compose --profile full up -d --build',
  },
  {
    title: 'Local Node.js',
    description: 'Run the API and dashboard directly for implementation work.',
    command: 'npm install\ncp .env.minimal .env\nnpm run dev',
  },
];

const endpointGroups = [
  ['Sessions', 'GET/POST /sessions, POST /sessions/{id}/start, GET /sessions/{id}/qr'],
  ['Messages', 'POST /sessions/{sessionId}/messages/send-text, send-image, send-document, send-bulk'],
  ['Webhooks', 'GET/POST /sessions/{sessionId}/webhooks, POST /webhooks/{id}/test'],
  ['Access', 'POST /auth/login, GET/POST /auth/api-keys, GET/POST /auth/users'],
  ['Operations', 'GET /health, GET /stats/overview, GET /audit, GET /infra/status'],
] as const;

const envRows = [
  ['PORT', '2785', 'API runtime port'],
  ['DATABASE_TYPE', 'sqlite', 'sqlite or postgres'],
  ['DATABASE_NAME', './data/aeon.sqlite', 'SQLite path or PostgreSQL database name'],
  ['SESSION_DATA_PATH', './data/sessions', 'Persistent WhatsApp session files'],
  ['STORAGE_TYPE', 'local', 'local or s3'],
  ['REDIS_ENABLED', 'false', 'Enable Redis integration'],
  ['QUEUE_ENABLED', 'false', 'Enable queued webhook delivery'],
  ['AEON_ADMIN_USERNAME', 'admin', 'Initial dashboard admin username'],
  ['AEON_ADMIN_PASSWORD', 'generated', 'Initial dashboard admin password'],
] as const;

const webhookEvents = [
  'message.received',
  'message.sent',
  'message.ack',
  'message.revoked',
  'session.status',
  'session.qr',
  'session.authenticated',
  'session.disconnected',
  'group.join',
  'group.leave',
  'group.update',
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="docs-code">
      <code>{children}</code>
    </pre>
  );
}

export function PublicDocs({ isAuthenticated }: PublicDocsProps) {
  const consoleHref = isAuthenticated ? '/dashboard' : '/login';

  return (
    <main className="docs-page">
      <header className="docs-topbar">
        <a className="docs-brand" href="/docs" aria-label="Aeon WhatsAPP API documentation">
          <span className="docs-brand__mark">AW</span>
          <span>Aeon WhatsAPP API</span>
        </a>
        <nav className="docs-topbar__links" aria-label="Documentation links">
          <a href="/api/docs">
            <ExternalLink size={16} />
            <span>Swagger</span>
          </a>
          <a href={consoleHref}>
            <LockKeyhole size={16} />
            <span>{isAuthenticated ? 'Console' : 'Sign in'}</span>
          </a>
        </nav>
      </header>

      <div className="docs-shell">
        <aside className="docs-sidebar" aria-label="Documentation sections">
          <span className="docs-sidebar__label">Documentation</span>
          {navItems.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </aside>

        <article className="docs-content">
          <section className="docs-hero" id="overview">
            <div className="docs-hero__copy">
              <span className="docs-eyebrow">Public documentation</span>
              <h1 className="aeon-display">Aeon WhatsAPP API setup and integration guide.</h1>
              <p>
                Use this page to connect a hosted Aeon workspace, create WhatsApp sessions, send messages, configure
                webhooks, and operate approved self-managed deployments.
              </p>
              <div className="docs-hero__actions">
                <a className="docs-btn docs-btn--primary" href="#hosted">
                  Start setup
                </a>
                <a className="docs-btn docs-btn--secondary" href="/api/docs">
                  API reference
                </a>
              </div>
            </div>
            <div className="docs-hero__visual" aria-label="Aeon dashboard preview">
              <img src="/marketing/aeon-hero-dashboard.png" alt="Aeon WhatsAPP API dashboard preview" />
            </div>
          </section>

          <section className="docs-section">
            <div className="docs-callout">
              <BookOpen size={20} />
              <p>
                Aeon WhatsAPP API is provided through hosted workspaces and approved Aeon deployment packages. This
                documentation intentionally avoids source repository setup paths.
              </p>
            </div>
          </section>

          <section className="docs-section" id="hosted">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Hosted setup</span>
              <h2 className="aeon-display">Start from your Aeon workspace.</h2>
            </div>
            <ol className="docs-steps">
              <li>
                <strong>Open the dashboard.</strong>
                Use the dashboard URL assigned to your workspace.
              </li>
              <li>
                <strong>Create a session.</strong>
                Name it by use case, for example <code>support-main</code> or <code>sales-lk</code>.
              </li>
              <li>
                <strong>Scan the QR code.</strong>
                Start the session and scan the QR from WhatsApp Linked Devices.
              </li>
              <li>
                <strong>Create an API key.</strong>
                Use the minimum required role and restrict the key to sessions or IP ranges when possible.
              </li>
              <li>
                <strong>Send a test request.</strong>
                Verify the session is <code>ready</code>, then send a test message.
              </li>
            </ol>
          </section>

          <section className="docs-section" id="self-managed">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Self-managed setup</span>
              <h2 className="aeon-display">All supported setup paths.</h2>
              <p>Use these paths only with an approved Aeon deployment package.</p>
            </div>
            <div className="docs-setup-grid">
              {setupOptions.map(option => (
                <article className="docs-setup-card" key={option.title}>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                  <CodeBlock>{option.command}</CodeBlock>
                </article>
              ))}
            </div>
          </section>

          <section className="docs-section" id="sessions">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Sessions</span>
              <h2 className="aeon-display">Connect a WhatsApp account.</h2>
            </div>
            <div className="docs-two-col">
              <div>
                <h3>Create and start</h3>
                <CodeBlock>{`curl -X POST https://your-aeon-api.example.com/api/sessions \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"support-main"}'

curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/start \\
  -H "X-API-Key: YOUR_API_KEY"`}</CodeBlock>
              </div>
              <div>
                <h3>Get QR code</h3>
                <CodeBlock>{`curl https://your-aeon-api.example.com/api/sessions/{sessionId}/qr \\
  -H "X-API-Key: YOUR_API_KEY"`}</CodeBlock>
                <p className="docs-note">
                  The session can send messages when the status changes to <code>ready</code>.
                </p>
              </div>
            </div>
          </section>

          <section className="docs-section" id="api">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">API usage</span>
              <h2 className="aeon-display">Authenticate every request.</h2>
            </div>
            <CodeBlock>{`X-API-Key: YOUR_API_KEY

Authorization: Bearer YOUR_DASHBOARD_TOKEN`}</CodeBlock>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>Endpoints</th>
                  </tr>
                </thead>
                <tbody>
                  {endpointGroups.map(([area, endpoints]) => (
                    <tr key={area}>
                      <td>{area}</td>
                      <td>{endpoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="docs-section" id="messaging">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Messaging</span>
              <h2 className="aeon-display">Send text and media.</h2>
            </div>
            <div className="docs-feature-list">
              <span>
                <MessageSquareText size={18} /> Text, image, video, audio, document, location, contact, sticker
              </span>
              <span>
                <Smartphone size={18} /> Individual chat IDs use <code>94771234567@c.us</code>
              </span>
              <span>
                <CheckCircle2 size={18} /> Group chat IDs use <code>{'{groupId}'}@g.us</code>
              </span>
            </div>
            <CodeBlock>{`curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-text \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "chatId": "94771234567@c.us",
    "text": "Hello from Aeon WhatsAPP API"
  }'`}</CodeBlock>
          </section>

          <section className="docs-section" id="webhooks">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Webhooks</span>
              <h2 className="aeon-display">Receive events from Aeon.</h2>
            </div>
            <CodeBlock>{`curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/webhooks \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-system.example.com/webhooks/aeon",
    "events": ["message.received", "session.status"],
    "secret": "change-this-secret",
    "retryCount": 3
  }'`}</CodeBlock>
            <div className="docs-chip-grid">
              {webhookEvents.map(event => (
                <span key={event}>{event}</span>
              ))}
            </div>
            <div className="docs-header-list">
              <h3>Delivery headers</h3>
              <p>
                <code>X-Aeon-Event</code>, <code>X-Aeon-Idempotency-Key</code>, <code>X-Aeon-Delivery-Id</code>,{' '}
                <code>X-Aeon-Retry-Count</code>, and <code>X-Aeon-Signature</code>.
              </p>
            </div>
          </section>

          <section className="docs-section" id="environment">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Environment</span>
              <h2 className="aeon-display">Runtime configuration.</h2>
              <p>Configuration precedence is process environment, then project <code>.env</code>, then <code>data/.env.generated</code>.</p>
            </div>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Default</th>
                    <th>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {envRows.map(([name, value, purpose]) => (
                    <tr key={name}>
                      <td>
                        <code>{name}</code>
                      </td>
                      <td>{value}</td>
                      <td>{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="docs-section" id="security">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Security</span>
              <h2 className="aeon-display">Use scoped access by default.</h2>
            </div>
            <div className="docs-card-grid docs-card-grid--three">
              <article>
                <KeyRound size={20} />
                <h3>API keys</h3>
                <p>Use separate keys per integration, environment, role, session, and caller network.</p>
              </article>
              <article>
                <ShieldCheck size={20} />
                <h3>Dashboard users</h3>
                <p>Use named users with viewer, operator, or admin roles. Avoid shared admin accounts.</p>
              </article>
              <article>
                <Webhook size={20} />
                <h3>Webhook signatures</h3>
                <p>Verify HMAC SHA-256 signatures using the raw request body and your webhook secret.</p>
              </article>
            </div>
          </section>

          <section className="docs-section" id="troubleshooting">
            <div className="docs-section__heading">
              <span className="docs-eyebrow">Troubleshooting</span>
              <h2 className="aeon-display">Common checks.</h2>
            </div>
            <div className="docs-card-grid">
              <article>
                <TerminalSquare size={20} />
                <h3>401 response</h3>
                <p>Check the API key, expiry, role, IP allowlist, and session scope.</p>
              </article>
              <article>
                <RadioTower size={20} />
                <h3>Webhook failure</h3>
                <p>Confirm endpoint reachability, TLS, timeout, 2xx response, and raw-body signature validation.</p>
              </article>
              <article>
                <Database size={20} />
                <h3>Service unhealthy</h3>
                <p>Check database, Redis, storage, container logs, and <code>/api/health/ready</code>.</p>
              </article>
              <article>
                <ServerCog size={20} />
                <h3>Session disconnected</h3>
                <p>Check host resources, persistent session storage, account state, and network quality.</p>
              </article>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
