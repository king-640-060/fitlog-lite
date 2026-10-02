# Isolated mobile browser checks

These scripts use an external Playwright/Chrome installation. They add no application dependency and use fresh synthetic profiles only. GitHub requests in `githubSyncSafety.mjs` are intercepted; no real Token or repository is used. Run from the repository root while the Vite dev server is available:

```sh
export FITLOG_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
export FITLOG_CHROME=/absolute/path/to/Chrome
node tests/browser/sharedDatePicker.mjs
node tests/browser/githubSyncSafety.mjs
node tests/browser/aiAssistant.mjs
node tests/browser/foodVision.mjs
```

Default URL is `http://127.0.0.1:5173/`; override `FITLOG_QA_URL` for the deployed app. Local checks cover 320×812, 375×812, 390×844, 430×932; production checks cover 390×844 and 430×932. Browser checks are separate from the Vitest count and physical iPhone verification.

AI checks intercept only synthetic provider endpoints and use invented credentials/data. They cover five entries, editable profiles, tiny tests/probe, empty key editing, unsupported model lists, snapshot reads, proposal confirmation/cancellation, reports/completion, safe text, usage, Stop, HTTP/CORS errors, known-secret blocking, A→B routing, permission enforcement, session/reload and offline core. They never contact a real AI provider or inspect a user's production browser profile.

Food Vision uses generated synthetic label images and an intercepted Provider. It covers three entrances, a data-free capability probe, Canvas JPEG preprocessing, expandable image review, strict unknown fields, no writes before confirmation, cancellation/double clicks, save-only/continue/save-and-log, selected dates/meals, mL guards, HTTP/CORS/Stop, manual kJ editing and preserved kcal snapshots. Its default dev URL is port 5174; override FITLOG_QA_URL for another port. Real Vision quality and physical camera/HEIC behavior are separate manual checks.
