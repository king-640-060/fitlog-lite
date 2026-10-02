# Food packaging import V1

Food Library, meal entry and the AI assistant camera share one direct workflow. Library/meal capture the selected Food date; assistant captures local Today. Specific meal is retained; general entry does not guess a meal. Food write permission/read scopes do not govern this user-operated form, and business data never goes to the Vision provider.

## Images and privacy

Required nutrition-table slot and optional package-front slot each offer camera and photo-library choice. Camera uses image/* + environment; gallery image/* without capture. Maximum two, one slot replacement at a time. File size ≤20 MiB, decoded area ≤60M pixels, long edge ≤1800px. Browser decode preserves orientation; a new Canvas re-encodes JPEG (.88 then .84/.80 if needed) to remove metadata. Maximum 3 MiB per output, 6 MiB total binary, 9 MiB serialized request. HEIC requires native decode; no decoder dependency. Stop retains selected processed images; close drops them and aborts. Object URLs are revoked after preprocessing.

First actual packaging transmission requires independent `fitlog-ai-vision-privacy-ack-v1`. Explain images are sent to the configured provider after local processing and are excluded from business DB, Backup, Sync, localStorage and assistant history. Provider retention depends on the provider. Original bytes and extracted evidence are never persisted as business facts.

## Provider and extraction

Existing OpenAI-compatible Chat Completions adapter: user text + image_url data parts, detail high. First image is nutrition table, second front. No tools, agent loop, history, business records, automatic retry, proxy or SDK. Bound timeout 45s. Vision and tool capabilities are independent. Unknown permits trying; valid extraction or exact local 731 probe establishes supported. Only explicit image rejection establishes unsupported; network/429/5xx/timeout do not.

Prompt V1 requests strict fitlog-food-label JSON V1. Pure JSON or one complete code fence is accepted, with bounded shape/enums/nonnegative finite numbers, ≤120-character name/brand, ≤100-character field evidence and ≤8 provider warnings of ≤200 characters each. Evidence must contain the copied numeric value/unit, preventing NRV-only or contradictory evidence. This consistency check does not prove a model read the photograph correctly. No name/nutrition inference, macro calorie calculation or density assumptions. Optional secondary observed energyKj permits local consistency review; >max(1 kcal, 5%) discrepancy warns without blocking correction.

## Basis and energy

Per100g →100g; custom grams →that gram quantity; serving with explicit grams →those grams; serving without grams →user supplies grams. Per-package may use clearly observed net g/kg only if no conflicting volume basis. Net weight never replaces a per100g/serving basis. Per100mL and other volume bases require explicit gram equivalence, never density=1. Net g/kg supports a tap-only whole-package intake shortcut; intake grams starts empty.

1 kcal=4.184 kJ. FitLog calculates kJ→kcal locally; explicit kcal is preferred and stored directly. UI accepts both and keeps an independent exact canonical state. Unit switching or editing only name/brand/macros never drifts energy. Missing macro values remain undefined, missing name/reference grams/energy block save. CSV/JSON, Targets, tools, Reports and FoodLog remain kcal.

## Review and writes

Editable nutrition review, small thumbnails, expandable evidence and quiet warnings precede immutable local preview and explicit confirmation. Same normalized name+brand shows current versus recognized nutrition and offers Use existing / Update existing / Save as new. Recheck source before use/update; do not silently duplicate or overwrite. Update only Food Library, never historical snapshots.

Save-only writes Food only. Save-and-record uses existing saveFood + calculateNutrition/logFood in one foods/foodLogs transaction; failure rolls back both creation or update. Actual date uses shared FitLog Date Picker; meal is explicit including unclassified, grams is user-entered. Future factual intake is blocked. Confirmation jobs deduplicate double taps; previews cancel without writes. Changed sources require review again.

## Verification boundaries

Automated mock-provider browser QA verifies protocol, image handling, orientation, UI and deterministic writes. Real-provider recognition quality/CORS and physical iPhone Safari/installed PWA camera return, gallery, keyboard and safe area require separate manual verification. No new migration or schema version: Dexie V7/14 stores, Backup V7, Restore V1–V7, Sync V1, AI Config/System Prompt V1.
