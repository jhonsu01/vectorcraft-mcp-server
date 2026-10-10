<p align="center"><img src="icon.png" width="120" alt="Ícono de VectorCraft Bridge"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deja que Claude trabaje con arte vectorial usando el <b>VectorCraft</b> instalado en tu equipo — <b>Windows, macOS y Linux</b>:<br>
  vectorizar imágenes, convertir entre 20 formatos, crear y recolorear diseños con formas, texto, gráficos y efectos.
</p>

---

## Por qué

[VectorCraft](https://github.com/storytold/vectorcraft) es un editor vectorial de código abierto, al nivel de Illustrator, escrito en Rust, con una CLI sin interfaz (`vectorcraft-cli`), 685 comandos y un modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) convierte ese motor en **herramientas de archivo a archivo** para Claude, para pedir cosas como:

> *"Vectoriza todos los logos de `D:\logos` con 6 colores y fondo transparente, en SVG y PDF."*
> *"Haz un post de 1080×1080: fondo naranja, el título 'Oferta' en blanco, una estrella y un gráfico de barras con estos números."*
> *"Cambia el rojo de `marca.svg` por #0055ff y expórtalo como EPS, DXF y PNG al doble de resolución."*
> *"Convierte este archivo AI a SVG con el texto en contornos, un archivo por mesa de trabajo."*

Hermano de [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) y [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Paquete de VectorCraft a instalar | Dónde lo encuentra el servidor (sin configurar) | Estado |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI o zip portable | `C:\Program Files\VectorCraft`, `%LOCALAPPDATA%\Programs\VectorCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` o `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/vectorcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sin interfaz) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (la app) **más** `vectorcraft-cli-<versión>-macos-universal.zip` | `/Applications/VectorCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Soportado, aún sin probar en un Mac |

Descargas: [versiones de VectorCraft](https://github.com/storytold/vectorcraft/releases) (también hay un tar.gz para FreeBSD; apunta `VECTORCRAFT_DIR` a él). En cualquier otra ubicación: define `VECTORCRAFT_DIR` (carpeta, raíz del `.tar.gz` o `VectorCraft.app`) o `VECTORCRAFT_CLI`.

- **macOS:** el DMG solo trae la app. Descomprime el zip aparte de `vectorcraft-cli` y mueve `vectorcraft-cli` a `/usr/local/bin` (o apunta `VECTORCRAFT_CLI` a él). Si macOS bloquea su primera ejecución, permítela en *Ajustes del Sistema → Privacidad y seguridad*.
- **Linux:** el AppImage y el Flatpak solo traen la app, no `vectorcraft-cli`; usa el deb, el rpm o el tar.gz. Si la app es un AppImage, define `VECTORCRAFT_APP` para que `open_in_vectorcraft` pueda iniciarla. En un servidor sin GPU, la configuración verificada usó `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Cómo funciona

| Parte | Qué es |
| --- | --- |
| **Motor de VectorCraft** (`vectorcraft-cli mcp --headless`) | El propio motor de VectorCraft: importadores, render, Image Trace, efectos, Pathfinder, texto, gráficos y exportadores. Se inicia limpio y **sin interfaz** para cada trabajo, así que nunca edita una ventana de VectorCraft que tengas abierta. |
| **Servidor MCP** (Node.js) | 10 herramientas de alto nivel. Llama al motor una vez a la vez (los ids de objetos pasan de una llamada a la siguiente), valida rutas y nunca sobrescribe. |
| **App en vivo** (opcional) | `run_vector_commands live=true` controla la app de escritorio por su canal de control (`vectorcraft --control 7979`). |

## Herramientas

| Herramienta | Qué hace |
| --- | --- |
| `vectorize_image` | Image Trace de PNG / JPEG / TIFF / WebP / GIF / BMP a vectores: presets (logos, fotos, dibujo lineal, siluetas...) o modo, colores, umbral, trazados, esquinas, ruido, fondo transparente; una imagen o una carpeta entera |
| `convert_vector` | De cualquier formato legible a cualquiera escribible, varios a la vez, un archivo por mesa de trabajo, escala, calidad, texto en contornos |
| `create_design` | Arte nuevo de cualquier tamaño o preset: fondo, rectángulos, elipses, polígonos, estrellas, líneas, trazados SVG, texto, imágenes colocadas, gráficos — con relleno, trazo, opacidad y efectos en vivo |
| `edit_vector` | Recolorear (color viejo → nuevo), reducir colores, escalar / rotar / mover / reflejar, efectos, texto a contornos, añadir elementos, ajustar la mesa, metadatos; o listar los colores usados |
| `render_preview` | Una mesa de trabajo como PNG, que Claude ve |
| `get_vector_info` | Mesas de trabajo, modo de color, unidades, objetos por tipo, fuentes (también las que faltan), metadatos, avisos de importación |
| `list_vector_catalog` | 685 comandos, 51 efectos, presets de Image Trace, presets de documento, formatos, bibliotecas de muestras |
| `run_vector_commands` | Cualquier herramienta del motor en una sesión (referencias `$steps[N].id`), sin interfaz o en la app en vivo |
| `open_in_vectorcraft` | Abre archivos en la app de VectorCraft |
| `get_vectorcraft_status` | Plataforma, instalación, versión, comandos, app / puerto de control |

| | |
| --- | --- |
| **Lee** | SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, .drawcraft, .vctemplate, PNG, JPEG, GIF, WebP, TIFF, BMP |
| **Escribe** | SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, TGA, PSD (con capas), TXT, .vectorcraft, plantilla |
| **Efectos** | sombra, resplandor interior / exterior, desvanecer, desenfoque gaussiano, redondear esquinas, garabato, rugosidad, zigzag, fruncir y engordar, torsión, desplazar trazado, 15 deformaciones (arco, bandera, onda, ojo de pez...), ajustes de color, efectos de Pathfinder... |

Las coordenadas son **puntos desde la esquina superior izquierda de la mesa de trabajo** (1 px = 1 pt).

## Ejemplo

```json
{
  "name": "post-oferta",
  "width": 1080,
  "height": 1080,
  "background": "#ff6a00",
  "elements": [
    { "type": "star", "cx": 540, "cy": 420, "radius1": 260, "radius2": 120, "fill": "#ffd23f", "effects": [ { "effect": "stylize.dropShadow" } ] },
    { "type": "text", "text": "OFERTA", "x": 290, "y": 880, "size": 180, "color": "#ffffff" },
    { "type": "chart", "chart_type": "column", "x": 640, "y": 900, "width": 380, "height": 160, "csv": ",2025,2026\nQ1,12,18\nQ2,15,24", "colors": ["#ffffff", "#ffd23f"], "text_color": "#ffffff" }
  ],
  "formats": ["svg", "png", "vectorcraft"],
  "output_dir": "/home/yo/disenos"
}
```

## Requisitos

- **VectorCraft** con `vectorcraft-cli` (probado con **0.7.0**); ver [Plataformas](#plataformas)
- Node.js ≥ 20 (incluido en Claude Desktop para instalaciones `.mcpb`)

## Instalación

### Claude Desktop (recomendado, todas las plataformas)

1. Descarga `vectorcraft-mcp-server.mcpb` de la [última versión](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest).
2. Haz doble clic (o arrástralo a Claude Desktop → *Configuración → Extensiones*) y pulsa **Instalar**.
3. Opcional: si VectorCraft no está en una ubicación estándar, indica su carpeta o la ruta de `vectorcraft-cli` en la configuración de la extensión.

### Codex (OpenAI)

**Recomendado — el marketplace (recibe actualizaciones):** *Complementos → Añadir → Añadir marketplace*, origen `jhonsu01/craft-marketplace`, referencia `main`, y luego instala **VectorCraft Bridge** desde **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Las versiones nuevas llegan al actualizar el marketplace. O sube el zip (Codex lo guarda en tu cuenta y rechaza un zip más nuevo con el mismo nombre):

1. Descarga `vectorcraft-mcp-server-<versión>-codex.zip` de la [última versión](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest).
2. En Codex: *Complementos → Añadir → Nuevo complemento*, elige el zip y pulsa **Añadir complemento**.
3. Codex arranca el servidor con `node`, así que Node.js ≥ 20 debe estar en el `PATH`. Si VectorCraft no está en una ubicación estándar, define `VECTORCRAFT_DIR` o `VECTORCRAFT_CLI` como variables de entorno del sistema (Codex no tiene formulario de configuración para complementos locales).

### Claude Code / otros clientes MCP

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

## Configuración

| Variable | Significado |
| --- | --- |
| `VECTORCRAFT_DIR` | Carpeta de VectorCraft, uno de sus ejecutables, la raíz de un `.tar.gz` (con `bin/`) o `VectorCraft.app`. Por defecto: detección automática |
| `VECTORCRAFT_CLI` | Ruta de `vectorcraft-cli` / `vectorcraft-cli.exe` (tiene prioridad sobre `VECTORCRAFT_DIR`) |
| `VECTORCRAFT_APP` | Ruta de la app de escritorio si está en otro lugar (p. ej. un AppImage de Linux) |
| `VECTORCRAFT_CONTROL_PORT` | Puerto de control de la app de escritorio (por defecto 7979) |
| `VECTORCRAFT_MCP_TIMEOUT` | Segundos máximos por llamada al motor (por defecto 3600) |

## Seguridad

- Los archivos **nunca se sobrescriben** salvo con `overwrite: true`: en una carpeta se usa un nombre libre (`_2`) y un `output_path` existente da error. Las entradas nunca se modifican.
- Todas las rutas deben ser absolutas. El motor corre sin interfaz y nunca edita una ventana de VectorCraft abierta salvo con `live: true`.
- Todo se ejecuta en local, sin acceso a red. Cada trabajo usa un motor privado en una carpeta temporal que se borra al terminar.

## Desarrollo

```bash
npm run build       # TypeScript + bundle de un solo archivo (dist/bundle.cjs)
npm test            # pruebas unitarias (lógica de rutas de Windows, macOS y Linux)
npm run test:e2e    # 19 pruebas de extremo a extremo por MCP stdio real (PNG y diseños sintéticos)
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
npm run pack:codex  # zip de complemento para Codex
```

Prueba de Linux en Docker (descomprime antes `vectorcraft-<versión>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/ruta/a/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licencia

Apache-2.0. VectorCraft es © de sus autores (Storytold), Apache-2.0.
Este proyecto no está afiliado ni respaldado por VectorCraft ni Storytold. Adobe Illustrator es una marca de Adobe.
