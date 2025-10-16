# Copilot Instructions for this Repo

極簡、純前端、無框架的 TypeScript 專案。以自訂元素渲染一言內容，保持「無 runtime 相依」與 IIFE 輸出。請遵守下列既有模式與資料流，避免引入框架或重構為多檔案執行期。

## 架構與資料流（關鍵檔案）

- 入口與元素：`main.ts` 僅匯入 `./TextMeta`、`./HitokotoMeta` 以註冊自訂元素；各元素在 `connectedCallback` 自行渲染，沒有全域 orchestrator。
- 渲染位置：自訂元素本身 `hidden`，渲染結果插在元素「後方」而非元素內部；產出節點帶 `data-from_uuid`、`data-from_index` 以便清理。
- `<text-meta>` 資料格式（逐行 CSV-like）：`text, from, from_who, cite`。
  - 預設值：`from_who=「佚名」`、`from=「未知」`。
  - 轉出：`<blockquote title="${from_who}(n.d.).${from}."><div>{text}</div></blockquote>`；若有 `cite` 則設為 `blockquote.cite`。
- `<hitokoto-meta>` 內容：以逗號或空白分隔 UUID；每個元素各自處理並插入在該元素後方（未跨元素聚合）。

## 建置與輸出

- 指令：`pnpm run build`（`tsc ./build.mts && node ./build.mjs`）。
- esbuild（見 `build.mts`）：`format: iife`、`platform: browser`、`target: ESNext`、`sourcemap: true`、`minify: true`。
- 目前 entryPoints：`main.ts`、`TextMeta.ts`、`HitokotoMeta.ts`（會輸出多個 IIFE 檔案，例如 `main.js`、`TextMeta.js`、`HitokotoMeta.js`）。網頁通常只需引用 `main.js`。

## 認證注入（Hitokoto）

- 變數：`HITOKOTO_EMAIL`、`HITOKOTO_PASSWORD`。
- 注入來源優先序（`HitokotoMeta.ts` 中的 `resolveCredential`）：
  1. build-time define 常數；2) `globalThis[NAME]`；3) `process.env[NAME]`。
- 缺少任一值：跳過遠端一言流程（僅本地 `<text-meta>` 渲染）。

## 外部 API 與渲染規則

- 登入：POST `https://hitokoto.cn/api/restful/v1/auth/login`（`URLSearchParams`）→ `data[0].token`。
- 句子：GET `.../hitokoto/{uuid}`（Bearer token）→ `<blockquote cite="https://hitokoto.cn/?uuid={uuid}" title="${from_who}(n.d.).${from}.">` 並在 `<div>` 放入 `hitokoto`。
- 評分：GET `.../hitokoto/{uuid}/score` → 若有 `score` 於 `<div>` 末尾附上 `<sub>{average}</sub>`；若回應為「很抱歉，句子不存在或评分未创建」且 `status === -1`，顯示 0。

## 變更與擴充準則

- 請維持：自訂元素渲染、插入點「在元素後方」、標記 `data-from_uuid` 以支援清除；不要將渲染內容放進元素內部。
- 保持無框架、無 runtime 相依；避免搬移檔案/目錄或引入額外 bundler/runtime。
- 若新增需要 build-time 注入的常數：
  - 在 `build.mts` 的 `defs` 增加 key；
  - 在使用處比照 `resolveCredential` 模式提供 define/globalThis/process.env 三路讀取；
  - 型別放在 `api/*.d.ts`（若為 API 回應）。
- 範例與手測：`test.http` 提供 login/quote/score 範例；核心型別見 `api/*.d.ts`。

若後續實作與本檔出現落差（例如資料欄位順序、插入點或 API 回應處理），請優先更新本檔以對齊現況，避免 AI 代理套用過時規則。
