# FitLog Lite

FitLog Lite 是一个仅供个人使用、本地优先的轻量健身日志。它可以记录饮食、训练和体重，并可安装为离线 PWA。没有账号、服务器、云数据库、第三方 API 或数据分析；所有业务数据均保存在当前浏览器的 IndexedDB 中。

## 功能

- 饮食记录：自定义食物、营养快照、克数编辑、热量与三大营养素汇总
- 食物库：新建、编辑、删除，以及 CSV/JSON 批量导入和重复项处理
- 训练记录：自定义动作、多动作、多组独立重量/次数/RPE、自动保存、历史编辑
- 体重记录：每日唯一记录、30 天/90 天/全部折线图、历史编辑
- 数据安全：完整 JSON 备份、事务式恢复、持久化存储状态
- PWA：可安装，应用 shell 与全部本地记录功能可离线使用

> 浏览器数据被清除后可能无法恢复，请定期导出备份。

## 本地运行

```bash
npm install
npm run dev
```

质量检查和生产构建：

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

## 数据与备份

数据保存在浏览器 IndexedDB 数据库 `fitlog-lite-db` 中。右上角打开“数据与设置”，可导出包含食物、饮食、动作、训练和体重的完整 JSON 备份；恢复时会先显示各类数据数量，并在二次确认后用单个事务替换当前数据。

## CSV 食物格式

支持英文或中文表头。`reference_g` / `基准克数` 为空时默认 100。

```csv
name,brand,reference_g,calories,protein,carbs,fat
鸡胸肉,,100,165,31,0,3.6
米饭,,100,116,2.6,25.9,0.3
```

```csv
名称,品牌,基准克数,热量,蛋白质,碳水,脂肪
鸡胸肉,,100,165,31,0,3.6
```

## GitHub Pages 部署

推送到 `main` 后，`.github/workflows/deploy.yml` 会自动执行依赖安装、类型检查、测试、生产构建并把 `dist` 部署到 GitHub Pages。Vite 会根据 `GITHUB_REPOSITORY` 自动使用项目仓库的 base path。
