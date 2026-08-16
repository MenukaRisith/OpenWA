# Aeon WhatsAPP API SDK Notes

This folder contains internal client-library scaffolds for Aeon WhatsAPP API. Hosted platform integrations can call the REST API directly with `X-API-Key`; generated SDK packages may be supplied separately for approved customer or operator environments.

## JavaScript Example

```typescript
const response = await fetch('https://your-aeon-api.example.com/api/sessions', {
  method: 'GET',
  headers: {
    'X-API-Key': process.env.AEON_API_KEY!,
  },
});

const sessions = await response.json();
```

## Python Example

```python
import os
import requests

response = requests.get(
    "https://your-aeon-api.example.com/api/sessions",
    headers={"X-API-Key": os.environ["AEON_API_KEY"]},
    timeout=30,
)

sessions = response.json()
```

## Documentation

Use the consolidated product documentation at [../docs/README.md](../docs/README.md).
