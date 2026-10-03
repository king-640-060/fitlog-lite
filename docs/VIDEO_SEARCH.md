# Training video search V1

Official sources checked 2026-10-03:

- [YouTube Data API v3 search.list](https://developers.google.com/youtube/v3/docs/search/list): fixedGET search endpoint, snippet/video results, embed/syndication filtering, provider relevance order and project quota. The current page describes a Search Queries quota bucket; do not hardcode older quota costs or guarantee available quota.
- [YouTube embedding / privacy-enhanced mode](https://support.google.com/youtube/answer/171780?hl=en): website embeds may use youtube-nocookie. This changes provider personalization behavior; it does not promise no external contact/cookies. Restricted videos can still require external opening.
- [Official IFrame Player API](https://developers.google.com/youtube/iframe_api_reference): documented ready/error events and destroy lifecycle. No autoplay calls. No custom playback engine or npm player package; lazily load the official API only after Play.
- [Required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality): keep source Referer using strict-origin-when-cross-origin, minimum200×200 player, and no app overlay covering provider controls. Error153 can indicate missing client identity. Consequently narrow mobile player height is at least200px even when exact16:9 would be shorter; thumbnails remain16:9. External watch links retain noopener/noreferrer; they are separate from embedded player identity.
- [Google API key restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys): restrict to YouTube Data API v3 and the actual browser origin (production https://king-640-060.github.io/*; allow development origins only if needed). Browser referrer restrictions are not secret concealment. The provider sends the Key using the official [X-Goog-Api-Key system parameter](https://docs.cloud.google.com/apis/docs/system-parameters), outside request/display URLs. Browser CORS/network/quota failures use fixed safe guidance, never proxy forwarding or automatic retries.

## Local boundaries

VideoSearchConfigV1 metadata: fitlog-video-search-config-v1. Credential: fitlog-video-search-key-v1. Independent consent: fitlog-video-search-privacy-ack-v1. All localStorage/device-only and excluded from business Backup/Sync; AIConfigV1 remains unchanged. Include saved video credential in AI known secrets. Saved form remains blank; status distinguishes unconfigured/configured/test success/test failure. Opening settings has no network call; Save+Test searches one generic exercise explicitly.

search_training_videos has trimmed bounded query120 chars, default3 and limit1–5. Reject empty, URLs, controls, known credentials and private-context/numeric keywords. Never auto-append business records. Fixed fetch timeout15s, AbortSignal,128KiB streamed cap, no-store/omit/error redirect. Project safe text and strict11-character IDs, derive watch/embed/thumbnail URLs locally. No arbitrary provider/model URL, HTML or iframe string enters trusted UI.

Tool results carry bounded metadata to the model; `videos` conversation artifacts carry projected results in memory. Existing per-turn duplicate-call cache means one fetch/result artifact per call ID. Close aborts requests and destroys the player; reopen retains only memory cards without new network search/player. Clear/reload removes results; no database/video cache/download/favorites.

Cards are plain DOM/text, max5,3-line titles, secondary channels, stable16:9 thumbnail fallback and44px actions. Play creates one official privacy-enhanced frame; another Play destroys the first. The official API supplies ready/error events, with bounded external fallback; loading/error text is outside the player. No autoplay. Closed dialogs keep no player iframe.

## Verification categories

Unit tests cover request flags/headers, missing configuration/consent, strict projection/IDs/URLs, malformed/oversized/error/secret/timeout/abort response, known-secret integration, tool metadata/artifact separation and duplicate calls. Browser suite mocks search and official player events while testing actual app controls/lifecycle across mobile fonts/widths. These tests do not prove a real Key, browser/provider compatibility, real playable videos or physical Safari/PWA. Real provider and physical playback remain Not performed/Pending until separately verified.
