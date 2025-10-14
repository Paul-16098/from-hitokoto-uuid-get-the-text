# from-hitokoto-uuid-get-the-text

一個極簡、純前端、無框架的 TypeScript 小工具。它會在瀏覽器端掃描 `<body>` 直屬的自訂標籤，將本地文字或 Hitokoto 服務的一言資料渲染成 `<blockquote>`，在可用時附上評分。輸出為單一 IIFE 檔案 `main.js`，無任何執行期相依。

## Project Name and Description

- 名稱：from-hitokoto-uuid-get-the-text（又名：Hitokoto Renderer）
- 目的：從 `<text-meta>` 與 `<hitokoto-meta>` 標籤取得資料，產生 `<blockquote>` 區塊；若有 Hitokoto UUID，會先登入以取得 token，再拉句子與評分並渲染。

## Technology Stack

- 語言：TypeScript（strict）
- 打包：esbuild（IIFE、browser、target: ES2020、sourcemap）
- 建置流程：以 `tsc` 編譯 `build.mts` → 執行產生的 `build.mjs` → esbuild 輸出 `main.js`
- 套件管理：pnpm（亦可使用 npm）
- 版本（取自 `package.json`）：
  - typescript: ^5.5.0
  - esbuild: ^0.25.0
  - @types/node: ^24.6.1

## Project Architecture

- 入口：`main.ts` → esbuild 打包成 `main.js`（IIFE, browser, ES2020, sourcemap）。
- 資料來源（僅限 `<body>` 直屬子節點）：
  - `<text-meta>`：每行 `text,from,from_who,cite` → 立即渲染。
  - `<hitokoto-meta>`：以逗號或空白分隔的 UUID 清單 → 先登入取 token，再拉句子與評分。
- 執行順序：`text_main()` 先、`hitokoto_main()` 後（順序不可改）。
- 評分 API 命中時於 `<div>` 末尾附加 `<sub>{average|0}</sub>`。

## Getting Started

### Prerequisites

- Node.js（建議 18+）
- pnpm（建議）或 npm

### Install and Build

```powershell
pnpm install
pnpm run build
```

`pnpm run build` 會執行 `tsc ./build.mts && node ./build.mjs`，產生 `main.js` 與 sourcemap。

### Environment Variables for Hitokoto

登入需要：

- `HITOKOTO_EMAIL`
- `HITOKOTO_PASSWORD`

注入優先序（`resolveCredential`）：define → `globalThis[NAME]` → `process.env[NAME]`。

範例 `.env`（可選）：

```dotenv
HITOKOTO_EMAIL=your-email@example.com
HITOKOTO_PASSWORD=your-password
```

### Use in HTML

在靜態頁以 `<script src="./main.js">` 引入，並僅於 `<body>` 直屬放置資料標籤：

```html
<text-meta>
  在遠方，朝陽正好,无名氏,,https://example.com 我亦無他，唯手熟爾,韩愈,,
</text-meta>
<hitokoto-meta>
  0d7ef1a8-b8b8-4b3b-b0b2-aaaaaaaaaaaa bbbbbbbb-cccc-dddd-eeee-ffffffffffff
</hitokoto-meta>
```

## Project Structure

```text
.
├─ .github/
│  └─ copilot-instructions.md     # 本專案的開發規約與資料流說明
├─ api/                            # Hitokoto API 回應型別（d.ts）
├─ build.mts                       # esbuild 腳本（以 tsc 編譯後執行）
├─ build.mjs                       # 由 build.mts 轉譯產生
├─ main.ts                         # 入口（打包輸出 main.js）
├─ main.js                         # IIFE bundle（瀏覽器端）
├─ main.js.map                     # sourcemap
├─ package.json                    # scripts 與 devDependencies
├─ tsconfig.json                   # TypeScript 設定（outDir: "."）
└─ test.http                       # REST 介面手動測試樣板
```

## Key Features

- `<text-meta>`：逐行 CSV-like 解析與渲染；`from` 預設「无名氏」，`cite` 會設為 `blockquote.cite`。
- `<hitokoto-meta>`：以逗號或空白分隔 UUID；登入後抓取句子與評分，插入在第一個 `<hitokoto-meta>` 後方。
- 評分顯示：若成功取得，於 `<div>` 後附加 `<sub>{average}</sub>`；若回應為「很抱歉，句子不存在或评分未创建」且 `status === -1`，顯示 0。
- 單檔 IIFE；無框架、無 runtime 相依，適合任意靜態頁面直接引入。

## Development Workflow

- 指令：
  - `pnpm run build` → `tsc ./build.mts && node ./build.mjs`
- 打包參數：`format: iife`、`platform: browser`、`target: es2020`、`sourcemap: true`。
- 認證變數由 `build.mts` 自 `.env`/`process.env` 注入至 esbuild define。
- 變更原則：保持單一 IIFE，不搬移檔案/目錄、避免引入框架與額外 runtime。

## Coding Standards

- 僅選取 `body > text-meta` 與 `body > hitokoto-meta`，資料標籤本身不渲染。
- `text-meta`：每行格式 `text,from,from_who,cite`；`from` 預設「无名氏」。
- `hitokoto-meta`：UUID 以逗號或空白切分；插入位置在第一個 `hitokoto-meta` 後方。
- `title` 格式：`${from_who}(n.d.).${from}.`；`cite` 固定 `https://hitokoto.cn/?uuid={uuid}`（遠端內容）。
- 新增環境變數時，請於 `build.mts` 的 `defs` 陣列補 key，並透過 `resolveCredential(name)` 讀取。

## Testing

- 目前無自動化測試。
- 建議以靜態 HTML 進行 smoke test：
  1. 設好 `.env` 的 `HITOKOTO_EMAIL`/`HITOKOTO_PASSWORD`；
  2. 執行 `pnpm run build`；
  3. 確認 `<blockquote>` 與 `<sub>` 依規渲染。

## Contributing

- 請參閱 `.github/copilot-instructions.md` 並遵守專案慣例：
  - 僅輸出單一 IIFE；不引入框架與額外 runtime，相依維持最小化。
  - 嚴格沿用 DOM 選取器與資料切分規則；插入點與屬性必須一致。
  - 小步修改、易讀易維護；若有新增環境變數，請同步更新 `build.mts` 與說明。
