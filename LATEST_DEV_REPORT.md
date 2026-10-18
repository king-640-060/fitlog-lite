# FitLog Lite Development Report — 今日饮水按钮最小视觉修复

日期：2026-10-18。用户直接批准局部修复，无需新原型。已完成最小产品改动、实际前后视觉/计算样式检查、必要回归及Application正式部署验证。实体iPhone与ChatGPT独立验收保持Pending。

## Git与发布身份

- START：`57a58bfe32114af32a8b9fe19afe6b3fbb9e7f93`；干净main，fresh fetch与ff-only pull后记录，提交前再次核对远程。
- Application：[`369ac3207eae073f80befce5620371db51524d86`](https://github.com/king-640-060/fitlog-lite/commit/369ac3207eae073f80befce5620371db51524d86)，正常非强制推送main。
- [Application CI / Pages](https://github.com/king-640-060/fitlog-lite/actions/runs/39100496745)：success，typecheck、1081项单测、production build及Pages deploy成功。[正式站点](https://king-640-060.github.io/fitlog-lite/)。
- 本文件为Application实测后的唯一报告专用END改动。自身END SHA/CI/线上身份只能提交后再次核验，由本轮最终回执记录，不预先宣称自身CI成功。新聊天实际fetch [main](https://github.com/king-640-060/fitlog-lite/commits/main/)恢复最终身份。

## 最小产品改动

仅两个产品文件：`src/ui/recovery.ts`把饮水按钮从`text-btn water-expand-toggle`替换为`secondary today-activity-action water-expand-toggle`；`src/styles/recovery.css`删除一条专用min-height/padding/font-size/nowrap重复规则。`water-expand-toggle`的排列、6px箭头间距与90/270度展开旋转保留。`main.css`及统一按钮、全部事件/服务逻辑、趋势、报告、区间删除和数据格式均未改。

不能只叠加class：`text-btn`与`secondary`存在同级默认背景/内边距优先级，且text-btn另有按压透明背景/opacity规则；移除旧类后由现行今日操作层提供配色、字体、圆角、尺寸与交互状态。

390/100两引擎实测：浅色背景transparent→rgb(233,240,220)，深色transparent→rgb(48,65,42)；左右padding4/0→11/11px，字号13→14px，字重650→700；圆角12px、最小触控高度44px。收起/展开视觉属性一致；正常/按压/禁用/键盘焦点与体重、空闲睡眠、训练三个同级操作逐属性一致。按钮保持右侧；320/200%信息自然换行，未裁剪或盖住箭头。

## 本轮实际验证

- `npm run typecheck`、`npm test` **1081/1081，75文件**、生产base构建PASS；App干净构建local=false，原有chunk-size advisory保留。未修改任何既有测试或断言。
- 新`todayWaterButton.mjs`：本地双引擎32显示上下文（320/390/430/844×100/200%×深浅），正式App线上同样32上下文PASS；默认收起、真实触摸展开→500ml→精确Undo→收起、右侧位置、文字/箭头、必要显露、布局锚点、全部22表精确恢复，390/100另查按压/禁用/键盘焦点。修复前双引擎390/100深浅共4上下文单独保留。
- 必要既有浏览器回归5条PASS：完整uiQualityAudit（4宽×144场景）、完整uxWaterCascade双引擎（各30上下文）；jointUxReportsRange双引擎为明确ONE定向模式，各18高度组、9部位7→30→90→7最大差0px，并覆盖两报告/危险删除/回滚/并发。未把上一轮44条命令或60上下文全矩阵沿用成本轮执行。
- 279个既有源码/夹具/批准基准逐文件检查：仅允许上述HTML class及一条CSS删除；复原两处文本后与START字节相同，事件处理与业务逻辑未变。16个既有fixture及所有批准原型未改。Markdown链接、git diff --check与提交范围PASS；归档TXT只清理行尾空白，原始日志保留。
- 原合成profile未reset/reseed，发布前、Application重开/离线的22表hash均为`049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a`，8配置hash均为`609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34`。App与执行SW=Application，离线冷启动PASS。DB13/IDB130/22表、Backup14/Restore1–14/Sync1/envelope1不变，未操作个人业务数据。
- Application正式JS/CSS/SW精确字节、precache、build-info与本地干净构建一致，local=false；线上样式/触摸流程32上下文与原档案验证通过。END只改报告，之后重复核对精确资源、App/SW及同一合成档案/离线，最终值见交付回执。

## 实际对照证据与已知边界

[本地证据说明](design/qa/2026-10-18-today-water-button/README.md)、[156行computed style对比](design/qa/2026-10-18-today-water-button/computed-style-comparison.csv)、[修复前原始结果](design/qa/2026-10-18-today-water-button/before-receipt.json)、[修复后32上下文](design/qa/2026-10-18-today-water-button/after-receipt.json)。本地候选meta仍为START、local=true，未称为生产图。正式Application的真实线上截图/32上下文、两次CI及END完整证据在本聊天`outputs/water-button-2026-10-18/`最终回执；原始工作档案在`work/water-button-2026-10-18/`。

滚动不得混报：展开/成功记录的必要显露及布局锚点通过；Chromium390 Undo位移0，WebKit390修复前后均观察到-128px，未确认底层原因。本次未新增该变化，也未改共享Toast。初版新增审计假设Undo绝对0，在原版同样失败，原始失败保留；最终严格比较同引擎/主题改前后位移，并保留无新增scrollBy/锚点/数据断言。不能声称所有浏览器撤销绝对零滚动。

## Pending与新聊天基线

实体iPhone Safari、用户原安装PWA、VoiceOver、真实键盘/Safe Area和个人历史数据连续性未由本轮真人验证；ChatGPT独立核查Pending。浏览器/合成profile不替代这些证据。旧F1–F5用户结案和联合v0.3结果保持，不重新打开已通过开发任务。本轮只修按钮视觉，已完成后停止开发，等待ChatGPT独立核查。
