# Isolated mobile browser checks

These scripts use an external Playwright/Chrome installation. They add no application dependency and use fresh synthetic profiles only. GitHub requests in `githubSyncSafety.mjs` are intercepted; no real Token or repository is used. Run from the repository root while the Vite dev server is available:

```sh
export FITLOG_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
export FITLOG_CHROME=/absolute/path/to/Chrome
node tests/browser/sharedDatePicker.mjs
node tests/browser/githubSyncSafety.mjs
```

Default URL is `http://127.0.0.1:5173/`; override `FITLOG_QA_URL` for the deployed app. Local checks cover 320×812, 375×812, 390×844, 430×932; production checks cover 390×844 and 430×932. Browser checks are separate from the Vitest count and physical iPhone verification.
