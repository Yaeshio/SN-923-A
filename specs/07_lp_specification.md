# LP 実装仕様書 (Draft)

## 1. 概要
本アプリの説明用ランディングページ (LP) を追加するための技術仕様である。既存のアプリケーション機能への影響を最小限に抑えつつ、手元にある HTML 素材を活かした LP をルート直下 (`/`) に構築する。

## 2. ルーティング構造
Next.js の **Route Groups** を利用し、アプリ本体と LP のレイアウト・ルーティングを物理的に分離する。

### 2.1 Route Groups の導入
`src/app` 直下に以下のグループを作成する。

- **`(app)`**: アプリケーション本体用。認証や共通ヘッダー（ナビゲーション）を含む。
- **`(marketing)`**: LP 用。独自のスタイルおよびレイアウトを適用する。

### 2.2 ディレクトリ構成案
```text
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx (既存の root layout からアプリ用ヘッダー等を移植)
│   │   └── ... (他の既存機能)
│   ├── (marketing)/
│   │   ├── layout.tsx (LP 用の空または軽量レイアウト)
│   │   └── page.tsx (LP のエントリーポイント: `/`)
│   └── layout.tsx (html/body 基本構造のみ)
├── modules/
│   └── marketing/
│       └── components/
│           └── LandingPageBody.tsx (LP の実体コンポーネント)
└── public/
    └── lp/ (画像などの静的資産)
```

## 3. コンポーネント設計 (責任の分離)
エントリーポイントと LP 本体の責任を明確に分離する。

### 3.1 エントリーポイント (`src/app/(marketing)/page.tsx`)
エントリーポイントは以下の責任のみを持つ：
- **メタデータ管理**: ページ固有の `Metadata` の定義。
- **データ取得**: 必要に応じたサーバーサイドでのデータ読み込み。
- **コンポーネントの呼び出し**: LP 本体コンポーネント (`LandingPageBody`) のレンダリング。

### 3.2 LP 本体 (`src/modules/marketing/components/LandingPageBody.tsx`)
手元にある HTML 素材をもとに構築された、LP の視覚的実体。
- **純粋な UI 構築**: HTML/JSX による表示ロジック。
- **エフェクト/インタラクション**: スムーススクロールやアニメーション。

## 4. LP の実装手法
手元にある HTML を効率的に統合するため、以下の手法を採用する。

### 3.1 コンポーネント化
HTML を React (TSX) コンポーネントとして `src/app/(marketing)/page.tsx` に記述する。
- 静的な HTML 構造を JSX に変換し、`class` -> `className` 等の調整を行う。
- 動的な要素（スムーススクロール、お問い合わせボタン等）は必要に応じて Lucide や React Hook で実装する。

### 3.2 静的資産の管理
- **画像・動画**: `public/lp/` ディレクトリに配置し、LP から参照する。
- **CSS**: LP 専用の CSS がある場合は、`src/app/(marketing)/lp.css` として作成し、LP の `layout.tsx` でのみインポートする（`globals.css` との競合を避けるため）。

## 4. 既存ルートへの影響と修正
- **`/` の変更**: 現在 `src/app/page.tsx` で `/projects` へリダイレクトしている処理を削除し、`(marketing)/page.tsx` がルートとして機能するようにする。
- **App レイアウトの隔離**: 既存の `src/app/layout.tsx` に記述されている `header` や `main` のコンテナクラスを `(app)/layout.tsx` に移動し、LP に影響を与えないようにする。

## 5. 検証事項
- `/` にアクセスした際に正しく LP が表示されること。
- `/projects` 等の既存アプリ画面にアクセスした際に、正しくアプリ用ヘッダーが表示されること。
- LP のスタイルがアプリ本体の UI に干渉していないこと。
