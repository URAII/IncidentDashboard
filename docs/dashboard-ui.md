# Dashboard UI

## Runtime

The lightweight UI is served by:

- `src/ui-server.js`
- `ui/index.html`
- `ui/app.js`
- `ui/app-core.mjs`
- `ui/styles.css`

Start it with:

```bash
node src/ui-server.js
```

Default address:

```text
http://127.0.0.1:4173
```

## Data Source Rule

The UI fetches `/api/dashboard` and renders only the returned sanitized dashboard payload.

It does not read raw fixtures directly in the browser and does not expose any non-sanitized route.

## Views

- Executive
- SOC Operations
- Agency Follow-up

## Filters

- organization
- region
- province
- agency type
- incident type
- severity
- status
- workflow stage
- SLA status
- date range
- image presence

## Safety Controls

- URL-like values are sanitized again in the browser before display
- UI rendering uses sanitized payload fields only
- Missing optional fields use readable fallback text
- No image binaries are loaded or embedded from external evidence URLs
