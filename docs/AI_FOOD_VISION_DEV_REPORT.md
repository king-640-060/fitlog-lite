# FitLog Lite Development Report — Food Packaging Vision

## 状态：本地实现已验证，待补齐需求后发布

收到的需求附件共有 686 行，在第 21 节 JSON Parsing 的完整 JSON fence 示例开头（`json …`）处结束。已通过异步问题请求补贴后续内容，目前尚未收到。以下是已收到需求及核心场景的可独立实现部分，不代表缺失验收项已经完成。没有 push 或触发本轮生产部署。

| 字段 | 当前结果 |
| --- | --- |
| START_COMMIT | `a677eca53d2653c7764b845b365d075dced2481a` |
| LOCAL_IMPLEMENTATION_COMMIT | `6c99796f2147d20c3f7baeee234361433ff1ee67` — Add reviewed food packaging vision import |
| END_COMMIT | Pending：尚无本轮已发布应用提交 |
| REPORT_COMMIT / local main HEAD | 此报告的独立文档提交；用 `git log -1 --format=%H -- docs/AI_FOOD_VISION_DEV_REPORT.md` 解析 |
| remote main / production baseline | `a677eca53d2653c7764b845b365d075dced2481a` |
| Production | https://king-640-060.github.io/fitlog-lite/ |
| 本轮 Actions | 未触发；未宣称新增功能已在生产可用 |

开始时 main 工作区干净。按要求执行 status、branch、pull、log；pull 遇到 GitHub TCP 超时，随后 GitHub API 独立确认远端 main 与本地 HEAD 精确一致。工作从该实际基线开始，没有重置数据库或使用真实用户数据。

## 已实现

- 原 Profile → AiClient → OpenAICompatibleChatAdapter 架构增加多模态 content parts，文本及工具请求兼容。仅允许本地处理后的 JPEG 和本地 PNG 测试图；拒绝任意远程、file、blob、script、SVG 图片地址。
- AI Config 仍 V1，optional visionCapability 独立于 toolCapability；旧配置读取为 unknown。API root/model/key 修改重置两项能力。配置卡显示对话、工具、图片状态，保留旧测试按钮并增加“测试图片识别”。本机生成白底 731 测试图，准确返回数字才验证成功；明确图片不支持才判定 unsupported，网络/HTTP/超时或错误数字仍待验证。
- 食物库、四餐记录入口和全局助手相机按钮共用 showFoodVisionImport。进入时捕获本地日期及餐次，其他页面的全局入口用 Today。选择图片不发网络请求，明确识别动作及图片同意后才发送给当前 Provider。
- 本地 Canvas 解码/缩放/重新编码 JPEG，剥离源元数据；3 张同产品图片、原图 15 MiB/张、6000 万像素、长边 1600px、输出 1 MiB/张。检查 raster 文件头，HEIC 依赖浏览器原生解码。图片留在内存并在关闭/成功后释放。
- 独立 Vision Prompt V1 和 analyzeFoodPackageImages 单次请求，无 agent tools/history/FitLog 业务数据。严格格式及版本解析，允许一个完整 JSON fence；拒绝额外字段、字符串/百分比数值、非有限/负数、未知单位、过长结果。关键 evidence 上限 100 字符，并检查数值及单位与 evidence 一致；这不证明模型没有猜测，最终用户核对仍必须。
- 可查看较大图片、展开包装原文、核对并编辑名称/品牌/基准重量/能量/三项宏量。看不清的宏量保持未知，不填零。每份保留真实基准克数；每包装只有明确净重量可作为整包基准；100mL/容量/未知重量不转换或猜测密度，需要用户填写对应实际克数。
- 包装核对与普通食物编辑均支持 kJ/kcal；本地严格按 4.184 换算，预览两种单位，Food/FoodLog 存 kcal，绝不按宏量 4/4/9 推算。普通编辑切换单位保持能量，不覆写历史日志。
- 核对勾选 → App 预览 → 明确确认。只保存食物不建日志，可继续按实际日期/餐次/克数记录。“保存并记录”调用现有 saveFood/logFood，两个 store 一个事务；失败回滚，不重复确认。未来事实饮食阻止写入。新增同名食物明确提示，不静默覆盖现有食品。
- 保存后继续记录会在事务中检查 Food 是否修改或删除；FoodLog snapshot 保留所确认的营养与名称。取消零写入，Stop/关闭取消识别，迟到的旧配置响应不能进入核对状态，刷新失败不把已成功保存误报为回滚。
- 使用现有 Sheet、共享日期选择器、16px 输入、VisualViewport 和 Safe Area，图片查看/日期子视图在同一 Sheet 内；未添加数据库表、SDK、OCR、后台、代理或依赖。

## Automated Verification

| Gate | 实际结果 |
| --- | --- |
| Vitest | **367 tests / 37 files PASS**；相对基线 335/35 新增 32 个用例及 2 个文件 |
| 新文件 | aiVisionFood.test.ts、foodVisionImport.test.ts；aiProfiles 增加能力兼容/重置用例 |
| Typecheck | PASS |
| Normal build | PASS |
| GitHub Pages build | `GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build` PASS |
| git diff-check | PASS |
| Food Vision browser | 320×812、375×812、390×844、430×932 PASS |
| Existing AI browser | 四种宽度 PASS |
| Shared Date Picker browser | 四种宽度 PASS，包括延迟标签创建焦点回归 |
| GitHub Sync safety browser | 四种宽度 PASS，均为模拟请求/合成记录 |
| Frozen preservation / migrations / reopen / populate / Restore V1–V7 / encrypted Sync | 全套测试 PASS |

新覆盖包含：多模态协议与 URL/大小/角色边界、独立 probe、错误分类、严格 JSON/证据/NRV/单位/基准检查、精确换算、未知宏量、取消/预确认零写入、双确认、实际 FoodLog 写失败导致 Food 回滚、源记录失效、快照不变及 V7 Backup/Restore。浏览器以生成的虚构标签图片与模拟 Provider 验证三个入口、预处理、图片查看、日期/餐次、保存后继续记录、错误/Stop、迟到配置响应、手动 kJ 编辑及安全文本。没有真实模型 OCR 质量结论。

### Pages bundle

| Asset | Bytes | Vite gzip | SHA-256 |
| --- | --- | --- | --- |
| index-BVBaSRe_.js | 649,026 | 207.98 kB | 43cf390b1a529fd04b5690310aa1a2a7024a4590a1fd962e43e67b8458e65045 |
| index-DSkAZsKR.css | 98,336 | 17.86 kB | 8e68f5d183c18be5f9ebf5edc7213f5fde6ad6c441c56dc244fc618c71bb370c |

PWA precache 17 entries / 765.16 KiB。既有 >500kB chunk warning 仍在；没有新增包。

## Production Verification

本轮没有发布，新增 Vision 的生产 QA 和 Actions 均 Pending。只读复验既有独立合成生产 profile：fitlog-lite-db / Dexie V7 / 14 stores / 15 个 frozen 合成记录精确保持一致。此结果验证当前基线，不能代替本轮上线后的验证。发布时继续使用既有 preservation profile 检查新入口生效后全量记录一致，再运行生产 390/430 mock UI 与资源哈希比较。

## Manual Device / Real Provider Verification

- Real Vision Provider：Pending；没有使用真实 Key、用户图片或业务记录。真实模型支持、CORS、识别准确性和收费待单独验证。
- Physical iPhone Safari / installed PWA：Pending；相机/照片库、HEIC、原图方向、软件键盘、Safe Area 和 standalone 需实体设备验证。

## Versions / Next Step

fitlog-lite-db；Dexie **V7 / 14 stores**；Backup **V7**；Restore **V1–V7**；Sync Envelope **V1**；AI Config **V1**；原 System Prompt **V1**；Food Vision Prompt **V1**。没有迁移、历史重算或用户数据清理。

下一步需要第 21 节之后的完整需求，核对差异并实现缺失验收项，然后按 AGENTS 流程发布 main、等待 Actions、验证生产并更新正式 END_COMMIT。已知架构限制为浏览器 BYOK/Provider CORS、原生 HEIC 支持差异、已有 bundle warning；未发现本地自动化回归。

## ChatGPT Baseline

Production main remains a677eca53d2653c7764b845b365d075dced2481a. Local implementation 6c99796f2147d20c3f7baeee234361433ff1ee67 adds shared Food packaging Vision, independent capability probe, strict evidence-backed JSON extraction, local Canvas JPEG processing, kJ/kcal conversion, human review and explicit atomic Food/FoodLog saving. 367/37 tests, typecheck, normal/Pages builds and four-size Vision/AI/DatePicker/Sync mock suites pass. No schema/dependency changes. Unpublished: attachment ends at section 21 / line 686 and the remaining specification is pending. Continue from these local commits without rebuilding from production; complete missing requirements, publish and perform production upgrade checks. Real Vision and physical iPhone Pending.
