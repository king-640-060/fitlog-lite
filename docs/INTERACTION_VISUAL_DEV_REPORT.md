# FitLog Lite Development Report

## Interaction & Visual System Stabilization — 2026-10-02

本轮完成共享交互层、Sheet 生命周期与视口、AI 设置/助手信息架构及视觉 primitives。真实记录、历史快照和所有存储合同保持不变。

## 发布身份

| # | 字段 | 结果 |
| --- | --- | --- |
| 1 | START_COMMIT | ee446bf4fb01a0a1e9fd0bdabbe63b7185143ddc |
| 2 | INTERACTION_STABILIZATION_COMMIT | 76c9e8fec46eb9a37a0569a684ecfb91643c9ac5 |
| 3 | AI_UI_SIMPLIFICATION_COMMIT | 624353c1d07b56d4a7610a7c7f2eef29c7c33281 |
| 4 | VISUAL_SYSTEM_COMMIT | 0af568c478cad26299a976962e1178a4f138b62c |
| 5 | END_COMMIT / final application | 832f812aef96d0238dc93dbc6339e10f883f5c09；追加修复当前服务/权限摘要的标题、说明排版 |
| 6 | REPORT_COMMIT | 本报告与 LATEST_DEV_REPORT 的提交；完整 SHA 见交付消息，或 `git log -1 --format=%H -- LATEST_DEV_REPORT.md` |
| 7 | main HEAD | 应用验收时 4a83b1178f56e53aaafaa2ebe2c2bf876a1f2582；最终由本报告提交推进，完整 SHA 见交付消息 |
| 8 | production HEAD | 应用验收时4a83b1178f56e53aaafaa2ebe2c2bf876a1f2582（Pages deployment6804934011成功），最终报告 main/production SHA 见交付消息；报告部署只更新文档，保持 END_COMMIT 的同一组应用资源 |

`4a83b1178f56e53aaafaa2ebe2c2bf876a1f2582` 只增强持久浏览器验收器：要求旧 Service Worker 档案实际运行与新 Pages 构建一致的 JS 文件，再逐记录比较。未改变应用或数据。Git HTTPS 推送超时，GitHub Git Data API 校验每个 blob/tree/commit 完全相同后，以 force:false 顺序推进 main；原历史没有重置或改写。

生产地址：https://king-640-060.github.io/fitlog-lite/

## 交互与 Sheet 验收

| # | 字段 | 结果 |
| --- | --- | --- |
| 9 | input modality architecture | `inputModality.ts` 捕获 pointer/touch 与导航键，根节点显式标记 pointer/keyboard；文本/光标/IME 不误切换，按钮/选择框/复选框的键盘导航可切换 |
| 10 | focus rules | Pointer 控件无持续 outline/glow；输入仅安静边框。Keyboard 统一 2px ring，覆盖按钮、链接、summary、输入与自定义行，无全局 `*:focus` 清除 |
| 11 | initial Sheet focus | 非交互标题 tabindex=-1；初始不聚焦 X 或表单，不自动弹键盘；日期子视图同样聚焦标题，方向键使用已有 roving day focus |
| 12 | touch focus result | 自动化四档本地/两档生产 PASS：打开/关闭与输入无绿色键盘框，Habit 隐藏选择框父行无粗框。物理 Safari 独立 Pending |
| 13 | keyboard focus result | Tab/Enter/Escape/日期方向键 PASS；键盘关闭恢复已连接 trigger，preventScroll；Task 日期子视图 Escape 返回保留的表单 |
| 14 | tap highlight audit | 真实 button/a/summary/role=button/交互 label 抑制 Safari tap highlight；未全局禁用文本选择或用户缩放 |
| 15 | hover audit | 所有纯 hover 视觉均限定 `(hover:hover) and (pointer:fine)`；键盘视觉按显式 modality 限定 |
| 16 | active/press system | 背景、文字或 opacity 反馈；Primary pressed accent、Secondary neutral、Tertiary quiet；Date Rail 由原生滚动和 lens 负责反馈 |
| 17 | global button transform removal | 已删除全局按钮、日期按钮和训练按钮按压缩放；没有尺寸/边宽/阴影跳变 |
| 18 | page animation behavior | #view 普通渲染、日期/记录更新不播放 page-in；Chart reveal/重建动画同样删除 |
| 19 | nutrition number/ring behavior | 首帧直接渲染最终数值/offset；删除 rAF 数字重数、圆环从零播放、达标 pulse；业务计算/目标状态不变 |
| 20 | backdrop behavior | Sheet/确认框使用静态 RGBA，无 backdrop-filter/blur |
| 21 | modal lifecycle | `sheetController.ts` 单一主 Sheet；正常 close → 同步一次清理/通知 → replace。原生迟到 close 去重；confirm overlay 不删除底层 Sheet；原生 cancel 可由子视图消费 |
| 22 | VisualViewport architecture | 一个 app lifetime 协调器，height/offsetTop/bottomOffset/keyboardOverlap 共享 CSS vars；AI/Vision 私有监听已删除；反复开关后 resize/scroll 仍各1个 |
| 23 | keyboard-open behavior | 编辑控件与真实 overlap 联合判断；底栏允许隐藏，但不改变 app-frame padding；假键盘/offset 几何验收 PASS |
| 24 | background scroll behavior | 引用计数 fixed-body lock；叠加确认不中断，恢复原 body CSS/x/y 滚动；rapid open/close 和原位置恢复 PASS |
| 25 | Sheet variants | content/form/large/assistant；统一 handle/header、min-height:0 独立 scroll body、可选 footer。助手 conversation 可伸缩而 composer 稳定；Safe Area 独立 |

## AI 设置与助手

| # | 字段 | 结果 |
| --- | --- | --- |
| 26 | AI Settings new hierarchy | 当前服务、模型、紧凑能力、编辑、权限摘要、高级管理；无配置直接连接表单。六项权限、多服务、长隐私说明不铺首页 |
| 27 | Zhipu Base URL behavior | 普通智谱 GLM 隐藏既有 preset root；Custom 显示 URL；高级入口可编辑地址；无厂商核心绑定 |
| 28 | model selection behavior | 模型选择优先显式 GET /models 返回的精确 ID；手动 ID 始终可用，失败自动回退。保留列表外当前值并提示；无写死模型表、无自动请求 |
| 29 | Save & Test flow | 保存本地配置 → Chat → Tools → Vision 顺序探测；三项独立状态，部分失败不废弃配置。输入/root/key/model/子视图/close 均使旧请求失效；高级保留单项测试和仅保存 |
| 30 | capability UI | 对话/FitLog 数据/图片识别紧凑显示；supported/unsupported/unknown 各自独立；暂未验证不会错误地获得业务工具权限 |
| 31 | permissions UI | 独立二级视图，六读权限+write proposals，真实 checkbox role=switch、安静 accent-mid、可键盘操作、整行触摸；既有注册表与事务鉴权保持 |
| 32 | AI Assistant redesign | 简洁 header/可读 provider-model、轻量设置/清空图标、compact chat-only notice、两列 suggestions、soft user/透明 assistant、紧凑 error card、固定宽度 Send/Stop；Camera/IME/near-bottom/session 保留 |
| 33 | HTTP 400 behavior | 固定安全提示：请求参数无效，请检查模型名称和接口兼容性。401/403/404/429/5xx/timeout/network/CORS/abort 仍分别处理 |
| 34 | safe provider error behavior | 不显示 raw body/JSON/request/Authorization/key；保持既有响应/错误边界与 Vision 明确不支持判断。未开启可选 raw diagnostics。文字用 textContent |

## 视觉系统

| # | 字段 | 结果 |
| --- | --- | --- |
| 35 | visual-system changes | `primitives.css`/`interaction.css`/`sheets.css` 负责公共规则，domain CSS 保持内容布局；删除冲突的旧交互/高度规则，主 CSS 按功能分区；标题/正文/元数据更统一 |
| 36 | accent usage changes | Secondary、管理图标和训练次要动作采用中性色；Fresh Green 保留 Primary/selected/semantic marks；营养与 Calendar 类别色不变 |
| 37 | radius scale | 控件12–14px，卡片/分组16–18px，Sheet26px，confirm24px；pill/circle 留给日期、状态、类别和计时几何 |
| 38 | shadow usage | 两档 token；浮层/toast/menu 与轻量选中/导航使用阴影；常规 cards/grouped rows 平面安静边框，无三重装饰 |
| 39 | button hierarchy | Primary lime/dark ink，Secondary neutral，Tertiary quiet text/icon，Danger coral + 明确终态确认；小删除/reorder/summary 提升44px，320px Calendar 保证七列触摸空间 |
| 40 | input focus style | ≥16px 编辑文字，单层安静 border，无3px glow；键盘2px ring。原生 text selection、缩放、ARIA/pressed/selected 保留 |

## Automated Verification

| # | 字段 | 结果 |
| --- | --- | --- |
| 41 | tests / test files | 实际基线377 tests/38 files；最终384 tests/39 files PASS。新增 modality/viewport/static regression/visual/native boundary 和 HTTP400 覆盖；既有 AI/Tools/Proposals/Vision/Sync/Date/Nutrition/历史快照/frozen V7 全部 PASS |
| 42 | typecheck | npm run typecheck PASS |
| 43 | build | npm run build PASS；git diff --check PASS |
| 44 | Pages build | GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build PASS |
| 45 | JS/CSS bundle | JS662972B / Vitegzip212.52kB；CSS101276B / Vitegzip18.17kB；precache17entries/781.65KiB；无新依赖 |

本地自动浏览器使用320×812、375×812、390×844、430×932，五个脚本均 PASS：Interaction Stabilization、AI Assistant、Food Vision、Shared Date Picker、GitHub Sync Safety。均为独立合成记录/图片/凭据和 mock Provider。截图人工检查修复了 AI 权限摘要的分行布局和未验证助手文案；没有把模拟键盘当作物理 Safari 验收。

### Pages asset identity

| Asset | Bytes | SHA-256 |
| --- | --- | --- |
| index-NzqvkQaX.js | 662972 | 477d82869d30fb193b8a479dec2bff473d1377b660e5428d3ebce746d123688f |
| index-C3VM3X0K.css | 101276 | 2007bba0d1e0ed695ee8440bea85b61693098967dfee4cc82391c0ce1451fbad |

## Production Verification

| # | 字段 | 结果 |
| --- | --- | --- |
| 46 | Actions | [36986639166](https://github.com/king-640-060/fitlog-lite/actions/runs/36986639166) SUCCESS，head4a83b1178f56e53aaafaa2ebe2c2bf876a1f2582；中间提交因 concurrency 被后续提交取消；最终报告提交的 Actions 结论见交付消息 |
| 47 | production QA | 390×844 /430×932 的 Interaction/Assistant/Vision/DatePicker/Sync 五脚本全部 PASS；主要 Sheet、五主视图/Progress、touch/keyboard、模型/部分失败/400/Stop/提案均通过；无 page errors；线上 JS/CSS bytes/SHA-256 与 Pages build 完全一致 |
| 48 | cross-deployment data preservation | PASS：同一持久合成浏览器档案，部署前后 fitlog-lite-db V7 /14stores /15records 完全一致；after 为 readonly，先确认运行的 JS 文件正是当前 Pages 构建，再逐记录比较；旧 Service Worker 下实际新版本，未重置 DB |

## Manual Device Verification

| # | 字段 | 结果 |
| --- | --- | --- |
| 49 | physical iPhone Safari status | Pending；没有可接入的真实 iPhone，未把 Chromium touch/VisualViewport 模拟写成已通过 |
| 50 | standalone PWA status | Pending；未实际安装/检查 iPhone standalone。自动构建/Service Worker 升级是独立已验证类别 |
| 51 | remaining known risks | Real Provider Pending（无真实 key）；物理 Safari/PWA 键盘、Safe Area、快速开关、camera/album return 待设备确认；已有 >500kB JS warning 保留 |
| 52 | DB / Backup / Restore / Sync / AI versions | fitlog-lite-db / DexieV7 /14stores；BackupV7；RestoreV1–V7；SyncEnvelopeV1；AIConfigV1；AISystemPromptV1；FoodVisionPrompt/extractionV1；无 DB migration/schema/package/frozen-fixture 改动 |

### 设备上的六项核对

1. 打开主要 Sheet：X 无绿色圈，触摸后无残留框。
2. Task/Food/AI 输入：键盘出现/收起不跳；最后字段与保存可达。
3. 快速开关 Sheet：无闪屏、没有背景穿透、位置正确恢复。
4. AI 设置：模型/权限/高级页滚动正常。
5. AI 助手：composer/Send/Stop/Safe Area 可见，Enter/中文输入正常。
6. 包装识别：相机/相册返回、旋转、预览和退出正常。

## ChatGPT Baseline

Read AGENTS → LATEST_DEV_REPORT → UI_INTERACTION_SPEC → INTERACTION_VISUAL_SYSTEM, plus AI_ARCHITECTURE for AI changes. Application END is832f812aef96d0238dc93dbc6339e10f883f5c09; current report follow-up identifies the published main. Shared modality/focus and native Sheet lifecycle/viewport replace all private sheet keyboard logic. Pointer focus is quiet, keyboard2px, initial title focus, no global scale/page/ring/count/chart replay/backdrop blur. AI settings is current-service-first with permissions/advanced subviews, exact models/manual fallback and independent Save-and-Test. Assistant keeps the unchanged execution contracts with compact status/error UI. Fresh Green uses neutral secondary controls and flat cards. 384tests/39files PASS; production mock QA and exact14-store preservation are separate from physicaliPhone/realProvider Pending. DBV7/BackupV7/RestoreV1–V7/SyncV1/AIConfig+PromptsV1 unchanged.
