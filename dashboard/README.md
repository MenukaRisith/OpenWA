# Aeon WhatsAPP API Dashboard

The dashboard is the operations surface for Aeon WhatsAPP API. Use it to manage sessions, scan QR codes, create API keys, configure webhooks, review logs, and inspect infrastructure status.

## Local Development

```bash
cd dashboard
npm install
npm run dev
```

The local dashboard expects the API under `/api`. In the full development workflow, start both services from the project root:

```bash
npm run dev
```

Local URLs:

| Service | URL |
| --- | --- |
| Dashboard | `http://localhost:2886` |
| API | `http://localhost:2785/api` |
| API docs | `http://localhost:2785/api/docs` |

## Build

```bash
npm run build
```

## Documentation

Use the consolidated product documentation at [../docs/README.md](../docs/README.md).
