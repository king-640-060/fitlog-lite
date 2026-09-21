# FitLog Lite — Chat Handoff

Generated: 2026-09-21 14:51:22 CST
Branch: `main`
Commit: `47b1625efd5757563b49b24c859699cdd05ce38a`
Production: https://king-640-060.github.io/fitlog-lite/
Database Version: `2`
Backup Schema Version: `2`（Restore 兼容 V1）
Tests: `48 passed`（3 test files）

> AI Development Handoff / Project State Snapshot。不是 README、用户文档或未来需求承诺。若本文件与以后仓库代码冲突，以代码为准。

## 项目一句话定义

FitLog Lite 是一个单用户、local-first、iPhone-first 的个人健身记录 PWA，用于记录饮食、训练、体重，支持训练模板、饮食模板、日历总览和本地 JSON 备份恢复。

无账号、无后端、无云数据库；业务数据保存在当前设备 IndexedDB，静态前端部署在 GitHub Pages。

## 当前产品目标

- 个人轻量工具，不是商业 SaaS 或大型健身平台。
- local-first、offline capable，尽量减少重复录入。
- iPhone 是主要设备，兼顾 Safari 和主屏幕 PWA。
- 数据可靠性、历史快照和可恢复性优先。
- 当前不做社交、账号、云同步或复杂训练编排。

## 当前技术栈

- Frontend：Vite 8、Vanilla TypeScript 6、原生 HTML/CSS；无 Router、无 UI framework。
- Storage：Dexie 4、IndexedDB；`localStorage` 只保存上次导出时间等轻量状态。
- Libraries：Chart.js 4、Papa Parse 5、vite-plugin-pwa 1。
- Testing：Vitest 5、fake-indexeddb 6。
- Deployment：GitHub Actions → GitHub Pages。

## 当前页面和导航

- Bottom Navigation：`饮食`、`训练`、`体重`。
- 顶部日历按钮打开月历；顶部设置按钮打开设置 Bottom Sheet。
- 无 URL Router；`src/main.ts` 使用内存状态和 `render()` 切换 View。
- 饮食：首页、食物库、添加 FoodLog、饮食模板管理/选择。
- 训练：首页、Active Workout、动作库、训练模板、训练历史/详情。
- 体重：首页、记录 Sheet、趋势图、历史。
- 日历：月视图、日期详情 Sheet、跳转饮食/训练/体重。
- 设置：JSON Backup 导出/恢复、存储提示、上次导出时间。
- `foodDate`、`workoutDate`、`weightDate` 分别维护三个业务页日期；`calendarSelectedDate` 维护日历选中日期。
- Calendar 跳转会把所选日期赋给目标页；模板生成记录时使用当前业务日期，不强制使用今天。

## 已实现的核心功能

标记：`✓` 已实现，`△` 部分实现，`!` 已知问题，`✗` 未实现。

### 饮食

- ✓ Food CRUD；字段为 name、brand、referenceGrams、calories、protein、carbs、fat。
- ✓ 食物库按名称/品牌实时过滤（120ms debounce）；添加 FoodLog 时也可搜索。
- ✓ CSV（中英文 header）与 JSON 导入、预览、错误行、重复检测。
- ✓ 重复项可跳过或覆盖；导入写入位于 Dexie transaction。
- ✓ FoodLog 记录 grams，按 referenceGrams 计算 calories/macros。
- ✓ FoodLog 保存名称、品牌、基准营养和总营养 snapshot。
- ✓ Food 后续修改/删除不影响历史 FoodLog。
- ✓ 历史日期补录；grams 可编辑并基于自身 snapshot 重算；可删除。

### 饮食模板

- ✓ Create / Edit / Delete / Duplicate / Search。
- ✓ 应用到当前 `foodDate`；可从选中日期的当天饮食保存为模板。
- ✓ 应用时追加 FoodLog，不覆盖已有记录；每条生成新 UUID。
- ✓ 成功后更新 `lastUsedAt`。
- ✓ 排序：已使用模板按 `lastUsedAt` 降序且优先；未使用按 `updatedAt` 降序；名称稳定 tie-breaker。
- ✓ Food 存在时使用当前名称/nutrition；删除时使用 fallback，并清空失效 foodId。
- ✓ FoodLog 批量写入与更新 `lastUsedAt` 在同一 transaction，失败不写入部分记录。
- ✓ DietTemplate 与历史 FoodLog 解耦。

### 训练

- ✓ Exercise CRUD；添加动作时可搜索（动作库本身无独立搜索框）。
- ✓ 空白 Workout；同日可有多次已完成 Workout。
- ✓ UI 防止意外创建多个未完成 Workout，已有未完成训练时引导继续。
- ✓ Workout 有业务 date、startedAt、finishedAt、note；动作含独立 sets。
- ✓ Set 支持 weightKg、reps、RPE、note，支持新增/删除。
- ✓ 新增 Set 复制上一组 weight/reps；无上一组时 reps 暂以 0 表示 UI 空白。
- ✓ 保存时丢弃完全空白 Set；部分填写但 reps 无效时拒绝保存。
- ✓ 400ms debounce autosave，有 pending/saving/saved/error 状态。
- ✓ 离开、看历史、完成、页面隐藏前 flush autosave。
- ✓ unfinished Workout 可恢复；finish 与 save 共用 normalization/validation。
- ✓ 历史与详情；已完成 Workout 可编辑、删除、保存为模板。
- ✓ 无重量 Set 在历史中显示“X 次”，不伪造 0kg。

### 训练模板

- ✓ Create / Edit / Delete / Duplicate / Search。
- ✓ 从模板开始 Workout，使用当前 `workoutDate`；历史 Workout 可保存为模板。
- ✓ 动作可上移/下移；模板保存顺序、sets、weight/reps/RPE、set note 和 exercise note。
- ✓ Duplicate 和 Template → Workout 对顶层及嵌套实体生成新 UUID。
- ✓ deep clone：修改实际 Workout 不影响模板，修改/删除模板不影响旧 Workout。
- ✓ Exercise 存在时使用当前 ID/名称；删除后使用模板 `exerciseName` snapshot，exerciseId 为空。
- ✓ 成功开始后更新 `lastUsedAt`；排序规则同饮食模板。

### 体重

- ✓ WeightLog 新增、编辑、删除；同日 upsert；DB 对 date 有 unique index。
- ✓ 今日无记录可显示最新体重；历史日期只显示该日数据。
- ✓ 历史列表和 Chart.js 趋势图。
- ✓ 30 天 / 90 天 / 全部范围；单数据点显示可见 point。
- ✓ 可从 Calendar 补录历史体重。

### 日历

- ✓ 月视图、周一开头、固定 6 周网格；上月/下月/回到今天、selected date。
- ✓ 按日聚合 FoodLog calories、已完成 Workout 次数/sets、WeightLog。
- ✓ 日期 Bottom Sheet 展示摘要并跳转 Food / Workout / Weight。
- ✓ 支持所选历史日期补录。
- ✓ 模板不显示在 Calendar，只有生成的实际记录参与聚合。

### Backup / Restore

- ✓ 导出 JSON Backup V2，包含 7 个 stores。
- ✓ Restore 接受 V1/V2；V1 恢复旧五表，两个 template stores 为空。
- ✓ 清库前全量验证 app/schema/timestamp/数组/业务字段/日期/重复 ID/重复 Weight date。
- ✓ 验证 Workout 嵌套 IDs、reps、weight、RPE、note。
- ✓ 验证 WorkoutTemplate、DietTemplate 及 fallback nutrition。
- ✓ 单一 transaction 覆盖 7 stores，中途失败整体 rollback。
- ✓ 设置显示设备本地存储提示；`localStorage` 显示上次导出时间或“尚未备份”。

### PWA / Offline

- ✓ manifest name/short_name 为 `FitLog Lite`，`display: standalone`。
- ✓ vite-plugin-pwa `autoUpdate` Service Worker + Workbox precache + navigation fallback。
- ✓ Apple Touch Icon 180×180、PWA PNG 192/512。
- ✓ `viewport-fit=cover`、safe-area top/bottom、GitHub Pages repository base。
- ✓ IndexedDB 数据与缓存 app shell 支持离线打开、查看、写入和导出。
- △ 无真实 iOS Safari / standalone / offline 自动化 E2E，仍需真机验收。

## 数据库

Database: `fitlog-lite-db`
Dexie schema version: `2`

### Stores

- `foods`：Food 字段；索引 `id, name, brand, [name+brand], createdAt`。
- `foodLogs`：date、foodId?、Food/nutrition snapshot、grams、totals、timestamps；索引 `id, date, foodId, createdAt`。
- `exercises`：name、notes?、timestamps；索引 `id, name, createdAt`。
- `workouts`：date、startedAt、finishedAt?、exercises[]、note?、timestamps；索引 `id, date, finishedAt, createdAt`。
- `weights`：date、weightKg、timestamps；索引 `id, &date, createdAt`（date unique）。
- `workoutTemplates`：name、description?、exercises[]、timestamps、lastUsedAt?；索引 `id, name, createdAt, updatedAt, lastUsedAt`。
- `dietTemplates`：name、description?、items[]、timestamps、lastUsedAt?；索引同模板 store。

V2 只新增两个模板 store；旧五表索引不变，没有扫描或重写旧历史。

## 数据关系和关键设计决策

### FoodLog snapshot

```text
Food → createFoodLogSnapshot → FoodLog snapshot
```

- 保存当时名称、品牌、基准营养和 totals；Food 修改/删除不改变历史。
- 编辑 grams 使用 FoodLog 自身 snapshot，不回查 Food。

### Workout snapshot

```text
Exercise → copy id + name → WorkoutExercise.exerciseName snapshot
```

- Exercise 修改/删除不改变历史名称；`exerciseId` 可空，展示依赖 snapshot。

### Workout Template

```text
WorkoutTemplate → deep clone + new IDs → Workout
```

- 模板只是起点，不与生成后的 Workout 同步。
- 开始时优先解析当前 Exercise；删除后回退模板名称。

### Diet Template

```text
DietTemplate → current Food or fallback → FoodLog[] snapshots
```

- Food 存在时用当前 nutrition，删除时用模板 fallback。
- 生成后 FoodLog 独立，不跟随 Food 或模板变化。

## 日期规则

- 业务日期统一 `YYYY-MM-DD`，来自设备本地年月日。
- 使用 `src/utils/date.ts` 的 `getLocalDateString()`。
- 禁止用 `new Date().toISOString().slice(0, 10)` 生成业务日期，避免 UTC 跨日。
- ISO timestamp 只用于 createdAt、updatedAt、startedAt、finishedAt、lastUsedAt、exportedAt。
- 显示业务日期时以本地中午解析，避免时区边界偏移。

## 重要 Validation 规则

- Food：name required；referenceGrams > 0；calories >= 0；可选 macros >= 0。
- FoodLog：grams > 0；创建时生成完整 snapshot。
- Workout Set：reps 正整数；完全空白 Set 不持久化；weightKg 可空且 >= 0；RPE 可空且 1–10。
- 部分填写 Set 但 reps 无效时拒绝保存，不覆盖原记录。
- Weight：weightKg > 0；合法 date；date unique，同日 upsert。
- Template：name required；Workout Set 同上；Diet grams/referenceGrams > 0，nutrition 不得为负。
- Restore：完整验证后才清库；7-store 单 transaction；失败不得留下部分结果。

## Stability work already completed

- Workout autosave consistency、debounce flush、离开前 flush。
- 空白 `reps: 0` 不持久化；部分输入无 reps 明确报错。
- save / finish 统一 validation。
- Restore 深度验证、validation-before-clear、rollback tests。
- Calendar → Weight 日期状态、单点体重图、Food 实时搜索修复。
- 无重量训练历史显示修复；异步错误 toast / autosave error state。

不要把以上项目重新列为待修问题。

## Template phase already completed

- Dexie V1 → V2；Backup V1 → V2；Restore 保留 V1 compatibility。
- Workout Templates：CRUD、复制、搜索、开始训练、历史保存为模板。
- Diet Templates：CRUD、复制、搜索、批量应用、当天饮食保存为模板。
- deep clone/snapshot、deleted Exercise/Food fallback、current Food nutrition resolution 已实现并测试。

不要重新开发模板基础功能，除非用户明确提出变更。

## 当前 UI / Design

- Light-first，系统 dark mode 有对应 token。
- 浅暖灰背景、白色 surface、低饱和 sage accent、Apple system font。
- iPhone/mobile-first，内容最大宽度 720px。
- 浮动 Bottom Navigation；原生 `<dialog>` Bottom Sheet。
- Active Workout 沉浸式顶部栏并隐藏主导航。
- 已使用 safe-area、动态 viewport 高度和键盘状态样式。

## 当前最高优先级问题

### iPhone input auto zoom / keyboard visibility

Priority: High UX
Status: Open

在 iPhone Safari / PWA 中，点击部分输入框后可能自动缩放；软键盘弹出后 focused input 仍可能不在理想可视区域。

当前代码事实：

- viewport：`width=device-width, initial-scale=1.0, viewport-fit=cover`；未禁用用户缩放。
- `button, input, textarea { font: inherit; }`；`.form label` 为 `.84rem`，内部普通输入可能继承约 13.4px，低于 iOS 常用 16px 防 zoom 阈值。
- quantity/weight 输入有显式大字号；Workout set input 通常从 body 继承 16px，仍需真机确认。
- `setupMobileViewport()` 监听 `visualViewport` resize/scroll，维护 `--visual-viewport-height` 和 `body.keyboard-open`。
- focusin 后 180ms 调用 `scrollIntoView({ block: 'center', behavior: 'smooth' })`。
- 键盘打开或训练输入聚焦时隐藏 bottom navigation。
- 现有逻辑只能缓解；不要用禁用 pinch zoom 的方式牺牲可访问性。

## 其他 Known Issues

### P0

- 无已知 P0 数据丢失或阻断问题。

### P1

- iPhone input auto zoom / keyboard visibility 尚未闭环。
- 真实 iPhone Safari 与 A2HS standalone 完整回归依赖真机手测。

### P2

- 无浏览器级 PWA offline E2E；Service Worker/manifest 在 build/deploy 层验证。
- `src/main.ts` 集中承载导航和大量 UI 绑定；修改需避免状态回归，当前未授权重构。

## 尚未实现的候选功能

以下不是承诺需求：

- ✗ Recent Foods / remember last-used grams。
- ✗ Quick Add calories。
- ✗ Previous exercise session reference。
- ✗ Undo。
- ✗ Rest Timer。
- ✗ 模板自动排程或 Calendar 训练计划。

## 已明确不需要的方向

除非用户明确改变方向，不要主动引入：

- Account/Login、Cloud database/sync。
- Social/Friends、Coach platform。
- AI recommendations、Barcode scanning、USDA/OpenFoodFacts。
- Apple Health、complex workout programming engine。
- PR gamification、Streaks、large analytics dashboard。
- 大型 UI framework migration。

## 下一步推荐顺序

1. 修复 iPhone input auto zoom / keyboard visibility。
2. 真机 Safari + standalone PWA 验收：输入、Safe Area、Offline、IndexedDB、Backup。
3. Previous exercise session reference。
4. Recent Foods / last-used grams。
5. Quick Add。
6. Undo。
7. Rest Timer。

3–7 只是候选，开始前由用户确认优先级和范围。

## Instructions for the next ChatGPT conversation

1. 先把本文件视为当前上下文；冲突时以代码为准。
2. 不重新建议已完成功能；规划前先检查代码。
3. 数据可靠性优先，iPhone 是主要设备，保持 local-first/offline。
4. 复用现有 service、validation、nutrition、date helper。
5. 不无必要引入大型依赖或 UI framework。
6. DB schema 修改必须迁移并保留既有数据。
7. Backup schema 修改必须保持旧版本 Restore 兼容。
8. Template 与实际历史继续解耦。
9. selectedDate 在 Calendar/Food/Workout/Weight 间语义一致。
10. 不用 UTC ISO 截断生成业务日期。
11. 数据层变更增加 fake-indexeddb 测试。
12. iPhone UI 变更检查 375×812、390×844、393×852、430×932。
13. 完成开发必须运行：

```bash
npm run typecheck
npm test
npm run build
```

14. 部署后验证 GitHub Actions 和 Production。

## 项目重要文件地图

- `src/main.ts`：App state、导航、render、dialog、事件绑定、mobile viewport helper。
- `src/db/types.ts`：业务实体、Template、Backup V1/V2。
- `src/db/database.ts`：Dexie V1/V2 schema、Exercise seed。
- `src/services/foodService.ts`：Food 与 FoodLog。
- `src/services/workoutService.ts`：Exercise、Workout、autosave。
- `src/services/templateService.ts`：模板复制/排序/生成、fallback/transaction。
- `src/services/backupService.ts`：V1/V2 validation、V2 export、7-store restore。
- `src/services/importService.ts`：CSV/JSON 与预览；`weightService.ts`：Weight upsert。
- `src/utils/date.ts`：本地日期；`nutrition.ts`：营养/snapshot；`validation.ts`：通用规则。
- `src/ui/calendarPage.ts`：月网格、聚合、Calendar DOM。
- `src/styles/main.css`：tokens、移动布局、Bottom Sheet、Safe Area、键盘、Template UI。
- `tests/core.test.ts`：日期、日历、营养、导入、体重、snapshot。
- `tests/stability.test.ts`：autosave/flush/validation、Restore/rollback。
- `tests/phase2.test.ts`：DB V2 migration、Templates、Backup V1/V2。
- `vite.config.ts`：PWA/Workbox/base；`index.html`：iOS PWA meta/icons。
- `.github/workflows/deploy.yml`：main → GitHub Pages。

## 测试现状

2026-09-21 实际执行：

```text
npm ci: PASS（0 vulnerabilities）
Typecheck: PASS
Tests: 48 passed / 3 files passed
Build: PASS（Vite production build + PWA generateSW）
```

覆盖：日期/月历、营养/snapshot、CSV、Weight upsert、Workout autosave/flush/validation、Backup 深度验证/rollback、DB migration、两类 Template deep clone/fallback/transaction、Backup V1/V2。

未覆盖：真实 Mobile Safari、软键盘、standalone 安装和真实离线切换。

## Deployment

- GitHub repo: https://github.com/king-640-060/fitlog-lite
- Branch: `main`
- CI/CD: `.github/workflows/deploy.yml`
- Production: https://king-640-060.github.io/fitlog-lite/
- Latest deployment commit: `47b1625efd5757563b49b24c859699cdd05ce38a`
- Handoff 生成时状态：`success`
- Run: https://github.com/king-640-060/fitlog-lite/actions/runs/35196181145

## Handoff Summary

- 单用户、local-first、iPhone-first 个人健身 PWA；无后端/登录/云数据库。
- 核心是饮食、训练、体重、日历；设置提供本地 Backup/Restore。
- Bottom Navigation 为饮食/训练/体重；无 URL Router。
- FoodLog 与 WorkoutExercise 使用 snapshot，源数据变化不改历史。
- Workout/Diet Templates 已完整实现，不要重做基础模板功能。
- Template → actual records 使用 deep clone/snapshot，与历史解耦。
- Dexie V2，共 7 stores；Backup V2，Restore 兼容 V1。
- Restore 先深度验证，再用单 transaction 替换 7 stores。
- Phase 1 autosave/flush/reps 0/Restore rollback/Calendar Weight 等已修复。
- 48 tests、typecheck、build 全部通过。
- PWA 已有 standalone manifest、Workbox、Apple Touch Icon、Safe Area。
- 最高优先级是 iPhone input auto zoom 与软键盘可视区域。
- 部分表单 input 可能继承约 13.4px；visualViewport/scrollIntoView 未完全解决。
- 下一步先修输入体验，再做真机 Safari/standalone/offline 验收。
- 不主动扩展账号、云同步、社交、AI、条码、Apple Health 或大型框架。
- Production 正常；部署基线为 `47b1625efd5757563b49b24c859699cdd05ce38a`。
