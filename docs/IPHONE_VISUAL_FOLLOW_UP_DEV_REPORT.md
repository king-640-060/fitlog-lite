# FitLog Lite Development Report

## Physical iPhone Visual Follow-up — 2026-10-03

本轮仅两处生产 CSS 变化：Workout 专页全宽 CTA；Today unset 热量圈对比度。维护相应 durable rules 和浏览器回归。未改 Plan/Management/Today Workout/Food，也未改数据库、业务或 AI 引擎。

## 56项交付记录

| # | 项目 | 结果 |
|---|---|---|
| 1 | START_COMMIT | 373295e777fbc9bfce925024d7c9557c1989d15b |
| 2 | IPHONE_VISUAL_FIX_COMMIT / END_COMMIT | d9225cea0667d1d0af440340fdefb7570d1812d8 |
| 3 | REPORT_COMMIT | 本报告提交；外部最终报告记录完整 SHA |
| 4 | main HEAD | 本报告提交；发布后精确验证 |
| 5 | production HEAD | 本报告提交对应 Pages 部署；外部最终报告记录完整 SHA |
| 6 | Workout 原问题 | 专页三个 compact/right-aligned CTA 在实体 iPhone 上显得漂浮、卡片底部留白割裂。 |
| 7 | Workout 最终 CTA geometry | 同一 training-card family：width100%、min-height48px、stretch、radius14px、padding0 16px；原10px间距不变。 |
| 8 | Strength CTA | 390px实测 324×48px；lime primary；开始力量训练 / 继续训练。 |
| 9 | Cardio CTA | 390px实测 324×48px；secondary；记录训练 / 再记一次。 |
| 10 | Kegel CTA | 390px实测 324×48px；secondary；开始训练。 |
| 11 | Cardio recent-link layout | 现有最近记录入口保留在 CTA 后，10px grid gap；单次、多次、recent-link 状态通过。 |
| 12 | open Workout layout | 继续训练为同样全宽 CTA，正在记录摘要保留；自动保存、进入编辑器逻辑未改。 |
| 13 | Today Workout action | 查看训练 compact secondary、继续力量训练 compact primary；width小于卡片内容宽度、44px、右对齐断言通过。 |
| 14 | Plan | 运行时代码、CSS完全未改；空态单 inline Add、非空 header+ 回归通过。 |
| 15 | Management | 运行时代码、CSS完全未改；section footnote、fresh-open/reopen scrollTop0回归通过。 |
| 16 | Today ring 原始 computed style | {'stroke': 'rgb(228, 230, 220)', 'opacity': '0.55', 'dash': '3px, 7px', 'strokeWidth': '8px'} |
| 17 | Today ring 新 computed style | {'stroke': 'rgb(126, 137, 126)', 'opacity': 0.85, 'dash': '3px, 7px', 'strokeWidth': '8px'} |
| 18 | Today unset stroke | var(--text-tertiary)，当前主题 rgb(126, 137, 126)；中性灰绿，非进度 accent。 |
| 19 | Today unset opacity | 0.85 |
| 20 | Today dash pattern | 3px, 7px；stroke-width8px，未改。 |
| 21 | Today active progress | 未改：var(--accent-mid)，computed rgb(127, 154, 52)；目标状态 track原border/opacity1。 |
| 22 | Food ring | 完全未改：无目标 Food 卡片前后358×332像素截图完全一致。 |
| 23 | Food computed style 对比 | 前 {'stroke': 'rgb(126, 137, 126)', 'opacity': '0.65', 'dash': '3px, 7px', 'strokeWidth': '8px'}；后 {'stroke': 'rgb(126, 137, 126)', 'opacity': 0.65, 'dash': '3px, 7px', 'strokeWidth': '8px'} |
| 24 | calorieGaugeHtml | src/main.ts完全未改；helper/SVG/数字/位置/caption/计算无重构。 |
| 25 | 320px | 320×812 PASS；三 CTA254×48px；Today/Workout截图检查。 |
| 26 | 390px | 390×844 本地和生产 PASS；三 CTA324×48px。 |
| 27 | 430px | 430×932 本地和生产 PASS；三 CTA364×48px。另375px三 CTA309×48px。 |
| 28 | 120% font | 本地四宽度、生产390/430 PASS；文字不溢出。 |
| 29 | 140% smoke | 本地四宽度、生产390/430 PASS；开始力量训练仍单行，实际高度48px，无裁字。 |
| 30 | Workout empty screenshot | semantic-{local/prod}-390-workout-empty.png；另原生视口top/bottom及三卡片逐一截图。 |
| 31 | Workout populated screenshot | semantic-{local/prod}-390-workout-one-completed/multiple/open.png；另三卡片逐一截图。 |
| 32 | Today unset screenshot | semantic-{local/prod}-390-today-unset.png；iphone-detail-{local/prod}-390-today-unset-card.png。 |
| 33 | Today target screenshot | semantic-{local/prod}-390-today-below.png；iphone-detail-{local/prod}-390-today-target-card.png。 |
| 34 | Food comparison screenshot | iphone-baseline-390-food-card.png 与 iphone-detail-local-390-food-unset-card.png 像素一致；生产Food截图另存。 |
| 35 | manual visual inspection | 人工读取当前截图：本地320/390/430 Workout empty/completed/multiple/open/120/140，Today unset/target，Food；390逐卡/目标对比和生产390截图。三 CTA横向节奏统一，secondary可点击；Today neutral圈可见且弱于active arc。fullPage固定nav可能出现在拼接中部，另用真实视口top/bottom和逐卡截图核对。 |
| 36 | baseline tests | 495 tests /46 files PASS，本轮实际 npm test。 |
| 37 | final tests | 495 tests /46 files PASS，本轮实际 npm test。 |
| 38 | typecheck | npm run typecheck PASS。 |
| 39 | build | npm run build PASS。 |
| 40 | Pages build | GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build PASS。 |
| 41 | diff-check | git diff --check PASS。 |
| 42 | browser suites | 全部11套，本地320/375/390/430及生产390/430 PASS：uiSemanticConsistency、uiQualityAudit、mobileLayout、interactionStabilization、aiStreaming、aiAssistant、aiVoice、aiDualModelRouting、foodVision、sharedDatePicker、githubSyncSafety。semantic40状态/宽度=本地160、生产80。 |
| 43 | AI regressions | Streaming/Assistant/Voice/Dual model 全部 PASS；合成 Provider/凭据，不代表真实 Provider。 |
| 44 | Sheet regression | interactionStabilization共享Sheet/focus/keyboard/toolbar/scroll/rapid lifecycle PASS。 |
| 45 | Food Vision regression | foodVision PASS；图片/解析/确认/历史快照边界未改。 |
| 46 | GitHub Sync regression | githubSyncSafety PASS；加密/冲突/确认/保留数据边界未改。 |
| 47 | DB version | fitlog-lite-db；DexieV7，浏览器IDB version70。 |
| 48 | stores | 14，未改。 |
| 49 | Backup version | V7，未改。 |
| 50 | Restore versions | V1–V7，未改。 |
| 51 | Sync version | V1，未改。 |
| 52 | migration status | No migration；业务源文件完全未改。旧持久合成14store/15row及AI配置/key跨发布哈希一致；SW升级、offline冷启动PASS；未重新播种。 |
| 53 | Actions | 应用Actions 37085897715 SUCCESS；Pages deployment 6821577743 SUCCESS，exact SHA d9225cea0667d1d0af440340fdefb7570d1812d8。报告部署回执在外部最终报告。 |
| 54 | production verification | 390×844/430×932全11套、重新截图、JS/CSS精确比对 PASS；生产地址 https://king-640-060.github.io/fitlog-lite/ 。 |
| 55 | physical iPhone recheck status | Pending：需要用户在现有Safari/原安装PWA上复核两处；本轮未操作实体iPhone。 |
| 56 | remaining risks | 实体Safari/PWA视觉尚待复核；已有>500KB bundle警告仍在。无未解决自动化/生产失败。真实Provider/语音/外部启动器不属于本轮验证。 |

## Automated / Production / Manual categories

Automated与Production结果见36–54项；实体设备Pending见55项，两者不能互相替代。原始日志、computed样式回执、截图和人工检查拼图存于外部 artifacts/iphone-visual-follow-up。所有浏览器写入仅发生在独立合成上下文；数据保留检查只操作既有合成持久profile。

## ChatGPT Baseline

读取AGENTS→LATEST→UI specs。Workout专页三CTA为统一全宽48px/14px，Strength primary、Cardio/Kegel secondary；Today导航保持compact44px。Today unset track独立text-tertiary/.85，Food仍.65，active accent-mid/共享SVG/计算不变。Plan和Management上一轮修复保留。DBV7/14stores/BackupV7/RestoreV1–V7/SyncV1，无migration。本地与生产11套回归PASS；实体iPhone复核Pending。
