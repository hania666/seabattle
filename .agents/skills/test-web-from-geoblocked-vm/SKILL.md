# Testing the SeaBattle web app from a geo-blocked Devin VM

Devin VMs in US/WA hit the geo-block at `seabattle.xyz` (PROHIBITED_US_STATES in `apps/web/src/lib/geo.ts`). Same applies to local Vite dev — the geo lookup is client-side and uses the VM's real IP.

## Bypass for testing only (NEVER in prod code)

The geo result is cached in `sessionStorage["seabattle:geo:v1"]`. Setting it to a non-blocked country before page render skips the GeoBlock screen.

Similarly, `localStorage["seabattle:consent:v1"]` (key from `apps/web/src/lib/legal.ts`) skips the AgeGate. Format must match the `ConsentRecord` shape and the current `CURRENT_CONSENT_VERSION` constant exactly, or `hasConsent()` returns false:

```json
{"version":"2025-04-22","age18":true,"tos":true,"privacy":true,"acceptedAt":1234567890}
```

Bump `version` in the JSON to whatever the current `CURRENT_CONSENT_VERSION` constant is in `apps/web/src/lib/legal.ts`.

## Launching Chromium with CDP

The `google-chrome` binary on the VM is a wrapper that requires an existing Chromium instance on port 29229. Launch the real binary directly:

```bash
rm -f /home/ubuntu/.browser_data_dir/Singleton*  # clear stale locks first
CHROME=/opt/.devin/chrome/chrome/linux-137.0.7118.2/chrome-linux64/chrome
nohup $CHROME \
  --user-data-dir=/home/ubuntu/.browser_data_dir \
  --no-first-run --no-default-browser-check --no-sandbox \
  --remote-debugging-port=29229 \
  --remote-allow-origins='*' \
  --start-maximized \
  http://127.0.0.1:5173/ >/tmp/chrome.log 2>&1 &
disown
```

**Critical:** `--remote-allow-origins='*'` is required, otherwise CDP WebSocket handshakes return 403.

## Local dev server

```bash
cd apps/web
cp .env.example .env.local  # Vite picks this up automatically
./node_modules/.bin/vite --port 5173 --host 127.0.0.1 &
```

The homepage is pure client-side React i18n; no backend required for language-switcher tests.

## CDP Runtime.evaluate recipe

When UI clicks miss (e.g. dropdown options at narrow rows), dispatch via CDP for determinism:

```python
import json, websocket
ws_url = next(t['webSocketDebuggerUrl']
              for t in json.load(__import__('urllib.request').request.urlopen("http://localhost:29229/json"))
              if t.get('type') == 'page' and '5173' in t.get('url', ''))
ws = websocket.create_connection(ws_url)
def send(m):
    ws.send(json.dumps(m))
    while True:
        r = json.loads(ws.recv())
        if r.get('id') == m['id']:
            return r

# Open dropdown
send({"id": 1, "method": "Runtime.evaluate",
      "params": {"expression": 'document.querySelector(\'[aria-label="Change language"]\').click()',
                 "returnByValue": True}})

# Click a specific option by visible text
send({"id": 2, "method": "Runtime.evaluate",
      "params": {"expression": '''(function(){
          for (const el of document.querySelectorAll('[role="option"]')) {
              if (el.textContent.includes('Türkçe')) { el.click(); return 'ok'; }
          }
          return 'not found';
      })()''', "returnByValue": True}})
```

## Pre-test storage seed (one CDP call)

```python
expr = '''
sessionStorage.setItem("seabattle:geo:v1", JSON.stringify({country:"DE",region:null,status:"ok"}));
localStorage.setItem("seabattle:consent:v1", JSON.stringify({version:"2025-04-22",age18:true,tos:true,privacy:true,acceptedAt:Date.now()}));
localStorage.removeItem("sea3battle:lang:v1");
"OK";
'''
send({"id": 1, "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True}})
send({"id": 2, "method": "Page.reload", "params": {}})
```

## When the live site is the test target

If the user explicitly needs verification against `https://www.seabattle.xyz` (not local dev), you can NOT bypass the geo-block — it's checking the live IP. Either:
1. Use a non-US/WA VPN (org-level OpenVPN config, see VPN Setup in core prompt), or
2. Settle for an independent prod-bundle string check via `curl` + `grep` (proves merged code reached prod even if you can't render the UI).

## Dev server gotcha

Vite picks up `.env.local` automatically. Do not commit it — it's gitignored. The default `.env.example` values (zero-address contracts, `localhost:3001` server) are fine for i18n / UI tests since the homepage doesn't need a backend.
