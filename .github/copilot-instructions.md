# Copilot Instructions for this Repo

This repo is a minimal browser-side TypeScript tool that renders Hitokoto quotes by reading custom HTML tags. Keep edits small and follow current patterns—no frameworks, no runtime deps, bundle to a single IIFE `main.js` for direct `<script>` use.

## Big picture

- Entry file: `main.ts`; output bundle: `main.js` (IIFE, browser, es2020, sourcemap).
- Data sources via custom tags under `<body>`:
  - `<hitokoto-meta>`: whitespace/comma-separated UUID list → fetch from Hitokoto API.
  - `<text-meta>`: CSV-like lines `text,from,from_who,cite` → render directly.
- Flow (see `main.ts`):
  - `text_main()` parses and renders local text first, then `hitokoto_main()` handles remote UUIDs.
  - `hitokoto_main()` obtains token via `loginAndGetToken(email, password)`, then calls `fetchAndRenderHitokoto(uuid, token)` and the corresponding `/score` API; renders `<blockquote>` after the source tag.

## Build and dev workflow

- Scripts (`package.json`):
  - `build`: `tsc ./build.mts && node ./build.mjs` → runs esbuild, bundles `main.ts` to `main.js`.
  - `dev`: same as above with `--watch` (incremental rebuilds on change).
- Tooling files:
  - `build.mts` (compiled to `build.mjs`) drives esbuild with:
    - `format: "iife"`, `platform: "browser"`, `target: ["es2020"]`, `sourcemap: true`.
    - Env injection: reads `.env` and `process.env` for `HITOKOTO_EMAIL` and `HITOKOTO_PASSWORD`, passes via `define`.
  - `tsconfig.json`: strict TS, outputs to project root; TS module is `commonjs` (esbuild bundling supersedes this for `main.ts`).
- Package manager: `pnpm-lock.yaml` exists; `pnpm` preferred, but `npm` scripts are defined and also work.

## Auth and configuration

- Credentials are not hardcoded. At build time, provide:
  - `HITOKOTO_EMAIL`
  - `HITOKOTO_PASSWORD`
- Ways to inject (in order resolved by `main.ts`):
  1. esbuild `define` (from `.env`/shell via `build.mts`), 2) `globalThis[NAME]` (set on `window` before loading `main.js`), 3) `process.env[NAME]` (useful for Node-based tests).
- If credentials are missing, `hitokoto_main()` warns and exits; `text_main()` still runs.

## HTML usage conventions

- Tags must be direct children of `<body>` and are not rendered themselves; rendered `<blockquote>`s are inserted immediately after the tag that provided the data.
- `<hitokoto-meta>` content is split by comma or whitespace into UUIDs.
- `<text-meta>` uses line-per-entry, fields split by comma. Missing `from` falls back to `无名氏`.
- The quote line template is: `${text} —— 「${fromDisplay}」` with optional `<sub>` score appended when available.

## Extension points (follow these patterns)

- Parsing: keep DOM selection anchors (`body > hitokoto-meta`, `body > text-meta`) and split rules consistent.
- Rendering: always create a `<blockquote>` with `cite` when provided; place it with `Element.after(...)` right after the source tag.
- API surface:
  - Auth endpoint: `POST https://hitokoto.cn/api/restful/v1/auth/login` (URLSearchParams body).
  - Quote endpoint: `GET https://hitokoto.cn/api/restful/v1/hitokoto/{uuid}`.
  - Score endpoint: `GET https://hitokoto.cn/api/restful/v1/hitokoto/{uuid}/score` (append `<sub>` with `average` when present; treat "句子不存在或评分未创建" as score 0).
- Env adds: to support new defines, append keys to the array in `build.mts` that populates `defs` and read them in `main.ts` via `resolveCredential(name)`.

## Gotchas and local conventions

- Order matters: `text_main()` runs before `hitokoto_main()`.
- Do not introduce heavy bundlers/frameworks; keep a single IIFE output.
- Avoid moving files out of root: `tsconfig` and build outputs assume current directory layout (`outDir: "."`).
- Keep strings and UI minimal; current locale mixes zh-CN for fallbacks (e.g., `无名氏`).

## Quick examples from this repo

- Token acquisition: `loginAndGetToken(...)` → returns `data[0].token`.
- Fallback credentials resolution in `main.ts`: checks `HITOKOTO_EMAIL/PASSWORD` define → `globalThis` → `process.env`.
- Render pattern: set `blockquote.cite`, write innerHTML to a `<div>`, then append `<sub>` for scores when available.

If anything here seems outdated (new APIs, different tag shapes, added scripts), please point it out so we can update these instructions.
