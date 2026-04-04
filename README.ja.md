# own-repos-curator-data

`repos.json` を可視化する静的サイトです。ローカル開発は `Vite` を使い、`repos.json` と `src/**/*.ts` の更新を開発サーバ上ですぐ確認できます。

## 前提環境

- Node.js 20 以降 + npm
- または Bun

補足:
開発サーバは `Vite`、CI の build は `npm run build` です。Bun はローカル開発時の代替ランタイム兼パッケージマネージャとして使えます。

## npm で始める

依存関係のインストール:

```powershell
npm ci
```

ホットリロード付き開発サーバ:

```powershell
npm run dev
```

Vite のデフォルトでは `http://localhost:5173` で確認できます。Codex CLI が `src/main.ts` や `src/render.ts` を更新した場合も、このサーバ上で反映を確認できます。

本番 build:

```powershell
npm run build
```

build 済み成果物のローカル確認:

```powershell
npm run preview
```

型チェック:

```powershell
npm run typecheck
```

生成物:

- `dist/`

## Bun で始める

依存関係のインストール:

```powershell
bun install
```

ホットリロード付き開発サーバ:

```powershell
bun run dev
```

本番 build:

```powershell
bun run build
```

build 済み成果物のローカル確認:

```powershell
bun run preview
```

型チェック:

```powershell
bun run typecheck
```

## CI と同じ流れで build する

GitHub Actions と同じ流れをローカルで試したい場合は、次でも build できます。

```powershell
python scripts/build.py
```

このスクリプトは内部で以下を実行します。

```powershell
npm ci
npm run build
```

## ホットリロードの対象

- `src/main.ts`
- `src/render.ts`
- `src/styles.css`
- `index.html`
- `repos.json`

補足:
`repos.json` は `src/main.ts` から直接 import しています。`npm run dev` / `bun run dev` 実行中に Codex CLI が TypeScript や CSS を更新した場合も、Vite の HMR または自動リロードで表示に反映されます。

## ローカルと GitHub Pages の両対応について

- ローカル開発は `npm run dev` / `bun run dev`
- build 済み成果物のローカル確認は `npm run preview` / `bun run preview`
- 本番配布物は `dist/`
- `npm run build` は `vite build --base ./` を使っており、`dist/index.html` の asset path が相対パスになるため GitHub Pages でもそのまま動きます

## 確認方法

- 開発中: ブラウザで `http://localhost:5173`
- build 後: `dist/index.html`
