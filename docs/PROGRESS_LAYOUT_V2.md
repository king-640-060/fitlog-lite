# Progress 布局回归修复 v2

用户于2026-10-29授权[修复指令v2](../design/reference/2026-10-29-progress-layout-v2/FitLog_Lite_v09_Progress_Layout_Regression_Fix_Spec_v2.md)。只修已批准v0.9的Progress布局；唯一[原型](../design/reference/2026-10-26-interaction-v09/prototype/fitlog_interaction_v09_APPROVED.html)及SHA256保持。

## 根因与修复

- BUG-P01：localDeck预备态隔离ID，月头三个按钮遗漏已存在CSS支持的data-navigation-id；下一月箭头变成自动布局，今天变静态。添加稳定属性，保留ID/ARIA/事件/隔离/原DOM晋升。
- BUG-P02：日报日期同样只带ID，预备态失去居中和字号规则。添加稳定属性复用原规则。相关Progress ID样式审计仅发现这四个实际布局选择器；其他主Tab不改。
- UX-P03：趋势/日历首屏原无顶部间距；报告类型继承segmented的12px顶部margin；周期叶轨道没有日期间距。一级stage唯一拥有14px，限定报告类型margin-top为0，保留margin-bottom12px，日期轨道margin-top12px。三层高度探针测量实际轨道margin，最低保留44px内容及20px内底留白，底栏reserve继续读app-frame实际样式。

产品改动只有src/main.ts与src/styles/approvedInteraction.css；主Tab/localDeck/图表/报告算法/服务/数据库/依赖/冻结fixture/旧原型不改。备份合同继续DB13/IDB130/22表、Backup14/Restore1–14、Sync/envelope1。

## 验证边界

[本轮QA](PROGRESS_LAYOUT_V2_QA.md)区分旧版预期FAIL、新版自动化、真实Pages和实体设备。原指令引用的录屏未随本条请求提供，不声明观看；缺陷由冻结START负例独立复现。Chromium CDP原生触摸与WebKit合成touch事件明确区分；系统键盘、Safe Area、VoiceOver、原安装iPhone PWA及个人数据仍Pending。已知WebKit饮水Undo −128px未修复。

## 回滚

如独立核查发现阻断：正常revert本轮Application（保留证据），重新执行类型/单测/构建、相关浏览器门槛及新提交CI/Pages/App/SW/离线/同合成profile检查，再按协议END。禁止reset远程、强制推送、清库或用旧SW覆盖新数据。回滚只撤销布局，不迁移/删除业务记录。
