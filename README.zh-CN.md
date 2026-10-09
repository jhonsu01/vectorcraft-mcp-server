<p align="center"><img src="icon.png" width="120" alt="VectorCraft Bridge 图标"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  让 Claude 使用你电脑上安装的 <b>VectorCraft</b> 处理矢量图形 —— 支持 <b>Windows、macOS 和 Linux</b>：<br>
  图像矢量化、20 种格式互转，用形状、文字、图表和效果创建并重新着色设计。
</p>

---

## 为什么

[VectorCraft](https://github.com/storytold/vectorcraft) 是一款用 Rust 编写、对标 Illustrator 的开源矢量编辑器，自带无界面的命令行工具（`vectorcraft-cli`）、685 条命令和 MCP 模式。这个 [Model Context Protocol](https://modelcontextprotocol.io) 服务器把该引擎变成 Claude 可调用的 **"文件进、文件出" 工具**，例如你可以说：

> *"把 `D:\logos` 里的所有标志矢量化为 6 色、透明背景，导出 SVG 和 PDF。"*
> *"做一张 1080×1080 的海报：橙色背景、白色标题「促销」、一颗星和这些数字的柱状图。"*
> *"把 `brand.svg` 里的红色换成 #0055ff，并导出 EPS、DXF 和 2 倍分辨率的 PNG。"*
> *"把这个 AI 文件转成 SVG，文字转曲，每个画板一个文件。"*

同系列项目：[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) 和 [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## 平台

| 系统 | 需要安装的 VectorCraft 包 | 服务器会自动查找的位置（无需配置） | 状态 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI 或便携版 zip | `C:\Program Files\VectorCraft`、`%LOCALAPPDATA%\Programs\VectorCraft`、`PATH` | ✅ 已验证（Windows 11） |
| **Linux**（x86_64、aarch64，glibc ≥ 2.35） | `.deb`、`.rpm` 或 `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/vectorcraft/bin`、`~/.local/bin`、`PATH` | ✅ 已验证（Debian 12，无界面） |
| **macOS** 11+（Apple 芯片和 Intel） | `.dmg`（应用）**以及** `vectorcraft-cli-<版本>-macos-universal.zip` | `/Applications/VectorCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 已支持，尚未在 Mac 上实测 |

下载：[VectorCraft 发布页](https://github.com/storytold/vectorcraft/releases)（另有 FreeBSD 的 tar.gz，用 `VECTORCRAFT_DIR` 指向它即可）。若安装在其他位置，请设置 `VECTORCRAFT_DIR`（文件夹、`.tar.gz` 解压根目录或 `VectorCraft.app`）或 `VECTORCRAFT_CLI`。

- **macOS：** DMG 里只有应用本身。请解压单独提供的 `vectorcraft-cli` zip，把 `vectorcraft-cli` 移到 `/usr/local/bin`（或用 `VECTORCRAFT_CLI` 指向它）。如果 macOS 阻止首次运行，请在 *系统设置 → 隐私与安全性* 中允许。
- **Linux：** AppImage 和 Flatpak 只包含应用，不含 `vectorcraft-cli`，请使用 deb、rpm 或 tar.gz。若应用是 AppImage，请设置 `VECTORCRAFT_APP`，以便 `open_in_vectorcraft` 能启动它。在没有 GPU 的服务器上，经过验证的环境安装了 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`。

## 工作原理

| 组成 | 说明 |
| --- | --- |
| **VectorCraft 引擎**（`vectorcraft-cli mcp --headless`） | VectorCraft 自己的引擎：导入、渲染、Image Trace、效果、Pathfinder、文字、图表和导出。每个任务都 **以无界面方式** 重新启动，因此绝不会修改你打开着的 VectorCraft 窗口。 |
| **MCP 服务器**（Node.js） | 10 个高层工具。逐次调用引擎（对象 id 在调用之间延续），校验路径，从不覆盖文件。 |
| **实时应用**（可选） | `run_vector_commands live=true` 通过控制通道（`vectorcraft --control 7979`）操作桌面应用。 |

## 工具

| 工具 | 功能 |
| --- | --- |
| `vectorize_image` | 用 Image Trace 把 PNG / JPEG / TIFF / WebP / GIF / BMP 转为矢量：预设（标志、照片、线稿、剪影…）或模式、颜色数、阈值、路径、拐角、杂色、透明背景；单张图片或整个文件夹 |
| `convert_vector` | 任意可读格式转为任意可写格式，可一次多种，每个画板一个文件，缩放、质量、文字转曲 |
| `create_design` | 任意尺寸或预设的新作品：背景、矩形、椭圆、多边形、星形、直线、SVG 路径、文字、置入图片、图表——可设置填充、描边、不透明度和实时效果 |
| `edit_vector` | 重新着色（旧色 → 新色）、减少颜色、缩放 / 旋转 / 移动 / 镜像、效果、文字转曲、添加元素、画板适合作品、元数据；或列出使用的颜色 |
| `render_preview` | 将画板渲染为 PNG，Claude 可以看到 |
| `get_vector_info` | 画板、颜色模式、单位、各类对象数量、字体（含缺失字体）、元数据、导入警告 |
| `list_vector_catalog` | 685 条命令、51 种效果、Image Trace 预设、文档预设、格式、色板库 |
| `run_vector_commands` | 在一个会话中运行任意引擎工具（支持 `$steps[N].id` 引用），可无界面或在实时应用中运行 |
| `open_in_vectorcraft` | 在 VectorCraft 应用中打开文件 |
| `get_vectorcraft_status` | 平台、安装、版本、命令数、应用 / 控制端口 |

| | |
| --- | --- |
| **读取** | SVG、SVGZ、PDF、AI、AIT、EPS、DXF、EMF、WMF、.vectorcraft、.drawcraft、.vctemplate、PNG、JPEG、GIF、WebP、TIFF、BMP |
| **写入** | SVG、SVGZ、PDF、EPS、DXF、EMF、WMF、PNG、PNG8、JPEG、WebP、GIF、TIFF、BMP、TGA、PSD（含图层）、TXT、.vectorcraft、模板 |
| **效果** | 投影、内发光 / 外发光、羽化、高斯模糊、圆角、涂抹、粗糙化、锯齿、收缩与膨胀、扭转、偏移路径、15 种变形（弧形、旗形、波形、鱼眼…）、色彩调整、Pathfinder 效果… |

坐标单位是 **点，原点在画板左上角**（1 px = 1 pt）。

## 示例

```json
{
  "name": "sale-post",
  "width": 1080,
  "height": 1080,
  "background": "#ff6a00",
  "elements": [
    { "type": "star", "cx": 540, "cy": 420, "radius1": 260, "radius2": 120, "fill": "#ffd23f", "effects": [ { "effect": "stylize.dropShadow" } ] },
    { "type": "text", "text": "促销", "x": 360, "y": 880, "size": 180, "color": "#ffffff" }
  ],
  "formats": ["svg", "png", "vectorcraft"],
  "output_dir": "/home/me/designs"
}
```

## 要求

- 带有 `vectorcraft-cli` 的 **VectorCraft**（已在 **0.7.0** 上测试），见 [平台](#平台)
- Node.js ≥ 20（通过 `.mcpb` 安装时 Claude Desktop 已自带）

## 安装

### Claude Desktop（推荐，所有平台）

1. 从 [最新发布](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest) 下载 `vectorcraft-mcp-server.mcpb`。
2. 双击它（或拖到 Claude Desktop → *设置 → 扩展*），然后点击 **安装**。
3. 可选：如果 VectorCraft 不在标准位置，请在扩展设置中填写它的文件夹或 `vectorcraft-cli` 的路径。

### Claude Code / 其他 MCP 客户端

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

## 配置

| 变量 | 含义 |
| --- | --- |
| `VECTORCRAFT_DIR` | VectorCraft 安装文件夹、其中某个可执行文件、`.tar.gz` 解压根目录（含 `bin/`）或 `VectorCraft.app`。默认：自动检测 |
| `VECTORCRAFT_CLI` | `vectorcraft-cli` / `vectorcraft-cli.exe` 的路径（优先于 `VECTORCRAFT_DIR`） |
| `VECTORCRAFT_APP` | 桌面应用在其他位置时的路径（例如 Linux 的 AppImage） |
| `VECTORCRAFT_CONTROL_PORT` | 桌面应用的控制端口（默认 7979） |
| `VECTORCRAFT_MCP_TIMEOUT` | 每次引擎调用的最长秒数（默认 3600） |

## 安全

- 除非设置 `overwrite: true`，否则**绝不覆盖**文件：在文件夹中会使用空闲的名称（`_2`），已存在的 `output_path` 会报错。输入文件永远不会被修改。
- 所有路径必须是绝对路径。引擎以无界面方式运行，除非 `live: true`，否则绝不修改已打开的 VectorCraft 窗口。
- 一切都在本地运行，不访问网络。每个任务使用独立引擎和临时文件夹，结束后自动删除。

## 开发

```bash
npm run build       # TypeScript + 单文件打包（dist/bundle.cjs）
npm test            # 单元测试（Windows、macOS、Linux 路径逻辑）
npm run test:e2e    # 通过真实 MCP stdio 的 17 项端到端检查（合成 PNG 和设计）
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
```

在 Docker 中测试 Linux（先解压 `vectorcraft-<版本>-linux-x86_64.tar.gz`）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 许可证

Apache-2.0。VectorCraft 版权归其作者（Storytold）所有，采用 Apache-2.0 许可。
本项目与 VectorCraft 和 Storytold 无关，也未获得其认可。Adobe Illustrator 是 Adobe 的商标。
