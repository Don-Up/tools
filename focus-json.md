# focus-json.html

## 用途

粘贴 `{ "英文": "中文", ... }` 形式的 JSON,逐条聚焦展示。深色主题、超大字体,`←` / `→` / `↑` / `↓` 切换条目。

打开 `focus-json.html` → 按 `Ctrl+V` 粘贴 JSON → 第一条 EN 大字号置顶、CN 小一号置底 → 箭头键翻看其它条目。不持久化内容,刷新即清空。

## 输入格式

普通 JSON 对象,键为英文、值为中文。键值都会被 `String()` 强制转字符串,所以数字 / 布尔 / null 也会被接受并渲染。

不支持数组、不支持嵌套对象、不支持数组形式 `[]` —— 这些会被识别为错误并显示红字。

## 示例

```json
{
  "The export tasks finally have a home in the UI": "导出任务终于在前端有自己的页面了",
  "Users can now open `/exports`": "用户现在可以打开 `/exports`",
  "see a paginated table of export jobs filtered by status": "看到按状态筛选的导出任务分页表",
  "switch status from a dropdown": "从下拉框切换状态",
  "and paginate through results": "并翻页浏览结果",
  "all read-only": "全部只读",
  "no retry / download / create yet": "暂不支持重试 / 下载 / 创建",
  "Stage 1.10 wired up `exportApi.{columns, create, list, detail, retry}` and 7 domain types": "Stage 1.10 打通了 `exportApi.{columns, create, list, detail, retry}` 和 7 个领域类型",
  "those contracts are now consumed end-to-end inside the browser for the first time": "这些契约现在首次在浏览器内被端到端消费"
}
```

## 快捷键

- `←` / `↑`: 上一条(到达第一条后不再移动)
- `→` / `↓`: 下一条(到达最后一条后不再移动)
- 无循环

## 错误显示

- `JSON 解析失败: <message>`: JSON 语法错
- `输入不是 JSON 对象`: 输入是数组 / 数字 / null
- `没有解析到任何条目`: `{}` 空对象

任何错误状态下重新粘贴合法 JSON 都会替换错误显示。
