# Aeon WhatsAPP API

Aeon WhatsAPP API is a hosted WhatsApp automation platform for teams that need reliable session management, message delivery, webhooks, and an operations dashboard without managing the underlying service themselves.

The documentation is written for Aeon customers, implementation teams, and platform operators. It keeps the hosted platform as the primary setup path, with self-managed deployment notes included only for approved Aeon-managed environments.

## Start Here

| Need | Document |
| --- | --- |
| Complete product and setup guide | [Documentation](./docs/README.md) |
| Hosted platform onboarding | [Hosted setup](./docs/README.md#hosted-platform-setup) |
| Docker and local operator setup | [Self-managed setup](./docs/README.md#self-managed-setup) |
| API examples | [API usage](./docs/README.md#api-usage) |
| Webhooks | [Webhook setup](./docs/README.md#webhooks) |
| Troubleshooting | [Troubleshooting](./docs/README.md#troubleshooting) |

## Platform URLs

Use the URLs assigned in your Aeon workspace.

| Surface | Path |
| --- | --- |
| Dashboard | `https://your-aeon-dashboard.example.com` |
| API base | `https://your-aeon-api.example.com/api` |
| Interactive API docs | `https://your-aeon-api.example.com/api/docs` |
| Health check | `https://your-aeon-api.example.com/api/health` |

## First API Request

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"sales-main"}'
```

Next, start the session, open the QR code from the dashboard or API, scan it with WhatsApp, and send a test message.

```bash
curl -X POST https://your-aeon-api.example.com/api/sessions/{sessionId}/messages/send-text \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"94771234567@c.us","text":"Hello from Aeon WhatsAPP API"}'
```

## Core Capabilities

| Area | Included |
| --- | --- |
| Sessions | Create, start, stop, reconnect, QR authentication, multi-session operation |
| Messaging | Text, image, video, audio, document, location, contact, sticker, reply, forward, reaction, bulk send |
| Events | Webhooks, retry settings, idempotency fields, delivery metadata |
| Dashboard | Sessions, webhooks, API keys, users, logs, infrastructure status |
| Security | API keys, bearer dashboard tokens, roles, session scoping, IP allowlists |
| Infrastructure | SQLite, PostgreSQL, Redis queues, local storage, S3-compatible media storage, Docker deployment profiles |

## Brand And Distribution Notes

This product is distributed through the Aeon hosted platform and approved Aeon deployment packages. Public documentation should refer to the product as `Aeon WhatsAPP API`.
