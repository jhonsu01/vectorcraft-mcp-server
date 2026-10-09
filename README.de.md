<p align="center"><img src="icon.png" width="120" alt="VectorCraft-Bridge-Symbol"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <b>Deutsch</b> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Lass Claude mit dem auf deinem Rechner installierten <b>VectorCraft</b> an Vektorgrafiken arbeiten — <b>Windows, macOS und Linux</b>:<br>
  Bilder vektorisieren, zwischen 20 Formaten konvertieren, Designs mit Formen, Text, Diagrammen und Effekten erstellen und umfärben.
</p>

---

## Warum

[VectorCraft](https://github.com/storytold/vectorcraft) ist ein quelloffener Vektoreditor auf Illustrator-Niveau, geschrieben in Rust, mit einer CLI ohne Oberfläche (`vectorcraft-cli`), 685 Befehlen und einem MCP-Modus. Dieser [Model Context Protocol](https://modelcontextprotocol.io)-Server macht aus dieser Engine **Datei-zu-Datei-Werkzeuge** für Claude, sodass du zum Beispiel fragen kannst:

> *„Vektorisiere alle Logos in `D:\logos` mit 6 Farben und transparentem Hintergrund, als SVG und PDF.“*
> *„Mach einen 1080×1080-Post: oranger Hintergrund, der Titel ‚Sale‘ in Weiß, ein Stern und ein Balkendiagramm dieser Zahlen.“*
> *„Ersetze das Rot in `marke.svg` durch #0055ff und exportiere als EPS, DXF und PNG in 2×.“*
> *„Konvertiere diese AI-Datei nach SVG mit Text als Pfaden, eine Datei pro Zeichenfläche.“*

Geschwisterprojekt von [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) und [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plattformen

| System | Zu installierendes VectorCraft-Paket | Wo der Server es findet (ohne Einrichtung) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI oder portables Zip | `C:\Program Files\VectorCraft`, `%LOCALAPPDATA%\Programs\VectorCraft`, `PATH` | ✅ Geprüft (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` oder `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/vectorcraft/bin`, `~/.local/bin`, `PATH` | ✅ Geprüft (Debian 12, ohne Oberfläche) |
| **macOS** 11+ (Apple Silicon und Intel) | `.dmg` (die App) **plus** `vectorcraft-cli-<version>-macos-universal.zip` | `/Applications/VectorCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Unterstützt, noch nicht auf einem Mac getestet |

Downloads: [VectorCraft-Releases](https://github.com/storytold/vectorcraft/releases) (es gibt auch ein tar.gz für FreeBSD; `VECTORCRAFT_DIR` darauf setzen). An anderen Orten: `VECTORCRAFT_DIR` (Ordner, Wurzel des `.tar.gz` oder `VectorCraft.app`) oder `VECTORCRAFT_CLI` setzen.

- **macOS:** Das DMG enthält nur die App. Entpacke das separate `vectorcraft-cli`-Zip und verschiebe `vectorcraft-cli` nach `/usr/local/bin` (oder setze `VECTORCRAFT_CLI` darauf). Blockiert macOS den ersten Start, erlaube ihn unter *Systemeinstellungen → Datenschutz & Sicherheit*.
- **Linux:** AppImage und Flatpak enthalten nur die App, kein `vectorcraft-cli`; nutze deb, rpm oder tar.gz. Ist die App ein AppImage, setze `VECTORCRAFT_APP`, damit `open_in_vectorcraft` sie starten kann. Auf einem Server ohne GPU nutzte die geprüfte Umgebung `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Funktionsweise

| Teil | Was es ist |
| --- | --- |
| **VectorCraft-Engine** (`vectorcraft-cli mcp --headless`) | VectorCrafts eigene Engine: Importer, Renderer, Image Trace, Effekte, Pathfinder, Text, Diagramme und Exporter. Für jeden Auftrag frisch und **ohne Oberfläche** gestartet, sodass sie nie ein geöffnetes VectorCraft-Fenster verändert. |
| **MCP-Server** (Node.js) | 10 Werkzeuge auf hoher Ebene. Ruft die Engine nacheinander auf (Objekt-IDs gehen von einem Aufruf zum nächsten), prüft Pfade und überschreibt nie etwas. |
| **Live-App** (optional) | `run_vector_commands live=true` steuert die Desktop-App über ihren Steuerkanal (`vectorcraft --control 7979`). |

## Werkzeuge

| Werkzeug | Funktion |
| --- | --- |
| `vectorize_image` | Image Trace von PNG / JPEG / TIFF / WebP / GIF / BMP zu Vektoren: Vorgaben (Logos, Fotos, Strichzeichnung, Silhouetten...) oder Modus, Farben, Schwellenwert, Pfade, Ecken, Rauschen, transparenter Hintergrund; ein Bild oder ein ganzer Ordner |
| `convert_vector` | Jedes lesbare in jedes schreibbare Format, mehrere auf einmal, eine Datei pro Zeichenfläche, Skalierung, Qualität, Text als Pfade |
| `create_design` | Neue Grafik in jeder Größe / Vorgabe: Hintergrund, Rechtecke, Ellipsen, Polygone, Sterne, Linien, SVG-Pfade, Text, platzierte Bilder, Diagramme — mit Fläche, Kontur, Deckkraft und Live-Effekten |
| `edit_vector` | Umfärben (alte → neue Farbe), Farben reduzieren, skalieren / drehen / verschieben / spiegeln, Effekte, Text in Pfade, Elemente hinzufügen, Zeichenfläche anpassen, Metadaten; oder die verwendeten Farben auflisten |
| `render_preview` | Eine Zeichenfläche als PNG, die Claude sieht |
| `get_vector_info` | Zeichenflächen, Farbmodus, Einheiten, Objekte nach Art, Schriften (auch fehlende), Metadaten, Importwarnungen |
| `list_vector_catalog` | 685 Befehle, 51 Effekte, Image-Trace-Vorgaben, Dokumentvorgaben, Formate, Farbfeldbibliotheken |
| `run_vector_commands` | Beliebige Engine-Werkzeuge in einer Sitzung (Verweise `$steps[N].id`), ohne Oberfläche oder in der Live-App |
| `open_in_vectorcraft` | Öffnet Dateien in der VectorCraft-App |
| `get_vectorcraft_status` | Plattform, Installation, Version, Befehle, App / Steuerport |

| | |
| --- | --- |
| **Liest** | SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, .drawcraft, .vctemplate, PNG, JPEG, GIF, WebP, TIFF, BMP |
| **Schreibt** | SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, TGA, PSD (mit Ebenen), TXT, .vectorcraft, Vorlage |
| **Effekte** | Schlagschatten, Schein nach innen / außen, weiche Kante, Gaußscher Weichzeichner, Ecken abrunden, Scribble, Aufrauen, Zickzack, Zusammenziehen und Aufblasen, Wirbel, Pfad verschieben, 15 Verkrümmungen (Bogen, Flagge, Welle, Fischauge...), Farbanpassungen, Pathfinder-Effekte... |

Koordinaten sind **Punkt ab der oberen linken Ecke der Zeichenfläche** (1 px = 1 pt).

## Beispiel

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
  "output_dir": "/home/ich/designs"
}
```

## Voraussetzungen

- **VectorCraft** mit `vectorcraft-cli` (getestet mit **0.7.0**); siehe [Plattformen](#plattformen)
- Node.js ≥ 20 (bei `.mcpb`-Installationen in Claude Desktop enthalten)

## Installation

### Claude Desktop (empfohlen, alle Plattformen)

1. Lade `vectorcraft-mcp-server.mcpb` aus dem [neuesten Release](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest) herunter.
2. Doppelklicke darauf (oder ziehe es in Claude Desktop → *Einstellungen → Erweiterungen*) und klicke auf **Installieren**.
3. Optional: Liegt VectorCraft nicht an einem Standardort, gib den Ordner oder den Pfad von `vectorcraft-cli` in den Einstellungen der Erweiterung an.

### Claude Code / andere MCP-Clients

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

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `VECTORCRAFT_DIR` | VectorCraft-Ordner, eine seiner ausführbaren Dateien, die Wurzel eines `.tar.gz` (mit `bin/`) oder `VectorCraft.app`. Standard: automatische Erkennung |
| `VECTORCRAFT_CLI` | Pfad zu `vectorcraft-cli` / `vectorcraft-cli.exe` (hat Vorrang vor `VECTORCRAFT_DIR`) |
| `VECTORCRAFT_APP` | Pfad der Desktop-App, falls sie woanders liegt (z. B. ein Linux-AppImage) |
| `VECTORCRAFT_CONTROL_PORT` | Steuerport der Desktop-App (Standard 7979) |
| `VECTORCRAFT_MCP_TIMEOUT` | Maximale Sekunden pro Engine-Aufruf (Standard 3600) |

## Sicherheit

- Dateien werden **nie überschrieben**, außer mit `overwrite: true`: in einem Ordner wird ein freier Name (`_2`) gewählt, ein vorhandener `output_path` ist ein Fehler. Eingaben werden nie verändert.
- Alle Pfade müssen absolut sein. Die Engine läuft ohne Oberfläche und verändert nie ein geöffnetes VectorCraft-Fenster, außer mit `live: true`.
- Alles läuft lokal ohne Netzwerkzugriff. Jeder Auftrag nutzt eine private Engine in einem temporären Ordner, der danach gelöscht wird.

## Entwicklung

```bash
npm run build       # TypeScript + Einzeldatei-Bundle (dist/bundle.cjs)
npm test            # Unit-Tests (Pfadlogik für Windows, macOS und Linux)
npm run test:e2e    # 19 End-to-End-Prüfungen über echtes MCP stdio (synthetische PNGs und Designs)
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
```

Linux-Test in Docker (vorher `vectorcraft-<version>-linux-x86_64.tar.gz` entpacken):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/pfad/zu/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Lizenz

Apache-2.0. VectorCraft ist © seiner Autoren (Storytold), Apache-2.0.
Dieses Projekt ist weder mit VectorCraft noch mit Storytold verbunden oder von ihnen unterstützt. Adobe Illustrator ist eine Marke von Adobe.
