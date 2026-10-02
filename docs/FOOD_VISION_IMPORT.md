# Food packaging import V1

Food Library, meal entry and the AI assistant camera share one direct workflow. Library/meal capture the selected Food date; assistant captures local Today. Specific meal is retained; general entry does not guess a meal. Food write permission/read scopes do not govern this user-operated form, and business data never goes to the Vision provider.

## Images and privacy

Required nutrition-table slot and optional package-front slot each offer camera and photo-library choice. Camera uses image/* + environment; gallery image/* without capture. Maximum two, one slot replacement at a time. File size ≤20 MiB, decoded area ≤60M pixels. Default Fast nutrition: long edge1400px, JPEG .82/.80/.78, ≤1500KiB, detail auto. Fast front:1000px, .80/.78, ≤800KiB, detail low. Explicit high-detail retry:1800px, .88/.84/.80, ≤3MiB/image, detail high. Transport bounds remain6MiB total binary /9MiB serialized request. Browser decode preserves orientation; a fresh Canvas asynchronously encodes JPEG via toBlob, stripping source metadata. HEIC requires native decode; no decoder dependency. Original File objects and processed images remain only in the current Sheet closure for explicit re-encoding; close/save/remove releases them. Object URLs are revoked after preprocessing. Returning to Fast re-encodes source files if necessary.

First actual packaging transmission requires independent `fitlog-ai-vision-privacy-ack-v1`. Explain images are sent to the configured provider after local processing and are excluded from business DB, Backup, Sync, localStorage and assistant history. Provider retention depends on the provider. Original bytes and extracted evidence are never persisted as business facts.

## Provider and extraction

Images may use optional `visionModel` independently from the profile's chat/tool `model`, sharing the same Provider, Base URL and API Key. Legacy profiles without an image model fall back to the chat model. Both the731 probe and packaging extraction call the existing adapter's `visionChat` path. There is no vendor-specific client or second credential. Only real capability testing/valid extraction establishes image support. A captured request compares its effective image route before showing review: image-model/root/key/profile changes reject stale results, while a chat-only edit with independent image routing does not.

Existing OpenAI-compatible Chat Completions adapter: user text + image_url data parts, role-specific detail auto/low by default. First image is nutrition table, second front. The small capability probe retains detail high. High-detail re-recognition returns to image choice and requires an explicit recognition click; edited review requires acknowledgement before discard. No tools, agent loop, history, business records, automatic retry, proxy or SDK. Bound timeout45s. Vision and tool capabilities are independent. Unknown permits trying; valid extraction or exact local731 probe establishes supported. Only explicit image rejection establishes unsupported; network/429/5xx/timeout do not.

Numeric-only memory diagnostics report preprocessMs/requestMs/parseMs/totalMs/payloadBytes. No image, key, Base URL, file name, label or provider content is logged or persisted. Mock timing cannot establish real-provider latency/accuracy. Each choose/review/quantity/duplicate/preview/done replacement resets scrollTop0 immediately and on a guarded frame. Image viewer return restores review DOM and prior body scroll without autofocus.

Prompt V1 requests strict fitlog-food-label JSON V1. Pure JSON or one complete code fence is accepted, with bounded shape/enums/nonnegative finite numbers, ≤120-character name/brand, ≤100-character field evidence and ≤8 provider warnings of ≤200 characters each. Evidence must contain the copied numeric value/unit, preventing NRV-only or contradictory evidence. This consistency check does not prove a model read the photograph correctly. No name/nutrition inference, macro calorie calculation or density assumptions. Optional secondary observed energyKj permits local consistency review; >max(1 kcal, 5%) discrepancy warns without blocking correction.

## Basis and energy

Per100g →100g; custom grams →that gram quantity; serving with explicit grams →those grams; serving without grams →user supplies grams. Per-package may use clearly observed net g/kg only if no conflicting volume basis. Net weight never replaces a per100g/serving basis. Per100mL and other volume bases require explicit gram equivalence, never density=1. Net g/kg supports a tap-only whole-package intake shortcut; intake grams starts empty.

1 kcal=4.184 kJ. FitLog calculates kJ→kcal locally; explicit kcal is preferred and stored directly. UI accepts both and keeps an independent exact canonical state. Unit switching or editing only name/brand/macros never drifts energy. Missing macro values remain undefined, missing name/reference grams/energy block save. CSV/JSON, Targets, tools, Reports and FoodLog remain kcal.

## Review and writes

Editable nutrition review, small thumbnails, expandable evidence and quiet warnings precede immutable local preview and explicit confirmation. Same normalized name+brand shows current versus recognized nutrition and offers Use existing / Update existing / Save as new. Recheck source before use/update; do not silently duplicate or overwrite. Update only Food Library, never historical snapshots.

Save-only writes Food only. Save-and-record uses existing saveFood + calculateNutrition/logFood in one foods/foodLogs transaction; failure rolls back both creation or update. Actual date uses shared FitLog Date Picker; meal is explicit including unclassified, grams is user-entered. Future factual intake is blocked. Confirmation jobs deduplicate double taps; previews cancel without writes. Changed sources require review again.

## Verification boundaries

Automated mock-provider browser QA verifies protocol, image handling, orientation, UI and deterministic writes. Real-provider recognition quality/CORS and physical iPhone Safari/installed PWA camera return, gallery, keyboard and safe area require separate manual verification. No new migration or schema version: Dexie V7/14 stores, Backup V7, Restore V1–V7, Sync V1, AI Config/System Prompt V1.
