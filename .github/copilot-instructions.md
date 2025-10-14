# Copilot Instructions for this Repo

這是一個極簡、純前端的 TypeScript 專案，用自訂 HTML 標籤渲染 Hitokoto 內容。請維持單一 IIFE 輸出 `main.js`、不引入框架與執行期相依，並沿用既有 DOM/資料流模式。

## 架構與資料流（看 `main.ts`）

- 入口：`main.ts` → esbuild 打包成 `main.js`（IIFE, browser, ES2020, sourcemap）。
- 資料來源（僅限 `<body>` 直屬子節點）：
  - `<text-meta>`：每行 `text,from,from_who,cite` → 立即渲染。
  - `<hitokoto-meta>`：以逗號或空白分隔的 UUID 清單 → 先登入取 token，再拉句子與評分。
- 執行順序：`text_main()` 先、`hitokoto_main()` 後（順序不可改）。

## 建置與環境注入

- 指令：`pnpm run build`（實作為 `tsc ./build.mts && node ./build.mjs`）。目前沒有 `dev` 腳本。
- `build.mts` esbuild 參數：`format: iife`、`platform: browser`、`target: es2020`、`sourcemap: true`。
- 認證變數：`HITOKOTO_EMAIL`、`HITOKOTO_PASSWORD` 會由 `build.mts` 自 `.env`/`process.env` 注入至 define。
- 取值優先序（`resolveCredential`）：define → `globalThis[NAME]` → `process.env[NAME]`。缺認證時，僅執行本地文字渲染。

## DOM 規約與渲染模式

- 僅選取 `body > text-meta` 與 `body > hitokoto-meta`，資料標籤本身不渲染。
- `<text-meta>`：逐行產生 `<blockquote>`，內容為 `<div>{text}</div>`；
  - `from` 預設為「无名氏」，`cite` 若存在則設為 `blockquote.cite`；
  - `title` 格式：`${from_who}(n.d.).${from}.`；插入位置：緊接在該 `text-meta` 後方。
- `<hitokoto-meta>`：每個 UUID 產生一個 `<blockquote>`，內容為 `<div>{hitokoto}</div>`；
  - `cite` 固定為 `https://hitokoto.cn/?uuid={uuid}`，`title` 為 `${from_who}(n.d.).${from}.`；
  - 插入位置：在「第一個」`<hitokoto-meta>` 後方；評分 API 命中時於 `<div>` 末尾附加 `<sub>{average|0}</sub>`。

## API 介面（以 `fetch` 呼叫）

- 登入：`POST https://hitokoto.cn/api/restful/v1/auth/login`（URLSearchParams body）→ 回傳 `data[0].token`。
- 句子：`GET https://hitokoto.cn/api/restful/v1/hitokoto/{uuid}`（需 Bearer token）。
- 評分：`GET https://hitokoto.cn/api/restful/v1/hitokoto/{uuid}/score`；
  - 若回應訊息為「很抱歉，句子不存在或评分未创建」且 `status === -1`，視為 0 分；否則顯示 `score.average`。

## 擴充與在地慣例

- 保持單檔 IIFE；勿移動檔案/目錄，`tsconfig.json` 假設 `outDir: "."`。
- 新增環境變數時：在 `build.mts` 的 `defs` 陣列加 key，並透過 `resolveCredential(name)` 讀取。
- 嚴格沿用選取器與切分規則（`body > ...`、UUID 以逗號/空白切分；`text-meta` 逐行 CSV-like）。

## 開發者工作流與範例

- 安裝與建置：`pnpm install` → `pnpm run build`，以 `<script src="./main.js">` 在靜態頁測試。
- 介面測試：`test.http` 提供 login/quote/score 範例；型別位於 `api/*.d.ts`。

若上述描述與實作出現出入（API 或標籤格式變更），請更新本檔以維持與程式一致。
