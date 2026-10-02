# FitLog Lite Development Report

## Capability-specific AI model routing — 2026-10-02

同一 Profile、Provider、Base URL 和 API Key 下，聊天与 FitLog 数据使用 `model`，图片输入使用可选 `visionModel`。旧配置自动回退到聊天模型。没有增加 Provider 架构、依赖、业务存储或迁移。

## 发布身份

| # | 字段 | 结果 |
| --- | --- | --- |
| 1 | START_COMMIT | b2f6a64f3d04386d1c17508851b4573475e100dc |
| 2 | DUAL_MODEL_ROUTING_COMMIT | 9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8 |
| 3 | END_COMMIT | 9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8；本轮唯一 application commit |
| 4 | REPORT_COMMIT | 本报告与 LATEST_DEV_REPORT 的提交；完整 SHA 见交付消息或 `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| 5 | main HEAD | 应用验收时 9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8；报告提交后的完整 SHA 见交付消息 |
| 6 | production HEAD | 应用验收时 9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8；Pages deployment 6806256081 SUCCESS；最终报告部署身份见交付消息 |

HTTPS pull/push 连接超时。GitHub API 核对远端 main 与本地 START 完全相同；Git Data API 验证每个 blob/tree/commit 的 SHA 与本地一致后，以 force:false 推进 main。没有重置、覆盖或改写历史。

生产地址：[FitLog Lite](https://king-640-060.github.io/fitlog-lite/)。

## 实现与兼容

| # | 字段 | 结果 |
| --- | --- | --- |
| 7 | Profile schema变化 | AiProviderProfile / AiProfileInput 增加可选普通配置 visionModel?:string；localStorage AI Config V1 不变，无 Dexie/Backup 变化 |
| 8 | visionModel兼容策略 | Reader 接受非空且≤200字符字符串，trim；非法/缺失忽略为undefined，保留整个旧Profile。Save trim，空值省略，超长reject |
| 9 | Chat routing | AiClient.chat → adapter.chat → profile.model；连接测试同样使用聊天模型 |
| 10 | Tool routing | testToolCapability 与普通助手所有工具轮次继续调用chat，使用profile.model；Vision-only save/probe不清空聊天历史/提案或中止活跃请求 |
| 11 | Vision routing | AiClient.visionChat → adapter.visionChat → getVisionModel；两条路径共用private chatWithModel、native fetch、安全边界与响应归一化；731 probe使用visionChat |
| 12 | Food Vision routing | analyzeFoodPackageImages只接visionChat。工作流signature包含profile.id/root/effective image model/key；图片路由变更拒绝旧结果，显示“AI 配置已变化，请重新识别。”；独立图片路由下只改聊天模型不影响识别 |
| 13 | capability reset规则 | 只改图片模型：Tools保留/Vision unknown；独立图片路由下只改聊天模型：Tools unknown/Vision保留；无独立图片模型改聊天模型：两者unknown；root/key变更：两者unknown；有效路由相同则保留；重命名保留 |
| 14 | AI Settings UX | 保持当前服务优先/权限与高级分层。对话与FitLog数据模型＋图片识别同一/独立radio；仅独立时展开图片selector。未知/失败不会声称支持；共享模型图片未通过时提供“选择图片模型”。高级单独测试/仅保存保留；overview独立图片短行，Hub摘要不变 |
| 15 | /models复用方式 | 显式GET一次，当前editor session共用同一个models[]，展开图片字段无请求；root/key编辑清除缓存；全部精确ID可选，保留列表外当前值；不按名字猜测能力、不固定型号 |
| 16 | fallback behavior | 缺失visionModel时getVisionModel返回model。列表失败两个字段都可手填；独立模式未填写ID提示选择，不偷偷保存为空。Save & Test按Chat→Tools→Vision运行，保存先于测试，部分失败不rollback |
| 17 | secret behavior | visionModel加入assertNoKnownSecrets；显式projection只写普通metadata。单一Key保存在独立key-v1项，只进Authorization Bearer。保存编辑值为空，空Key保留；不进入Profile JSON/DB/Backup/Sync，不显示raw provider body |
| 18 | backward compatibility | 无visionModel旧Profile默认“使用同一个模型”；Chat/Tools/731/Food scan继续使用原model。保留图片处理/隐私/未知宏量/kJ-kcal/快照/原子写入/明确确认/Stop；无数据迁移或frozen fixture修改 |

### 能力失效矩阵

| 修改 | Tool capability | Vision capability |
| --- | --- | --- |
| 独立图片模型 | 保留 | unknown（仅有效图片路由改变时） |
| 聊天模型，图片模型独立 | unknown | 保留 |
| 聊天模型，图片使用同一个模型 | unknown | unknown |
| Base URL / API Key | unknown | unknown |
| 名称或有效路由没有改变 | 保留 | 保留 |

## Automated Verification

| # | 字段 | 结果 |
| --- | --- | --- |
| 19 | tests / test count | 实际baseline384tests/39files PASS；最终405tests/40files PASS（+21）。新增reader/保存/secret/失效矩阵/5条请求路由/legacy/图片signature/活跃聊天与history保留回归；既有Vision/Tools/提案/安全/历史快照/Nutrition/frozenV7/Backup/Restore/Sync全PASS |
| 20 | typecheck | npm run typecheck PASS |
| 21 | build | npm run build PASS；git diff --check PASS |
| 22 | Pages build | GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build PASS |
| 23 | bundle | JS667152B/Vitegzip213.56kB；CSS101890B/Vitegzip18.27kB；precache17entries/786.33KiB；无新依赖 |

本地320×812 /375×812 /390×844 /430×932，六个浏览器脚本全部PASS：Dual Model Routing、Assistant、Food Vision、Interaction Stabilization、Shared Date Picker、GitHub Sync Safety。新场景包含用户原始glm-4.5/tools-supported/image-unsupported配置、共享/独立展开、单次列表复用、重新打开保留、手填fallback、一键5路请求检查、部分400失败、识别途中换图片模型、只改聊天模型、活跃聊天中只改图片模型。全部为隔离合成记录/图片/凭据与mock provider，未使用真实Key或用户数据。

人工检查320px截图并修复radio被通用表单样式分成两行的问题；44px行、16px输入与共享Sheet focus/viewport保持。普通助手及旧包装录入/图片方向/元数据处理/营养单位/保存+记录/Stop/错误回归通过。

### Pages资产

| Asset | Bytes | SHA-256 |
| --- | --- | --- |
| index-D-UBZopM.js | 667152 | 86c318bc496a400a258dcdc72e2440ccd5f842acef5c63d06496d213aa704ff5 |
| index-DTxpCV3q.css | 101890 | 8baf40154d9fa20456d833b4a3e76fe52df241f3ee92f999f9f2be709724367d |

## Production Verification

| # | 字段 | 结果 |
| --- | --- | --- |
| 24 | Actions | [36994775092](https://github.com/king-640-060/fitlog-lite/actions/runs/36994775092) SUCCESS；head9fd4bcbc8d6dac4683b5b6f8b1e1c2a21b02bbf8；报告部署回执见交付消息 |
| 25 | Production QA | 390×844 /430×932，六个浏览器脚本全部PASS；AI Settings/独立图片UI/旧Profile/普通Assistant/Food Vision全覆盖，无page errors；线上JS/CSS bytes与SHA-256与Pages构建完全一致 |
| 26 | data preservation | PASS：本轮修改前与部署后，同一旧Service Worker持久合成浏览器档案，14stores/15records逐项完全一致；实际加载当前构建JS后再比较；两次均readonly，未重置/重新填充DB |

## Manual Device Verification

| # | 字段 | 结果 |
| --- | --- | --- |
| 27 | real Provider status | Real Provider Pending；没有使用或提交真实API Key，mock通过不代表候选图片模型真实可用或识别质量 |
| 28 | physical iPhone status | Physical iPhone Safari /installed standalone PWA Pending；浏览器touch/viewport模拟不是物理设备验收 |
| 29 | DB / Backup / Restore / Sync versions | fitlog-lite-db /DexieV7 /14stores；BackupV7；RestoreV1–V7；SyncEnvelopeV1；AIConfigV1；AISystemPromptV1；FoodVisionPrompt/extractionV1 |
| 30 | remaining risks | 真实账号模型可用性/CORS/识别质量待Provider验证；物理设备相机/相册返回与键盘/Safe Area待核对；既有>500kB JS warning保留 |

### 发布后的真实账号操作

1. 打开「AI 设置」，编辑当前服务。
2. 保留已经正常工作的聊天与 FitLog 数据模型。
3. 图片识别选择「单独选择图片模型」。
4. 点击「读取模型列表」（两个选择器共用）。
5. 选择账号可用的候选图片模型；未列出时可手填精确ID。
6. 点击「保存并测试」。
7. 确认图片识别显示「已验证」；若失败，保留聊天模型并更换图片候选，再测试。

真实iPhone另行检查：模型选项与滚动、键盘/保存可达、助手IME/Stop/Safe Area、相机/相册返回、安装版PWA更新。

## ChatGPT Baseline

Read AGENTS → LATEST_DEV_REPORT → UI_INTERACTION_SPEC and AI_ARCHITECTURE/FOOD_VISION_IMPORT. Optional visionModel is localStorage metadata in the same V1 profile/key/root. Chat and tools stay on model; image probe/import use visionChat + getVisionModel fallback. Effective-route invalidation is independent; Vision-only changes preserve active assistant/history/proposals, chat-only changes preserve independent image results. AI Settings progressively reveals an image selector, reusing one session model list and manual fallback, with no vendor model defaults. 405tests/40files and local4size/production2size six browser suites PASS; exact14store preservation and asset identity PASS. Real Provider/physical Safari/standalone PWA Pending. DBV7/BackupV7/RestoreV1–V7/SyncV1/AIConfig+PromptsV1 unchanged. Shared interaction/Sheet/viewport and all prior stabilization rules remain authoritative.
