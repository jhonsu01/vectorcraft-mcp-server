<p align="center"><img src="icon.png" width="120" alt="Значок VectorCraft Bridge"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <b>Русский</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Позвольте Claude работать с векторной графикой в <b>VectorCraft</b>, установленном на вашем компьютере, — <b>Windows, macOS и Linux</b>:<br>
  векторизация изображений, конвертация между 20 форматами, создание и перекраска макетов с фигурами, текстом, диаграммами и эффектами.
</p>

---

## Зачем

[VectorCraft](https://github.com/storytold/vectorcraft) — векторный редактор с открытым исходным кодом уровня Illustrator, написанный на Rust, с консольным инструментом без интерфейса (`vectorcraft-cli`), 685 командами и режимом MCP. Этот сервер [Model Context Protocol](https://modelcontextprotocol.io) превращает движок в **инструменты «файл → файл»** для Claude, и можно просить, например:

> *«Векторизуй все логотипы из `D:\logos` в 6 цветов с прозрачным фоном, в SVG и PDF».*
> *«Сделай пост 1080×1080: оранжевый фон, белый заголовок „Распродажа“, звезда и столбчатая диаграмма этих чисел».*
> *«Замени красный в `brand.svg` на #0055ff и экспортируй в EPS, DXF и PNG в 2×».*
> *«Преобразуй этот AI-файл в SVG с текстом в кривых, по файлу на монтажную область».*

Родственные проекты: [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) и [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Платформы

| Система | Какой пакет VectorCraft установить | Где сервер его находит (без настройки) | Статус |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI или портативный zip | `C:\Program Files\VectorCraft`, `%LOCALAPPDATA%\Programs\VectorCraft`, `PATH` | ✅ Проверено (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` или `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/vectorcraft/bin`, `~/.local/bin`, `PATH` | ✅ Проверено (Debian 12, без графики) |
| **macOS** 11+ (Apple silicon и Intel) | `.dmg` (приложение) **и** `vectorcraft-cli-<версия>-macos-universal.zip` | `/Applications/VectorCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Поддерживается, на Mac ещё не проверено |

Загрузки: [релизы VectorCraft](https://github.com/storytold/vectorcraft/releases) (есть и tar.gz для FreeBSD — укажите его в `VECTORCRAFT_DIR`). Если установлено в другом месте, задайте `VECTORCRAFT_DIR` (папка, корень `.tar.gz` или `VectorCraft.app`) или `VECTORCRAFT_CLI`.

- **macOS:** в DMG только приложение. Распакуйте отдельный zip с `vectorcraft-cli` и переместите `vectorcraft-cli` в `/usr/local/bin` (или укажите путь в `VECTORCRAFT_CLI`). Если macOS блокирует первый запуск, разрешите его в *Системных настройках → Конфиденциальность и безопасность*.
- **Linux:** AppImage и Flatpak содержат только приложение, без `vectorcraft-cli`; используйте deb, rpm или tar.gz. Если приложение — AppImage, задайте `VECTORCRAFT_APP`, чтобы `open_in_vectorcraft` мог его запустить. На сервере без GPU в проверенной конфигурации использовались `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Как это работает

| Часть | Что это |
| --- | --- |
| **Движок VectorCraft** (`vectorcraft-cli mcp --headless`) | Собственный движок VectorCraft: импорт, рендер, Image Trace, эффекты, Pathfinder, текст, диаграммы и экспорт. Для каждой задачи запускается заново и **без интерфейса**, поэтому никогда не меняет открытое окно VectorCraft. |
| **MCP-сервер** (Node.js) | 10 высокоуровневых инструментов. Вызывает движок по одному запросу (id объектов переходят от вызова к вызову), проверяет пути и никогда ничего не перезаписывает. |
| **Живое приложение** (необязательно) | `run_vector_commands live=true` управляет настольным приложением через канал управления (`vectorcraft --control 7979`). |

## Инструменты

| Инструмент | Что делает |
| --- | --- |
| `vectorize_image` | Image Trace из PNG / JPEG / TIFF / WebP / GIF / BMP в векторы: пресеты (логотипы, фото, штрих, силуэты...) или режим, цвета, порог, контуры, углы, шум, прозрачный фон; одно изображение или целая папка |
| `convert_vector` | Из любого читаемого формата в любой записываемый, несколько сразу, по файлу на монтажную область, масштаб, качество, текст в кривых |
| `create_design` | Новый макет любого размера или пресета: фон, прямоугольники, эллипсы, многоугольники, звёзды, линии, SVG-контуры, текст, размещённые изображения, диаграммы — с заливкой, обводкой, прозрачностью и живыми эффектами |
| `edit_vector` | Перекраска (старый → новый цвет), сокращение цветов, масштаб / поворот / сдвиг / отражение, эффекты, текст в кривые, добавление элементов, подгонка монтажной области, метаданные; или список используемых цветов |
| `render_preview` | Монтажная область в PNG, которую видит Claude |
| `get_vector_info` | Монтажные области, цветовой режим, единицы, объекты по типам, шрифты (и отсутствующие), метаданные, предупреждения импорта |
| `list_vector_catalog` | 685 команд, 51 эффект, пресеты Image Trace, пресеты документов, форматы, библиотеки образцов |
| `run_vector_commands` | Любые инструменты движка в одной сессии (ссылки `$steps[N].id`), без интерфейса или в живом приложении |
| `open_in_vectorcraft` | Открывает файлы в приложении VectorCraft |
| `get_vectorcraft_status` | Платформа, установка, версия, команды, приложение / порт управления |

| | |
| --- | --- |
| **Читает** | SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, .drawcraft, .vctemplate, PNG, JPEG, GIF, WebP, TIFF, BMP |
| **Пишет** | SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, TGA, PSD (со слоями), TXT, .vectorcraft, шаблон |
| **Эффекты** | тень, внутреннее / внешнее свечение, растушёвка, размытие по Гауссу, скругление углов, каракули, огрубление, зигзаг, втягивание и раздувание, скручивание, смещение контура, 15 деформаций (дуга, флаг, волна, рыбий глаз...), цветокоррекция, эффекты Pathfinder... |

Координаты — **пункты от левого верхнего угла монтажной области** (1 px = 1 pt).

## Пример

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

## Требования

- **VectorCraft** с `vectorcraft-cli` (проверено на **0.7.0**); см. [Платформы](#платформы)
- Node.js ≥ 20 (входит в Claude Desktop при установке `.mcpb`)

## Установка

### Claude Desktop (рекомендуется, все платформы)

1. Скачайте `vectorcraft-mcp-server.mcpb` из [последнего релиза](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest).
2. Дважды щёлкните по нему (или перетащите в Claude Desktop → *Настройки → Расширения*) и нажмите **Установить**.
3. Необязательно: если VectorCraft установлен не в стандартное место, укажите его папку или путь к `vectorcraft-cli` в настройках расширения.

### Claude Code / другие MCP-клиенты

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

## Настройка

| Переменная | Значение |
| --- | --- |
| `VECTORCRAFT_DIR` | Папка VectorCraft, один из его исполняемых файлов, корень `.tar.gz` (с `bin/`) или `VectorCraft.app`. По умолчанию: автоопределение |
| `VECTORCRAFT_CLI` | Путь к `vectorcraft-cli` / `vectorcraft-cli.exe` (важнее, чем `VECTORCRAFT_DIR`) |
| `VECTORCRAFT_APP` | Путь к настольному приложению, если оно в другом месте (например, AppImage в Linux) |
| `VECTORCRAFT_CONTROL_PORT` | Порт управления настольным приложением (по умолчанию 7979) |
| `VECTORCRAFT_MCP_TIMEOUT` | Максимум секунд на один вызов движка (по умолчанию 3600) |

## Безопасность

- Файлы **никогда не перезаписываются** без `overwrite: true`: в папке выбирается свободное имя (`_2`), существующий `output_path` — ошибка. Исходные файлы не изменяются.
- Все пути должны быть абсолютными. Движок работает без интерфейса и не трогает открытое окно VectorCraft, кроме случая `live: true`.
- Всё работает локально, без доступа к сети. Каждая задача использует отдельный движок во временной папке, которая затем удаляется.

## Разработка

```bash
npm run build       # TypeScript + бандл в один файл (dist/bundle.cjs)
npm test            # модульные тесты (логика путей Windows, macOS и Linux)
npm run test:e2e    # 18 сквозных проверок через реальный MCP stdio (синтетические PNG и макеты)
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
```

Проверка Linux в Docker (сначала распакуйте `vectorcraft-<версия>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/путь/к/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Лицензия

Apache-2.0. VectorCraft © его авторы (Storytold), Apache-2.0.
Проект не связан с VectorCraft и Storytold и не одобрен ими. Adobe Illustrator — товарный знак Adobe.
