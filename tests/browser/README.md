# Isolated mobile browser checks

These scripts use an external Playwright/Chrome installation. They add no application dependency and use fresh synthetic profiles only. GitHub requests in `githubSyncSafety.mjs` are intercepted; no real Token or repository is used. Run from the repository root while the Vite dev server is available:

```sh
export FITLOG_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
export FITLOG_CHROME=/absolute/path/to/Chrome
node tests/browser/sharedDatePicker.mjs
node tests/browser/githubSyncSafety.mjs
node tests/browser/aiAssistant.mjs
```

Default URL is `http://127.0.0.1:5173/`; override `FITLOG_QA_URL` for the deployed app. Local checks cover 320×812, 375×812, 390×844, 430×932; production checks cover 390×844 and 430×932. Browser checks are separate from the Vitest count and physical iPhone verification.

AI checks intercept only synthetic provider endpoints and use invented credentials/data. They cover five entries, editable profiles, tiny tests/probe, empty key editing, unsupported model lists, snapshot reads, proposal confirmation/cancellation, reports/completion, safe text, usage, Stop, HTTP/CORS errors, known-secret blocking, A→B routing, permission enforcement, session/reload and offline core. They never contact a real AI provider or inspect a user's production browser profile.
