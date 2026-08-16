# Aeon WhatsAPP API Documentation

Aeon WhatsAPP API provides hosted WhatsApp session automation with a REST API, dashboard, webhooks, and deployment options for approved Aeon-managed environments.

The default customer path is the hosted Aeon platform. Docker and Node.js setup paths are included for Aeon operators, implementation teams, and managed private deployments.

## Documentation Map

| Section | Use it for |
| --- | --- |
| [Product Model](#product-model) | Understand the platform surfaces and core workflow |
| [Hosted Platform Setup](#hosted-platform-setup) | Start from an Aeon-hosted workspace |
| [Self-Managed Setup](#self-managed-setup) | Run an approved Aeon deployment package |
| [Environment Reference](#environment-reference) | Configure database, storage, queue, security, and runtime settings |
| [Session Setup](#session-setup) | Connect WhatsApp accounts and manage lifecycle |
| [API Usage](#api-usage) | Authenticate and call the REST API |
| [Messaging](#messaging) | Send text, media, reactions, replies, and bulk messages |
| [Webhooks](#webhooks) | Receive delivery, session, and message events |
| [Dashboard](#dashboard) | Operate sessions, users, keys, logs, and infrastructure |
| [Security](#security) | Use roles, API keys, IP allowlists, and webhook signatures |
| [Operations](#operations) | Back up, update, monitor, and troubleshoot deployments |

## Product Model

Aeon WhatsAPP API has three main surfaces.

| Surface | Purpose |
| --- | --- |
| Dashboard | Manage sessions, scan QR codes, create API keys, configure webhooks, inspect logs, and review infrastructure state |
| REST API | Create sessions, send messages, manage contacts, groups, labels, channels, status, webhooks, and users |
| Webhooks | Deliver real-time message and session events to customer systems |

The standard integration flow is:

1. Create or open an Aeon workspace.
2. Create a WhatsApp session.
3. Start the session and scan the QR code.
4. Create an API key scoped to the required role and sessions.
5. Send test messages through the API.
6. Configure webhooks for inbound messages and session status changes.
7. Monitor delivery, logs, and health from the dashboard.

## Hosted Platform Setup

Use this path for customer workspaces hosted by Aeon.

### 1. Open The Workspace

Use the workspace URL supplied by Aeon.

| Item | Example |
| --- | --- |
| Dashboard | `https://your-aeon-dashboard.example.com` |
| API base URL | `https://your-aeon-api.example.com/api` |
| API docs | `https://your-aeon-api.example.com/api/docs` |

Sign in with the admin user created for the workspace. For team access, create individual dashboard users instead of sharing one admin login.

### 2. Create A Session

In the dashboard:

1. Open `Sessions`.
2. Select `Create session`.
3. Use a clear name such as `support-main`, `sales-lk`, or `alerts-prod`.
4. Start the session.
5. Scan the QR code with the WhatsApp account that should own the session.

The session is ready when its status becomes `ready`.

### 3. Create An API Key

In the dashboard:

1. Open `API Keys`.
2. Create a key with the minimum role required.
3. Restrict it to specific sessions when possible.
4. Add IP allowlists for server-to-server integrations when the caller has stable outbound IPs.
5. Store the raw key immediately. It is shown only when created.

Use the key in the `X-API-Key` header.

```bash
curl https://your-aeon-api.example.com/api/sessions \
  -H "X-API-Key: YOUR_API_KEY"
```

### 4. Send A Test Message

WhatsApp chat IDs use this format:

| Target | Format |
| --- | --- |
| Individual phone number | `94771234567@c.us` |
| Group | `{groupId}@g.us` |

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-text \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"94771234567@c.us","text":"Hello from Aeon WhatsAPP API"}'
```

### 5. Configure Webhooks

Create a webhook for each integration endpoint that should receive events.

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/webhooks \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-system.example.com/webhooks/aeon",
    "events": ["message.received", "session.status"],
    "secret": "change-this-secret",
    "retryCount": 3
  }'
```

## Self-Managed Setup

Use these setup paths only for approved Aeon deployment packages. Customers on the hosted platform do not need these steps.

### Requirements

| Component | Minimum |
| --- | --- |
| Node.js | 20 LTS or newer |
| npm | Bundled with Node.js |
| Docker | Current stable version |
| Docker Compose | Compose v2 |
| Memory | 2 GB minimum, more for multiple active sessions |
| Storage | Persistent disk for sessions, database, media, and generated credentials |

Chromium is used by the WhatsApp engine. Linux containers should include the sandbox and shared-memory flags already present in the provided Docker configuration.

### Setup Option A: Hosted Platform

No local setup is required. Use the dashboard and API URLs assigned to the workspace.

This is the recommended setup for customers.

### Setup Option B: Development Docker Stack

Use the development compose file when testing the API and dashboard together on one machine.

```bash
cd aeon-whatsapp-api
docker compose -f docker-compose.dev.yml up -d --build
```

Local URLs:

| Service | URL |
| --- | --- |
| Dashboard | `http://localhost:2886` |
| API | `http://localhost:2785/api` |
| API docs | `http://localhost:2785/api/docs` |
| Health | `http://localhost:2785/api/health` |

Stop the stack:

```bash
docker compose -f docker-compose.dev.yml down
```

### Setup Option C: Minimal Docker API

Use the main compose file without profiles to run the API with SQLite and local storage.

```bash
cd aeon-whatsapp-api
cp .env.example .env
docker compose up -d --build
```

This starts the API on `http://localhost:2785/api`.

### Setup Option D: Docker With Dashboard

```bash
docker compose --profile with-dashboard up -d --build
```

Use this when operators need the web dashboard without the full production service set.

### Setup Option E: Docker With PostgreSQL

Use PostgreSQL for higher-volume deployments and better operational tooling.

```bash
docker compose --profile postgres up -d --build
```

Set these values in `.env` before starting:

```bash
DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USERNAME=aeon
DATABASE_PASSWORD=change-this-password
DATABASE_NAME=aeon_whatsapp
DATABASE_SYNCHRONIZE=false
```

### Setup Option F: Docker With Redis Queue

Use Redis when webhook retries and background processing should be queued.

```bash
docker compose --profile redis up -d --build
```

Recommended `.env` values:

```bash
REDIS_ENABLED=true
QUEUE_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
```

### Setup Option G: Docker With S3-Compatible Storage

Use S3-compatible storage for media files when local disk is not the desired retention layer.

```bash
docker compose --profile minio up -d --build
```

Recommended `.env` values:

```bash
STORAGE_TYPE=s3
S3_ENDPOINT=http://minio:9000
S3_BUCKET=aeon-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=change-this-access-key
S3_SECRET_ACCESS_KEY=change-this-secret-key
```

### Setup Option H: Full Docker Stack

Use the full profile for an operator-managed stack with dashboard, proxy, database, queue, and S3-compatible storage.

```bash
docker compose --profile full up -d --build
```

For production, set strong passwords, a real domain, CORS origins, TLS settings, and persistent backups before exposing the service.

### Setup Option I: Local Node.js Development

Use this when working directly with the application runtime.

```bash
cd aeon-whatsapp-api
npm install
cp .env.minimal .env
mkdir data
mkdir data\sessions
mkdir data\media
npm run dev
```

On Linux or macOS:

```bash
mkdir -p data/sessions data/media
```

Local URLs:

| Service | URL |
| --- | --- |
| Dashboard | `http://localhost:2886` |
| API | `http://localhost:2785/api` |
| API docs | `http://localhost:2785/api/docs` |

### Setup Option J: API And Dashboard Separately

Start the API:

```bash
npm run start:dev
```

Start the dashboard:

```bash
cd dashboard
npm install
npm run dev
```

Use this path when debugging the frontend and backend independently.

## Environment Reference

Runtime configuration is loaded in this order:

1. Process environment variables.
2. Project `.env`.
3. `data/.env.generated`, created on first run and editable through the dashboard infrastructure screen.

Process environment variables take precedence over file-based configuration.

### Core Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `production` | Runtime mode |
| `PORT` | `2785` | API port used by the application |
| `API_PORT` | `2785` | Compose-level API port mapping |
| `DASHBOARD_PORT` | `2886` | Compose-level dashboard port mapping |
| `LOG_LEVEL` | `info` | Log verbosity |
| `BASE_URL` | local URL | Public API URL shown in startup output |
| `DASHBOARD_URL` | local URL | Public dashboard URL shown in startup output |
| `CORS_ORIGINS` | `*` | Comma-separated allowed browser origins |

### Database

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_TYPE` | `sqlite` | `sqlite` or `postgres` |
| `DATABASE_NAME` | `./data/aeon.sqlite` | SQLite path or PostgreSQL database name |
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `DATABASE_USERNAME` | empty | PostgreSQL user |
| `DATABASE_PASSWORD` | empty | PostgreSQL password |
| `DATABASE_SYNCHRONIZE` | `false` | Auto-sync schema; keep false in production |
| `DATABASE_LOGGING` | `false` | SQL logging |
| `DATABASE_POOL_SIZE` | `10` | PostgreSQL pool size |
| `DATABASE_SSL` | `false` | Enable database SSL |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `true` | Validate database SSL certificate |

### Engine

| Variable | Default | Purpose |
| --- | --- | --- |
| `ENGINE_TYPE` | `whatsapp-web.js` | WhatsApp engine adapter |
| `SESSION_DATA_PATH` | `./data/sessions` | Persistent session files |
| `PUPPETEER_HEADLESS` | `true` | Run browser without visible UI |
| `PUPPETEER_ARGS` | sandbox-safe defaults | Chromium launch flags |

### Storage

| Variable | Default | Purpose |
| --- | --- | --- |
| `STORAGE_TYPE` | `local` | `local` or `s3` |
| `STORAGE_LOCAL_PATH` | `./data/media` | Local media path |
| `S3_ENDPOINT` | empty | S3-compatible endpoint |
| `S3_BUCKET` | empty | Media bucket |
| `S3_REGION` | empty | Bucket region |
| `S3_ACCESS_KEY_ID` | empty | S3 access key |
| `S3_SECRET_ACCESS_KEY` | empty | S3 secret |

### Queue And Cache

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDIS_ENABLED` | `false` | Enable Redis integration |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | empty | Redis password |
| `QUEUE_ENABLED` | `false` | Enable queued webhook delivery |
| `CACHE_ENABLED` | `false` | Enable cache integration |

### Webhooks And Limits

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEBHOOK_TIMEOUT` | `10000` | Delivery timeout in milliseconds |
| `WEBHOOK_MAX_RETRIES` | `3` | Default retry count |
| `WEBHOOK_RETRY_DELAY` | `5000` | Retry delay in milliseconds |
| `RATE_LIMIT_SHORT_TTL` | `1000` | Short rate-limit window in milliseconds |
| `RATE_LIMIT_SHORT_LIMIT` | `10` | Requests allowed in short window |
| `RATE_LIMIT_MEDIUM_TTL` | `60000` | Medium rate-limit window |
| `RATE_LIMIT_MEDIUM_LIMIT` | `100` | Requests allowed in medium window |
| `RATE_LIMIT_LONG_TTL` | `3600000` | Long rate-limit window |
| `RATE_LIMIT_LONG_LIMIT` | `1000` | Requests allowed in long window |

### Security

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_MASTER_KEY` | empty | Optional master API key |
| `AEON_ADMIN_USERNAME` | `admin` | Initial dashboard admin username |
| `AEON_ADMIN_PASSWORD` | generated in production, `admin12345` in development | Initial dashboard admin password |
| `ENABLE_SWAGGER` | `true` | Expose API docs at `/api/docs` |

## First-Run Credentials

For self-managed deployments, the first startup creates default credentials when none exist.

| Credential | Where to find it |
| --- | --- |
| API key | Startup logs and `data/.api-key` |
| Dashboard admin | Startup logs and `data/.admin-password` |

Rotate these credentials before production use. Create named users and named API keys for real integrations.

## Session Setup

### Session States

| State | Meaning |
| --- | --- |
| `created` | Session record exists but has not started |
| `initializing` | Browser and engine are starting |
| `qr_ready` | QR code is available for scanning |
| `ready` | WhatsApp is connected and can send/receive |
| `disconnected` | Session is not connected |
| `idle` | Session exists but is not actively connected |

### Create And Start A Session

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"support-main"}'
```

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/start \
  -H "X-API-Key: YOUR_API_KEY"
```

### Get QR Code

```bash
curl https://your-aeon-api.example.com/api/sessions/{sessionId}/qr \
  -H "X-API-Key: YOUR_API_KEY"
```

Use the returned QR data in the dashboard or a trusted internal tool. The QR code expires quickly; request a new one if scanning fails.

### Stop Or Delete A Session

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/stop \
  -H "X-API-Key: YOUR_API_KEY"
```

```bash
curl -X DELETE https://your-aeon-api.example.com/api/sessions/{sessionId} \
  -H "X-API-Key: YOUR_API_KEY"
```

## API Usage

All API routes are prefixed with `/api`.

### Authentication

Use either an API key or a dashboard bearer token.

```http
X-API-Key: YOUR_API_KEY
```

```http
Authorization: Bearer YOUR_TOKEN
```

### Roles

| Role | Typical use |
| --- | --- |
| `viewer` | Read-only dashboards, monitoring, reports |
| `operator` | Session and webhook operations, message sending |
| `admin` | Users, keys, infrastructure, and full platform management |

### Endpoint Overview

| Area | Endpoints |
| --- | --- |
| Health | `GET /health`, `GET /health/live`, `GET /health/ready` |
| Auth | `POST /auth/login`, `POST /auth/validate` |
| Users | `GET/POST /auth/users`, `PUT/DELETE /auth/users/{id}` |
| API keys | `GET/POST /auth/api-keys`, `GET/PUT/DELETE /auth/api-keys/{id}`, `POST /auth/api-keys/{id}/revoke` |
| Sessions | `GET/POST /sessions`, `GET/DELETE /sessions/{id}`, `POST /sessions/{id}/start`, `POST /sessions/{id}/stop`, `GET /sessions/{id}/qr` |
| Messages | `GET /sessions/{sessionId}/messages`, `POST /sessions/{sessionId}/messages/send-text`, media, reply, forward, react, delete, bulk |
| Webhooks | `GET /webhooks`, `GET/POST /sessions/{sessionId}/webhooks`, `PUT/DELETE /sessions/{sessionId}/webhooks/{id}`, `POST /sessions/{sessionId}/webhooks/{id}/test` |
| Contacts | `GET /sessions/{sessionId}/contacts`, lookup, profile picture, block, unblock |
| Groups | List, create, participants, promote, demote, subject, description, leave, invite code |
| Labels | List labels, inspect label, assign and remove labels from chats |
| Channels | List, inspect, subscribe, delete, read messages |
| Status | List, send text/image/video status, delete status |
| Catalog | Read catalog/products, send product or catalog messages |
| Stats | Overview, messages, session-level stats |
| Audit | Query audit logs |
| Infrastructure | Status, engines, config, restart, import/export, storage import/export |
| Plugins | List, inspect, enable, disable, configure, health check |

## Messaging

### Send Text

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-text \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "94771234567@c.us",
    "text": "Your order is ready."
  }'
```

### Send Image

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-image \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "94771234567@c.us",
    "url": "https://example.com/invoice.jpg",
    "caption": "Invoice attached."
  }'
```

### Send Document

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-document \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "94771234567@c.us",
    "url": "https://example.com/invoice.pdf",
    "filename": "invoice.pdf"
  }'
```

### Send Bulk Messages

Use bulk sending for controlled batches. Keep recipient lists clean, avoid unsolicited messaging, and monitor failure rates.

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-bulk \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "chatId": "94771234567@c.us", "text": "First message" },
      { "chatId": "94770000000@c.us", "text": "Second message" }
    ],
    "delayMs": 1500
  }'
```

### Message Rules

| Rule | Reason |
| --- | --- |
| Send only expected or consent-based messages | Reduces complaints and account risk |
| Use human-readable sender names and session labels | Makes operations easier |
| Keep media URLs reachable by the API service | The engine must fetch files before sending |
| Use delays for large batches | Avoids unnatural traffic spikes |
| Watch session status while sending | Disconnected sessions cannot deliver |

## Webhooks

Webhooks deliver JSON payloads to customer systems.

### Supported Events

| Event | Meaning |
| --- | --- |
| `message.received` | A new inbound message was received |
| `message.sent` | An outbound message was sent |
| `message.ack` | Message acknowledgement changed |
| `message.revoked` | A message was revoked |
| `session.status` | Session state changed |
| `session.qr` | QR code is available |
| `session.authenticated` | Session authenticated successfully |
| `session.disconnected` | Session disconnected |
| `group.join` | Group join event |
| `group.leave` | Group leave event |
| `group.update` | Group metadata or participant state changed |

### Payload Shape

```json
{
  "event": "message.received",
  "timestamp": "2026-05-27T10:30:00.000Z",
  "sessionId": "session-id",
  "idempotencyKey": "event-dedupe-key",
  "deliveryId": "delivery-id",
  "data": {}
}
```

### Delivery Headers

| Header | Purpose |
| --- | --- |
| `X-Aeon-Event` | Event name |
| `X-Aeon-Idempotency-Key` | Stable event key for duplicate protection |
| `X-Aeon-Delivery-Id` | Unique delivery attempt ID |
| `X-Aeon-Retry-Count` | Retry number, starting at `0` |
| `X-Aeon-Signature` | HMAC SHA-256 signature when a secret is configured |

### Signature Verification

When a webhook secret is configured, verify the raw request body.

```javascript
import crypto from 'node:crypto';

function verifyAeonWebhook(rawBody, signatureHeader, secret) {
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}
```

### Retry Behavior

| Setting | Behavior |
| --- | --- |
| `retryCount` | Maximum delivery attempts for a webhook |
| `WEBHOOK_TIMEOUT` | Request timeout before an attempt is treated as failed |
| `WEBHOOK_RETRY_DELAY` | Delay between retries when direct delivery is used |
| `QUEUE_ENABLED=true` | Uses Redis-backed queue retries when configured |

## Dashboard

The dashboard is the primary operations surface.

| Page | Purpose |
| --- | --- |
| Dashboard | Overall health and session counts |
| Sessions | Create, start, stop, authenticate, and delete sessions |
| Message Tester | Send controlled test messages |
| Webhooks | Create, update, test, and disable event deliveries |
| API Keys | Create scoped API keys and revoke access |
| Users | Manage dashboard users and roles |
| Logs | Review audit and platform events |
| Infrastructure | Inspect database, Redis, queue, storage, engine, and restart settings |
| Plugins | Inspect and manage available extensions |

## n8n And Workflow Tools

For hosted Aeon workspaces, use the standard n8n HTTP Request node unless Aeon supplies a dedicated workflow package.

### Send Message From n8n

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-text` |
| Header | `X-API-Key: YOUR_API_KEY` |
| Body type | JSON |

Body:

```json
{
  "chatId": "94771234567@c.us",
  "text": "Message from workflow automation"
}
```

### Receive Messages In n8n

1. Create an n8n webhook trigger.
2. Copy the production webhook URL.
3. Create an Aeon webhook for `message.received`.
4. Add a secret and verify `X-Aeon-Signature` when possible.
5. Use the `idempotencyKey` to prevent duplicate processing.

## Security

### API Keys

Create separate keys for each application, environment, and permission level.

| Practice | Why it matters |
| --- | --- |
| One key per integration | Enables clean revocation and audit trails |
| Session scoping | Limits blast radius if a key is exposed |
| IP allowlists | Blocks unexpected callers |
| Expiry dates for temporary work | Prevents forgotten access |
| Immediate rotation after exposure | Stops continued unauthorized use |

### Dashboard Users

Use named users for staff. Avoid shared admin accounts after first setup.

| Role | Use |
| --- | --- |
| `viewer` | Monitoring and read-only checks |
| `operator` | Day-to-day session and webhook operations |
| `admin` | User, key, and infrastructure management |

### Network Controls

For production deployments:

1. Put the API behind HTTPS.
2. Restrict dashboard access to trusted networks where possible.
3. Set `CORS_ORIGINS` to known web origins.
4. Keep API keys out of frontend browser code unless the environment is explicitly designed for it.
5. Use a server-side integration layer for customer applications.

### Compliance Note

Aeon WhatsAPP API automates WhatsApp Web sessions. It is not the official Meta WhatsApp Business Cloud API. Customers are responsible for consent, message content, regional requirements, and WhatsApp policy compliance.

## Operations

### Health Checks

```bash
curl https://your-aeon-api.example.com/api/health
curl https://your-aeon-api.example.com/api/health/ready
```

For Docker:

```bash
docker compose ps
docker compose logs -f aeon-api
```

### Backups

Back up these paths or services:

| Data | Location |
| --- | --- |
| Main database | `data/main.sqlite` or PostgreSQL |
| Application data database | `data/aeon.sqlite` or PostgreSQL |
| Session files | `data/sessions` |
| Media files | `data/media` or S3 bucket |
| Generated credentials | `data/.api-key`, `data/.admin-password` |
| Generated configuration | `data/.env.generated` |

For SQLite deployments, stop the service or use a safe database backup command before copying database files.

### Updates

For self-managed deployments:

1. Back up databases, sessions, media, and configuration.
2. Review the Aeon release notes supplied with the deployment package.
3. Apply environment changes.
4. Rebuild or pull the approved image/package.
5. Run database migrations when instructed.
6. Start the service.
7. Check `/api/health/ready`.
8. Start one low-risk session and send a test message.

### Monitoring

Track these signals:

| Signal | Action |
| --- | --- |
| API health failing | Check database, Redis, storage, and container logs |
| High memory | Reduce active sessions per host or increase resources |
| Repeated QR refreshes | Re-authenticate the session and inspect WhatsApp account state |
| Webhook failures | Check endpoint reachability, TLS, timeout, and signature validation |
| Message failures | Confirm session status, chat ID format, media URL access, and account limits |

## Troubleshooting

### Dashboard Cannot Log In

Check:

1. The admin credentials in `data/.admin-password` for first-run deployments.
2. That the dashboard can reach `/api/auth/login`.
3. Browser console and API logs for CORS or network errors.
4. Whether the user is active and has the expected role.

### API Returns 401

Check:

1. `X-API-Key` is present and exact.
2. The key has not expired or been revoked.
3. IP allowlist includes the caller.
4. Session scoping includes the session in the request.
5. Bearer tokens are prefixed with `Bearer ` when used.

### QR Code Is Not Ready

Check:

1. Start the session first.
2. Wait until status becomes `qr_ready`.
3. Request a fresh QR code if the old one expired.
4. Inspect engine logs if the session remains in `initializing`.

### Session Disconnects Often

Check:

1. Server memory and CPU.
2. Persistent session volume is mounted correctly.
3. The WhatsApp account is not logged out from the phone.
4. Network quality between the host and WhatsApp Web.
5. Whether too many sessions are running on one host.

### Messages Do Not Send

Check:

1. Session status is `ready`.
2. Chat ID format is correct.
3. Media URLs are reachable from the API service.
4. API key role is `operator` or `admin`.
5. Rate limits or account restrictions are not being hit.

### Webhooks Are Not Received

Check:

1. Webhook is active.
2. Event list includes the event being tested.
3. Endpoint is publicly reachable from the API host.
4. Endpoint responds with a 2xx status before timeout.
5. Signature verification uses the raw body, not parsed JSON.
6. Queue and Redis are healthy when queued delivery is enabled.

## Glossary

| Term | Meaning |
| --- | --- |
| Session | A connected WhatsApp Web identity managed by Aeon |
| API key | Server-to-server credential sent with `X-API-Key` |
| Dashboard token | Bearer token issued after dashboard login |
| Chat ID | WhatsApp destination identifier such as `94771234567@c.us` |
| Webhook | Customer endpoint that receives Aeon event deliveries |
| Idempotency key | Stable key used to deduplicate repeated webhook processing |
| Delivery ID | Unique ID for a webhook delivery attempt |
| Operator | Role that can manage sessions and send messages |
| Admin | Role that can manage users, keys, and infrastructure |

## Support Handoff Checklist

When escalating a customer issue, include:

1. Workspace or deployment identifier.
2. Session ID and current status.
3. Approximate time range with timezone.
4. API endpoint or dashboard page involved.
5. Request ID, webhook delivery ID, or audit log entry when available.
6. Sanitized request body and response.
7. Relevant health check and infrastructure status.

Do not include raw API keys, dashboard passwords, webhook secrets, or QR codes in support notes.
