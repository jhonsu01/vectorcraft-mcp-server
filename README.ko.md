<p align="center"><img src="icon.png" width="120" alt="VectorCraft Bridge 아이콘"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b>
</p>

<p align="center">
  컴퓨터에 설치된 <b>VectorCraft</b>로 Claude가 벡터 아트를 다루게 하세요 — <b>Windows, macOS, Linux</b> 지원:<br>
  이미지 벡터화, 20가지 형식 변환, 도형·텍스트·차트·효과로 디자인 만들기와 색 바꾸기.
</p>

---

## 왜 필요한가

[VectorCraft](https://github.com/storytold/vectorcraft)는 Rust로 작성된 Illustrator급 오픈소스 벡터 편집기로, 화면 없이 동작하는 CLI(`vectorcraft-cli`), 685개 명령, MCP 모드를 제공합니다. 이 [Model Context Protocol](https://modelcontextprotocol.io) 서버는 그 엔진을 Claude용 **"파일을 넣고 파일을 받는" 도구**로 바꿔 주므로, 다음처럼 요청할 수 있습니다.

> *"`D:\logos`의 모든 로고를 6색, 투명 배경으로 벡터화해서 SVG와 PDF로 줘."*
> *"1080×1080 게시물을 만들어 줘: 주황 배경, 흰색 'SALE' 제목, 별 하나, 이 숫자들의 막대 차트."*
> *"`brand.svg`의 빨강을 #0055ff로 바꾸고 EPS, DXF, 2배 PNG로 내보내 줘."*
> *"이 AI 파일을 텍스트를 윤곽선으로 바꿔 대지마다 SVG로 변환해 줘."*

자매 프로젝트: [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## 지원 플랫폼

| 운영체제 | 설치할 VectorCraft 패키지 | 서버가 자동으로 찾는 위치(설정 불필요) | 상태 |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI 또는 포터블 zip | `C:\Program Files\VectorCraft`, `%LOCALAPPDATA%\Programs\VectorCraft`, `PATH` | ✅ 검증됨 (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` 또는 `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/vectorcraft/bin`, `~/.local/bin`, `PATH` | ✅ 검증됨 (Debian 12, 화면 없음) |
| **macOS** 11 이상 (Apple 실리콘, Intel) | `.dmg`(앱) **그리고** `vectorcraft-cli-<버전>-macos-universal.zip` | `/Applications/VectorCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 지원됨, Mac 실기기에서는 아직 미검증 |

다운로드: [VectorCraft 릴리스](https://github.com/storytold/vectorcraft/releases) (FreeBSD용 tar.gz도 있으니 `VECTORCRAFT_DIR`로 지정하세요). 다른 위치에 설치했다면 `VECTORCRAFT_DIR`(폴더, `.tar.gz` 루트 또는 `VectorCraft.app`)이나 `VECTORCRAFT_CLI`를 설정하세요.

- **macOS:** DMG에는 앱만 들어 있습니다. 별도로 제공되는 `vectorcraft-cli` zip을 풀고 `vectorcraft-cli`를 `/usr/local/bin`으로 옮기세요(또는 `VECTORCRAFT_CLI`로 위치를 지정). macOS가 첫 실행을 막으면 *시스템 설정 → 개인정보 보호 및 보안*에서 허용하세요.
- **Linux:** AppImage와 Flatpak에는 앱만 있고 `vectorcraft-cli`는 없습니다. deb, rpm, tar.gz 중 하나를 사용하세요. 앱이 AppImage라면 `open_in_vectorcraft`가 실행할 수 있도록 `VECTORCRAFT_APP`을 설정하세요. GPU가 없는 서버에서는 검증된 환경에 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`를 설치했습니다.

## 동작 방식

| 구성 요소 | 설명 |
| --- | --- |
| **VectorCraft 엔진** (`vectorcraft-cli mcp --headless`) | VectorCraft 자체 엔진: 가져오기, 렌더링, 이미지 추적, 효과, 패스파인더, 텍스트, 차트, 내보내기. 작업마다 **화면 없이** 새로 시작하므로 열려 있는 VectorCraft 창을 절대 수정하지 않습니다. |
| **MCP 서버** (Node.js) | 고수준 도구 10개. 엔진을 한 번에 하나씩 호출하며(객체 id는 호출 사이에 이어집니다), 경로를 검증하고 절대 덮어쓰지 않습니다. |
| **실행 중인 앱** (선택) | `run_vector_commands live=true`가 제어 채널(`vectorcraft --control 7979`)을 통해 데스크톱 앱을 조작합니다. |

## 도구

| 도구 | 기능 |
| --- | --- |
| `vectorize_image` | PNG / JPEG / TIFF / WebP / GIF / BMP를 이미지 추적으로 벡터화: 사전 설정(로고, 사진, 선화, 실루엣…) 또는 모드, 색상 수, 임계값, 패스, 모서리, 노이즈, 투명 배경; 이미지 하나 또는 폴더 전체 |
| `convert_vector` | 읽을 수 있는 모든 형식에서 쓸 수 있는 모든 형식으로, 여러 형식 동시, 대지마다 파일, 배율, 품질, 텍스트 윤곽선 |
| `create_design` | 원하는 크기나 사전 설정의 새 아트: 배경, 사각형, 타원, 다각형, 별, 선, SVG 패스, 텍스트, 배치 이미지, 차트 — 칠, 선, 불투명도, 라이브 효과 포함 |
| `edit_vector` | 색 바꾸기(이전 색 → 새 색), 색상 줄이기, 크기 / 회전 / 이동 / 반사, 효과, 텍스트 윤곽선, 요소 추가, 대지를 아트에 맞추기, 메타데이터; 또는 사용된 색상 목록 |
| `render_preview` | 대지를 PNG로(Claude가 이미지를 확인) |
| `get_vector_info` | 대지, 색상 모드, 단위, 종류별 객체 수, 글꼴(없는 글꼴 포함), 메타데이터, 가져오기 경고 |
| `list_vector_catalog` | 685개 명령, 51개 효과, 이미지 추적 사전 설정, 문서 사전 설정, 형식, 견본 라이브러리 |
| `run_vector_commands` | 한 세션에서 엔진 도구 아무거나 실행(`$steps[N].id` 참조), 화면 없이 또는 실행 중인 앱에서 |
| `open_in_vectorcraft` | VectorCraft 앱에서 파일 열기 |
| `get_vectorcraft_status` | 플랫폼, 설치, 버전, 명령 수, 앱 / 제어 포트 |

| | |
| --- | --- |
| **읽기** | SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, .drawcraft, .vctemplate, PNG, JPEG, GIF, WebP, TIFF, BMP |
| **쓰기** | SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, TGA, PSD(레이어 포함), TXT, .vectorcraft, 템플릿 |
| **효과** | 그림자, 내부 / 외부 광선, 페더, 가우시안 흐림, 모퉁이 둥글게, 낙서, 거칠게, 지그재그, 오목·볼록, 비틀기, 패스 이동, 15가지 변형(호, 깃발, 물결, 어안…), 색상 조정, 패스파인더 효과… |

좌표 단위는 **대지 왼쪽 위를 기준으로 한 포인트**입니다(1 px = 1 pt).

## 예시

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

## 요구 사항

- `vectorcraft-cli`가 포함된 **VectorCraft**(**0.7.0**에서 검증), [지원 플랫폼](#지원-플랫폼) 참고
- Node.js 20 이상(`.mcpb`로 설치하면 Claude Desktop에 포함)

## 설치

### Claude Desktop (권장, 모든 플랫폼)

1. [최신 릴리스](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest)에서 `vectorcraft-mcp-server.mcpb`를 내려받습니다.
2. 더블 클릭하거나 Claude Desktop → *설정 → 확장 프로그램*으로 끌어다 놓고 **설치**를 누릅니다.
3. 선택: VectorCraft가 표준 위치에 없다면 확장 프로그램 설정에서 폴더나 `vectorcraft-cli` 경로를 지정합니다.

### Codex (OpenAI)

**권장 — 마켓플레이스(업데이트 받음):** *플러그인 → 추가 → 마켓플레이스 추가*에서 소스 `jhonsu01/craft-marketplace`, 참조 `main`을 지정한 뒤 **Craft Bridges**에서 **VectorCraft Bridge**를 설치합니다([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). 마켓플레이스를 새로 고치면 새 버전이 설치됩니다. 또는 zip을 업로드합니다(Codex는 계정에 저장하고 같은 이름의 새 zip은 거부합니다):

1. [최신 릴리스](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest)에서 `vectorcraft-mcp-server-<버전>-codex.zip`을 내려받습니다.
2. Codex에서 *플러그인 → 추가 → 새 플러그인*을 열고 zip을 선택한 뒤 **플러그인 추가**를 누릅니다.
3. Codex는 `node`로 서버를 시작하므로 `PATH`에 Node.js ≥ 20이 있어야 합니다. VectorCraft가 표준 위치에 없다면 `VECTORCRAFT_DIR` 또는 `VECTORCRAFT_CLI`를 시스템 환경 변수로 설정하세요(Codex에는 로컬 플러그인용 설정 화면이 없습니다).

### Claude Code / 기타 MCP 클라이언트

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

## 설정

| 변수 | 의미 |
| --- | --- |
| `VECTORCRAFT_DIR` | VectorCraft 설치 폴더, 그 안의 실행 파일, `.tar.gz` 루트(`bin/` 포함) 또는 `VectorCraft.app`. 기본값: 자동 감지 |
| `VECTORCRAFT_CLI` | `vectorcraft-cli` / `vectorcraft-cli.exe` 경로(`VECTORCRAFT_DIR`보다 우선) |
| `VECTORCRAFT_APP` | 데스크톱 앱이 다른 곳에 있을 때의 경로(예: Linux AppImage) |
| `VECTORCRAFT_CONTROL_PORT` | 데스크톱 앱의 제어 포트(기본값 7979) |
| `VECTORCRAFT_MCP_TIMEOUT` | 엔진 호출 한 번당 최대 초(기본값 3600) |

## 안전

- `overwrite: true`가 아니면 파일을 **절대 덮어쓰지 않습니다**: 폴더에서는 빈 이름(`_2`)을 쓰고, 이미 있는 `output_path`는 오류가 됩니다. 입력 파일도 바꾸지 않습니다.
- 모든 경로는 절대 경로여야 합니다. 엔진은 화면 없이 동작하며 `live: true`가 아니면 열려 있는 VectorCraft 창을 절대 수정하지 않습니다.
- 모든 작업은 네트워크 없이 로컬에서 실행됩니다. 작업마다 전용 엔진과 임시 폴더를 쓰고 끝나면 삭제합니다.

## 개발

```bash
npm run build       # TypeScript + 단일 파일 번들(dist/bundle.cjs)
npm test            # 단위 테스트(Windows, macOS, Linux 경로 처리)
npm run test:e2e    # 실제 MCP stdio를 통한 19개 엔드투엔드 검사(합성 PNG와 디자인)
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
npm run pack:codex  # Codex 플러그인 zip
```

Docker에서 Linux 검증(먼저 `vectorcraft-<버전>-linux-x86_64.tar.gz`를 풀어 두세요):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 라이선스

Apache-2.0. VectorCraft의 저작권은 그 저자(Storytold)에게 있으며 Apache-2.0 라이선스입니다.
이 프로젝트는 VectorCraft 및 Storytold와 관련이 없으며 그들의 승인을 받지 않았습니다. Adobe Illustrator는 Adobe의 상표입니다.
