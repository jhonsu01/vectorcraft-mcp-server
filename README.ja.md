<p align="center"><img src="icon.png" width="120" alt="VectorCraft Bridge のアイコン"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  お使いのパソコンにインストールした <b>VectorCraft</b> で Claude にベクターアートを扱わせましょう —— <b>Windows・macOS・Linux</b> 対応：<br>
  画像のベクター化、20 形式の相互変換、図形・テキスト・グラフ・効果を使ったデザインの作成と再配色。
</p>

---

## なぜ

[VectorCraft](https://github.com/storytold/vectorcraft) は Rust で書かれた、Illustrator クラスのオープンソースのベクターエディターです。画面なしで動く CLI（`vectorcraft-cli`）、685 個のコマンド、MCP モードを備えています。この [Model Context Protocol](https://modelcontextprotocol.io) サーバーは、そのエンジンを Claude 向けの **「ファイルを渡してファイルを受け取る」ツール** に変えます。たとえば次のように頼めます。

> *「`D:\logos` のロゴをすべて 6 色・背景透明でベクター化して、SVG と PDF にして」*
> *「1080×1080 の投稿画像を作って：オレンジの背景、白い『SALE』の見出し、星、この数字の棒グラフ」*
> *「`brand.svg` の赤を #0055ff に替えて、EPS、DXF、2 倍の PNG で書き出して」*
> *「この AI ファイルを、文字をアウトライン化してアートボードごとに SVG に変換して」*

姉妹プロジェクト：[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server)、[audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## 対応プラットフォーム

| OS | インストールする VectorCraft パッケージ | サーバーが自動で探す場所（設定不要） | 状況 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI またはポータブル zip | `C:\Program Files\VectorCraft`、`%LOCALAPPDATA%\Programs\VectorCraft`、`PATH` | ✅ 検証済み（Windows 11） |
| **Linux**（x86_64、aarch64、glibc ≥ 2.35） | `.deb`、`.rpm` または `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/vectorcraft/bin`、`~/.local/bin`、`PATH` | ✅ 検証済み（Debian 12、画面なし） |
| **macOS** 11 以降（Apple シリコン・Intel） | `.dmg`（アプリ）**と** `vectorcraft-cli-<バージョン>-macos-universal.zip` | `/Applications/VectorCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 対応済み、Mac 実機では未検証 |

ダウンロード：[VectorCraft のリリース](https://github.com/storytold/vectorcraft/releases)（FreeBSD 用の tar.gz もあります。`VECTORCRAFT_DIR` で指定してください）。それ以外の場所に置いた場合は `VECTORCRAFT_DIR`（フォルダー、`.tar.gz` のルート、または `VectorCraft.app`）か `VECTORCRAFT_CLI` を設定してください。

- **macOS：** DMG にはアプリしか入っていません。別配布の `vectorcraft-cli` の zip を展開し、`vectorcraft-cli` を `/usr/local/bin` に移動してください（または `VECTORCRAFT_CLI` でその場所を指定）。初回起動が macOS にブロックされたら、*システム設定 → プライバシーとセキュリティ* で許可してください。
- **Linux：** AppImage と Flatpak にはアプリのみで `vectorcraft-cli` は含まれません。deb、rpm、tar.gz のいずれかを使ってください。アプリが AppImage の場合は、`open_in_vectorcraft` が起動できるよう `VECTORCRAFT_APP` を設定してください。GPU のないサーバーでは、検証済み環境で `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig` を入れました。

## しくみ

| 構成要素 | 内容 |
| --- | --- |
| **VectorCraft エンジン**（`vectorcraft-cli mcp --headless`） | VectorCraft 自身のエンジン：読み込み、レンダリング、画像トレース、効果、パスファインダー、テキスト、グラフ、書き出し。ジョブごとに **画面なしで** 新しく起動するため、開いている VectorCraft ウィンドウを変更することはありません。 |
| **MCP サーバー**（Node.js） | 10 個の高レベルツール。エンジンを 1 回ずつ呼び出し（オブジェクト id は呼び出し間で引き継がれます）、パスを検証し、上書きは一切しません。 |
| **ライブアプリ**（任意） | `run_vector_commands live=true` で、制御チャネル（`vectorcraft --control 7979`）経由でデスクトップアプリを操作します。 |

## ツール

| ツール | 機能 |
| --- | --- |
| `vectorize_image` | PNG / JPEG / TIFF / WebP / GIF / BMP を画像トレースでベクターに：プリセット（ロゴ、写真、線画、シルエット…）またはモード、色数、しきい値、パス、コーナー、ノイズ、透明背景。1 枚でもフォルダーごとでも |
| `convert_vector` | 読み込める形式から書き出せる形式へ。複数形式を同時に、アートボードごとのファイル、拡大率、品質、文字のアウトライン化 |
| `create_design` | 任意のサイズやプリセットで新規アート：背景、長方形、楕円、多角形、星形、直線、SVG パス、テキスト、配置画像、グラフ。塗り、線、不透明度、ライブ効果付き |
| `edit_vector` | 再配色（旧色 → 新色）、色数の削減、拡大縮小 / 回転 / 移動 / リフレクト、効果、文字のアウトライン化、要素の追加、アートボードをアートに合わせる、メタデータ。使用色の一覧だけも可 |
| `render_preview` | アートボードを PNG に（Claude が画像を確認できます） |
| `get_vector_info` | アートボード、カラーモード、単位、種類別オブジェクト数、フォント（不足分も）、メタデータ、読み込み時の警告 |
| `list_vector_catalog` | 685 コマンド、51 効果、画像トレースのプリセット、ドキュメントプリセット、形式、スウォッチライブラリ |
| `run_vector_commands` | 1 つのセッションで任意のエンジンツールを実行（`$steps[N].id` で参照）。画面なし、またはライブアプリで |
| `open_in_vectorcraft` | VectorCraft アプリでファイルを開く |
| `get_vectorcraft_status` | プラットフォーム、インストール、バージョン、コマンド数、アプリ / 制御ポート |

| | |
| --- | --- |
| **読み込み** | SVG、SVGZ、PDF、AI、AIT、EPS、DXF、EMF、WMF、.vectorcraft、.drawcraft、.vctemplate、PNG、JPEG、GIF、WebP、TIFF、BMP |
| **書き出し** | SVG、SVGZ、PDF、EPS、DXF、EMF、WMF、PNG、PNG8、JPEG、WebP、GIF、TIFF、BMP、TGA、PSD（レイヤー付き）、TXT、.vectorcraft、テンプレート |
| **効果** | ドロップシャドウ、光彩（内側 / 外側）、ぼかし（境界）、ガウスぼかし、角を丸くする、落書き、ラフ、ジグザグ、パンク・膨張、ひねり、パスのオフセット、15 種類のワープ（円弧、旗、波形、魚眼…）、色調補正、パスファインダー効果… |

座標の単位は **アートボード左上を原点とするポイント** です（1 px = 1 pt）。

## 例

```json
{
  "name": "sale-post",
  "width": 1080,
  "height": 1080,
  "background": "#ff6a00",
  "elements": [
    { "type": "star", "cx": 540, "cy": 420, "radius1": 260, "radius2": 120, "fill": "#ffd23f", "effects": [ { "effect": "stylize.dropShadow" } ] },
    { "type": "text", "text": "SALE", "x": 330, "y": 880, "size": 180, "color": "#ffffff" },
    { "type": "chart", "chart_type": "column", "x": 640, "y": 900, "width": 380, "height": 160, "csv": ",2025,2026\nQ1,12,18\nQ2,15,24", "colors": ["#ffffff", "#ffd23f"], "text_color": "#ffffff" }
  ],
  "formats": ["svg", "png", "vectorcraft"],
  "output_dir": "/home/me/designs"
}
```

## 必要なもの

- `vectorcraft-cli` 付きの **VectorCraft**（**0.7.0** で検証）。[対応プラットフォーム](#対応プラットフォーム) を参照
- Node.js 20 以上（`.mcpb` でインストールする場合は Claude Desktop に同梱）

## インストール

### Claude Desktop（推奨、全プラットフォーム）

1. [最新リリース](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest) から `vectorcraft-mcp-server.mcpb` をダウンロードします。
2. ダブルクリック（または Claude Desktop → *設定 → 拡張機能* にドラッグ）して **インストール** をクリックします。
3. 任意：VectorCraft が標準の場所にない場合は、拡張機能の設定でフォルダーか `vectorcraft-cli` のパスを指定します。

### Claude Code / その他の MCP クライアント

```bash
git clone https://github.com/jhonsu01/vectorcraft-mcp-server.git
cd vectorcraft-mcp-server
npm install
npm run build
```

Windows：

```bash
claude mcp add vectorcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux：

```bash
claude mcp add vectorcraft -- node "$PWD/dist/bundle.cjs"
```

## 設定

| 変数 | 意味 |
| --- | --- |
| `VECTORCRAFT_DIR` | VectorCraft のフォルダー、その実行ファイル、`.tar.gz` のルート（`bin/` を含む）、または `VectorCraft.app`。既定：自動検出 |
| `VECTORCRAFT_CLI` | `vectorcraft-cli` / `vectorcraft-cli.exe` のパス（`VECTORCRAFT_DIR` より優先） |
| `VECTORCRAFT_APP` | デスクトップアプリが別の場所にある場合のパス（例：Linux の AppImage） |
| `VECTORCRAFT_CONTROL_PORT` | デスクトップアプリの制御ポート（既定 7979） |
| `VECTORCRAFT_MCP_TIMEOUT` | エンジン呼び出し 1 回あたりの最大秒数（既定 3600） |

## 安全性

- `overwrite: true` を指定しない限り、ファイルは**決して上書きされません**。フォルダー内では空いている名前（`_2`）を使い、既存の `output_path` はエラーになります。入力ファイルも変更しません。
- パスはすべて絶対パスで指定します。エンジンは画面なしで動き、`live: true` のとき以外は開いている VectorCraft ウィンドウを変更しません。
- すべてローカルで動作し、ネットワークには接続しません。ジョブごとに専用エンジンと一時フォルダーを使い、終了後に削除します。

## 開発

```bash
npm run build       # TypeScript + 単一ファイルバンドル（dist/bundle.cjs）
npm test            # 単体テスト（Windows・macOS・Linux のパス処理）
npm run test:e2e    # 実際の MCP stdio を通した 19 項目のエンドツーエンド検証（合成 PNG とデザイン）
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
```

Docker での Linux 検証（先に `vectorcraft-<バージョン>-linux-x86_64.tar.gz` を展開）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## ライセンス

Apache-2.0。VectorCraft の著作権はその作者（Storytold）にあり、Apache-2.0 ライセンスです。
本プロジェクトは VectorCraft および Storytold とは無関係で、承認も受けていません。Adobe Illustrator は Adobe の商標です。
