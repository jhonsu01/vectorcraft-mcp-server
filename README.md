<p align="center"><img src="icon.png" width="120" alt="VectorCraft Bridge icon"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <b>English</b> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Let Claude work on vector artwork with the <b>VectorCraft</b> installed on your computer — <b>Windows, macOS and Linux</b>:<br>
  vectorize images, convert between 20 formats, create and recolor designs with shapes, text, charts and effects.
</p>

---

## Why

[VectorCraft](https://github.com/storytold/vectorcraft) is an open-source, Illustrator-class vector editor written in Rust, with a headless CLI (`vectorcraft-cli`), 685 commands and an MCP mode. This [Model Context Protocol](https://modelcontextprotocol.io) server turns that engine into **file-in / file-out tools** for Claude, so you can ask things like:

> *"Vectorize every logo in `D:\logos` with 6 colours and a transparent background, as SVG and PDF."*
> *"Make an 1080×1080 post: orange background, the title 'Sale' in white, a star and a bar chart of these numbers."*
> *"Change the red of `brand.svg` to #0055ff and export it as EPS, DXF and PNG at 2×."*
> *"Convert this AI file to SVG with the text as outlines, one file per artboard."*

Sibling of [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) and [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Platforms

| OS | VectorCraft package to install | Where the server finds it (no setup needed) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI or portable zip | `C:\Program Files\VectorCraft`, `%LOCALAPPDATA%\Programs\VectorCraft`, `PATH` | ✅ Verified (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` or `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/vectorcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verified (Debian 12, headless) |
| **macOS** 11+ (Apple silicon and Intel) | `.dmg` (the app) **plus** `vectorcraft-cli-<version>-macos-universal.zip` | `/Applications/VectorCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Supported, not yet tested on a Mac |

All downloads: [VectorCraft releases](https://github.com/storytold/vectorcraft/releases) (there is also a FreeBSD tar.gz; set `VECTORCRAFT_DIR` to it). Anywhere else: set `VECTORCRAFT_DIR` (folder, `.tar.gz` root or `VectorCraft.app`) or `VECTORCRAFT_CLI`.

- **macOS:** the DMG contains only the app. Unzip the separate `vectorcraft-cli` zip and move `vectorcraft-cli` to `/usr/local/bin` (or point `VECTORCRAFT_CLI` at it). If macOS blocks its first run, allow it in *System Settings → Privacy & Security*.
- **Linux:** the AppImage and Flatpak contain only the app, not `vectorcraft-cli`; use the deb, rpm or tar.gz. For an AppImage app, set `VECTORCRAFT_APP` so `open_in_vectorcraft` can start it. On a server without a GPU, the verified setup used `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## How it works

| Part | What it is |
| --- | --- |
| **VectorCraft engine** (`vectorcraft-cli mcp --headless`) | VectorCraft's own engine: importers, renderer, Image Trace, effects, Pathfinder, text, graphs and exporters. Started fresh and **headless** for each job, so it never edits a VectorCraft window you have open. |
| **MCP server** (Node.js) | 10 high-level tools. Runs the engine one call at a time (object ids carry from one call to the next), validates paths and never overwrites. |
| **Live app** (optional) | `run_vector_commands live=true` drives the desktop app through its control channel (`vectorcraft --control 7979`). |

## Tools

| Tool | What it does |
| --- | --- |
| `vectorize_image` | Image Trace PNG / JPEG / TIFF / WebP / GIF / BMP into vectors: presets (logos, photos, line art, silhouettes...) or mode, colours, threshold, paths, corners, noise, transparent background; one image or a whole folder |
| `convert_vector` | Any readable format to any writable one, several at once, one file per artboard, scale, quality, text as outlines |
| `create_design` | New artwork of any size / preset: background, rectangles, ellipses, polygons, stars, lines, SVG paths, text, placed images, charts — with fill, stroke, opacity and live effects |
| `edit_vector` | Recolor (old → new colours), reduce colours, scale / rotate / move / reflect, effects, text to outlines, add elements, fit artboard, metadata; or list the colours used |
| `render_preview` | An artboard as PNG, shown to Claude |
| `get_vector_info` | Artboards, colour mode, units, objects by kind, fonts (missing ones too), metadata, import warnings |
| `list_vector_catalog` | 685 commands, 51 effects, Image Trace presets, document presets, formats, swatch libraries |
| `run_vector_commands` | Any engine tools in one session (`$steps[N].id` references), headless or in the live app |
| `open_in_vectorcraft` | Open files in the VectorCraft app |
| `get_vectorcraft_status` | Platform, install, version, commands, app / control port |

| | |
| --- | --- |
| **Reads** | SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, .drawcraft, .vctemplate, PNG, JPEG, GIF, WebP, TIFF, BMP |
| **Writes** | SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, TGA, PSD (layers), TXT, .vectorcraft, template |
| **Effects** | drop shadow, inner / outer glow, feather, Gaussian blur, round corners, scribble, roughen, zig zag, pucker & bloat, twist, offset path, 15 warps (arc, flag, wave, fisheye...), colour adjustments, Pathfinder effects... |

Coordinates are **points from the top-left of the artboard** (1 px = 1 pt).

## Example

```json
{
  "name": "sale-post",
  "width": 1080,
  "height": 1080,
  "background": "#ff6a00",
  "elements": [
    { "type": "star", "cx": 540, "cy": 420, "radius1": 260, "radius2": 120, "fill": "#ffd23f", "effects": [ { "effect": "stylize.dropShadow" } ] },
    { "type": "text", "text": "SALE", "x": 330, "y": 880, "size": 180, "color": "#ffffff" }
  ],
  "formats": ["svg", "png", "vectorcraft"],
  "output_dir": "/home/me/designs"
}
```

## Requirements

- **VectorCraft** with `vectorcraft-cli` (tested with **0.7.0**) — see [Platforms](#platforms)
- Node.js ≥ 20 (bundled with Claude Desktop for `.mcpb` installs)

## Installation

### Claude Desktop (recommended, all platforms)

1. Download `vectorcraft-mcp-server.mcpb` from the [latest release](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest).
2. Double-click it (or drag it onto Claude Desktop → *Settings → Extensions*) and click **Install**.
3. Optional: if VectorCraft is not in a standard place, set its folder or the `vectorcraft-cli` path in the extension settings.

### Claude Code / other MCP clients

```bash
git clone https://github.com/jhonsu01/vectorcraft-mcp-server.git
cd vectorcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add vectorcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add vectorcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `VECTORCRAFT_DIR` | VectorCraft install folder, one of its executables, a `.tar.gz` root (with `bin/`) or `VectorCraft.app`. Default: auto-detect |
| `VECTORCRAFT_CLI` | Path of `vectorcraft-cli` / `vectorcraft-cli.exe` (wins over `VECTORCRAFT_DIR`) |
| `VECTORCRAFT_APP` | Path of the desktop app when it lives elsewhere (e.g. a Linux AppImage) |
| `VECTORCRAFT_CONTROL_PORT` | Control port of the desktop app (default 7979) |
| `VECTORCRAFT_MCP_TIMEOUT` | Max seconds per engine call (default 3600) |

## Safety

- Files are **never overwritten** unless `overwrite: true`: in a folder a free name (`_2`) is used, an existing `output_path` is an error. Inputs are never modified.
- All paths must be absolute. The engine runs headless and never edits an open VectorCraft window unless `live: true`.
- Everything runs locally with no network access. Each job uses a private engine in a temp folder that is removed afterwards.

## Development

```bash
npm run build       # TypeScript + single-file bundle (dist/bundle.cjs)
npm test            # unit tests (Windows, macOS and Linux path logic)
npm run test:e2e    # 17 end-to-end checks over real MCP stdio (synthetic PNGs and designs)
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
```

Linux check in Docker (unpack `vectorcraft-<version>-linux-x86_64.tar.gz` first):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## License

Apache-2.0. VectorCraft is © its authors (Storytold), Apache-2.0.
This project is not affiliated with or endorsed by VectorCraft or Storytold. Adobe Illustrator is a trademark of Adobe.
