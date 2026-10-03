# Runtime identity and safe PWA upgrades

## Independent evidence

Management → Application → Version diagnostics displays the executing App build, controller and registration states, active/waiting/installing worker builds, sanitized App URL and registration scope. Full Git SHA is injected by Vite from `git rev-parse HEAD` into the JS and HTML meta tag on every build. Dirty tracked sources are explicitly labeled local. No timestamp or manual SHA is used. A versioned `sw-build-<SHA>.js` imported into each generated worker answers a MessageChannel request with only its build and number of scope clients. An old worker without this handler is unknown, not assumed to match the App.

“Check update” fetches uncached `build-info.json` (not precached) separately. The network deployment build is never substituted for the executing App or controller build. URLs omit user info, query and fragment. No business records, AI configuration, keys, credentials or provider errors are displayed or stored. Diagnostics have no persistence and are excluded from DB/Backup/Sync.

## Lifecycle

The original baseline used `registerSW({ immediate: true })`, autoUpdate, skipWaiting, clientsClaim and cache cleanup. The plugin reloads updated/external activated clients. There was no runtime build evidence, explicit update checking or safe confirmation gate. An already executing JS document needs navigation/reload to run a new bundle; cache cleanup alone does not replace its code. Production success is insufficient evidence of an iPhone's running version.

New builds use native registration with the Vite base scope, `updateViaCache: none`, prompt mode, `skipWaiting: false`, clientsClaim and Workbox precache/cleanup. One registration per page; foreground/online checks are throttled to five minutes. Manual checks are immediate. Offline failures expose no transport details. Install/state/controller events refresh diagnostic status without reloading. Waiting activation occurs naturally after all old clients close, or after explicit user confirmation sends `SKIP_WAITING`.

The diagnostic update action blocks other dialogs (including forms and selected Vision images), active Strength/Kegel sessions, session saves, busy AI calls, unsent in-memory AI drafts and pending/processing proposals. It flushes existing autosave and waits on a read-only transaction across existing stores, then rechecks safety. More than one same-scope window blocks activation to avoid reloading a legacy autoUpdate window elsewhere. Confirmation describes the end of the in-memory chat. It waits for the expected active controller build before a single reload. In-memory applying/reload flags prevent duplicate actions; controllerchange/startup never unconditionally reload. Closing diagnostics cancels the final reload. A timeout returns a fixed message and permits a later retry. Nothing unregisters a worker, manually clears caches, deletes IndexedDB or changes schema.

## Legacy bootstrap limitation

An already running pre-diagnostics client cannot gain the new screen or confirmation logic retroactively. Its replacement prompt worker waits while the old client remains open. After saving current forms/finishing sessions, close all FitLog Safari tabs and fully close the original installed PWA; reopen online. This allows default activation with no reinstallation or data reset. iOS process termination and separate Safari/standalone storage/controller contexts require physical evidence. Do not promise that a force-close gesture alone always terminates every client.

## Original production evidence

`33798a7c804e99a0e0a1940092db63c421f7c999` index referenced `assets/index-DGXlZzHp.js` and `assets/index-BW17gAhe.css`; the directly fetched production SW precached both. JS SHA256: `395c5adb96f9890c803fd713bacb80f82f537c3539f43eb84a9e9ac32d0ebb4f`; CSS SHA256: `ee71eb5631f4ac5d2d0d3bbd670b44b1e66d01307943cff9de091bd319da4598`. This proves hosted resources, not device adoption.

Two independently unchanged iPhone UI paths are consistent with a stale client, but no device App/controller build was available. Stale PWA/SW is a hypothesis, not a confirmed root cause; the device's previous build is unknown. Search CSS and model route rendering must remain unchanged until physical runtime evidence establishes the new build.

## Nondestructive physical check (Safari and original PWA separately)

1. Save edits/finish active sessions. Open the original FitLog app online.
2. Open Management → Application → Version diagnostics; capture App build, controller build/state, active/waiting/installing and scope.
3. If the old version has no diagnostics entry, close all FitLog Safari tabs and fully close the original PWA, then reopen online; do not clear data or add another Home Screen app.
4. If an update is waiting, check updates and confirm “Update and reopen” after handling drafts/proposals and closing other FitLog windows.
5. Capture diagnostics, fully close/reopen and capture again. Verify existing records and AI settings remain available. Then test offline reopening.
6. Only when the new App/controller builds are established, inspect Food Library and Food Vision. If either remains wrong, collect physical Safari search computed padding-inline-start/padding-left/font-size/line-height and input/icon rectangles; inspect only profile name/model/visionModel/effectiveVisionModel, never its key. No further CSS/model changes based on emulation alone.

Physical Safari and installed PWA remain **Pending** until these screenshots and observations arrive. Chromium upgrade regression proves generated lifecycle behavior and synthetic preservation only.
