<!-- Source: epicmobile18/rules/contextual/docs/localxpose-tunnel.md -->
<!-- Version: 1.0.0 -->
<!-- Last Updated: 2026-04-13 -->

# Localxpose (loclx) HTTPS Tunnel Guide

Reference for AI agents to expose a local server as a public HTTPS URL.

---

## Installation & Login

```bash
/snap/bin/loclx                    # binary path (snap install)
/snap/bin/loclx account status    # verify login status
```

Always logged in. Use `/snap/bin/loclx` if `loclx` or `localxpose` is not in PATH.

---

## Tunnel Commands

```bash
# Temporary subdomain (random URL each run)
/snap/bin/loclx tunnel http -t <port> -s <subdomain>

# Reserved domain (fixed URL — domain reserved on PRO account)
/snap/bin/loclx tunnel http -t <port> -S <full-domain.loclx.io>

# With region (ap = Asia Pacific)
/snap/bin/loclx tunnel http -t <port> -S <full-domain> -g ap
```

### Options

| Flag | Description |
|------|-------------|
| `-t <port>` | Local port (e.g. `3000`, `1337`) |
| `-s <subdomain>` | Temporary subdomain (non-reserved) |
| `-S <domain>` | Full reserved domain (e.g. `foo.loclx.io`) |
| `-g <region>` | Region: `us`, `ap`, `eu` |

> **Note**: Using a reserved subdomain with `-s` (temp flag) causes an error.
> Reserved domains must use `-S`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `reserved subdomain, use -S` | Reserved domain used with `-s` flag | Use `-S` flag instead |
| `EADDRINUSE` | Previous process occupying port | `kill $(lsof -ti :<port>)` |
| Tunnel disconnects | Network instability | Restart tunnel, consider `-g` region flag |
