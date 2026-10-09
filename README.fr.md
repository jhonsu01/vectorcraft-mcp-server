<p align="center"><img src="icon.png" width="120" alt="Icône de VectorCraft Bridge"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <b>Français</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Laissez Claude travailler sur vos illustrations vectorielles avec le <b>VectorCraft</b> installé sur votre ordinateur — <b>Windows, macOS et Linux</b> :<br>
  vectoriser des images, convertir entre 20 formats, créer et recolorer des visuels avec formes, texte, graphiques et effets.
</p>

---

## Pourquoi

[VectorCraft](https://github.com/storytold/vectorcraft) est un éditeur vectoriel open source, du niveau d'Illustrator, écrit en Rust, avec une CLI sans interface (`vectorcraft-cli`), 685 commandes et un mode MCP. Ce serveur [Model Context Protocol](https://modelcontextprotocol.io) transforme ce moteur en **outils fichier vers fichier** pour Claude, afin de demander par exemple :

> *« Vectorise tous les logos de `D:\logos` avec 6 couleurs et un fond transparent, en SVG et PDF. »*
> *« Fais un visuel 1080×1080 : fond orange, le titre « Soldes » en blanc, une étoile et un histogramme de ces chiffres. »*
> *« Remplace le rouge de `marque.svg` par #0055ff et exporte-le en EPS, DXF et PNG en 2×. »*
> *« Convertis ce fichier AI en SVG avec le texte vectorisé, un fichier par plan de travail. »*

Projet frère de [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) et [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plateformes

| Système | Paquet VectorCraft à installer | Où le serveur le trouve (sans réglage) | État |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portable | `C:\Program Files\VectorCraft`, `%LOCALAPPDATA%\Programs\VectorCraft`, `PATH` | ✅ Vérifié (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/vectorcraft/bin`, `~/.local/bin`, `PATH` | ✅ Vérifié (Debian 12, sans interface) |
| **macOS** 11+ (Apple silicon et Intel) | `.dmg` (l'app) **et** `vectorcraft-cli-<version>-macos-universal.zip` | `/Applications/VectorCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Pris en charge, pas encore testé sur Mac |

Téléchargements : [versions de VectorCraft](https://github.com/storytold/vectorcraft/releases) (il existe aussi un tar.gz pour FreeBSD ; faites pointer `VECTORCRAFT_DIR` dessus). Ailleurs : définissez `VECTORCRAFT_DIR` (dossier, racine du `.tar.gz` ou `VectorCraft.app`) ou `VECTORCRAFT_CLI`.

- **macOS :** le DMG ne contient que l'app. Décompressez le zip séparé de `vectorcraft-cli` et déplacez `vectorcraft-cli` vers `/usr/local/bin` (ou faites pointer `VECTORCRAFT_CLI` dessus). Si macOS bloque son premier lancement, autorisez-le dans *Réglages Système → Confidentialité et sécurité*.
- **Linux :** l'AppImage et le Flatpak ne contiennent que l'app, sans `vectorcraft-cli` ; utilisez le deb, le rpm ou le tar.gz. Si l'app est une AppImage, définissez `VECTORCRAFT_APP` pour que `open_in_vectorcraft` puisse la lancer. Sur un serveur sans GPU, la configuration vérifiée utilisait `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Fonctionnement

| Partie | Description |
| --- | --- |
| **Moteur VectorCraft** (`vectorcraft-cli mcp --headless`) | Le moteur de VectorCraft : importateurs, rendu, Image Trace, effets, Pathfinder, texte, graphiques et exportateurs. Démarré à neuf et **sans interface** pour chaque tâche : il ne modifie jamais une fenêtre VectorCraft ouverte. |
| **Serveur MCP** (Node.js) | 10 outils de haut niveau. Appelle le moteur un appel à la fois (les ids des objets passent d'un appel au suivant), valide les chemins et n'écrase jamais rien. |
| **App en direct** (optionnel) | `run_vector_commands live=true` pilote l'application de bureau via son canal de contrôle (`vectorcraft --control 7979`). |

## Outils

| Outil | Rôle |
| --- | --- |
| `vectorize_image` | Image Trace de PNG / JPEG / TIFF / WebP / GIF / BMP en vecteurs : préréglages (logos, photos, dessin au trait, silhouettes...) ou mode, couleurs, seuil, tracés, angles, bruit, fond transparent ; une image ou un dossier entier |
| `convert_vector` | De tout format lisible vers tout format inscriptible, plusieurs à la fois, un fichier par plan de travail, échelle, qualité, texte vectorisé |
| `create_design` | Nouvelle illustration de toute taille ou préréglage : fond, rectangles, ellipses, polygones, étoiles, lignes, tracés SVG, texte, images importées, graphiques — avec fond, contour, opacité et effets dynamiques |
| `edit_vector` | Recolorer (ancienne → nouvelle couleur), réduire les couleurs, mettre à l'échelle / faire pivoter / déplacer / refléter, effets, texte vectorisé, ajouter des éléments, ajuster le plan de travail, métadonnées ; ou lister les couleurs utilisées |
| `render_preview` | Un plan de travail en PNG, que Claude voit |
| `get_vector_info` | Plans de travail, mode colorimétrique, unités, objets par type, polices (y compris manquantes), métadonnées, avertissements d'import |
| `list_vector_catalog` | 685 commandes, 51 effets, préréglages Image Trace, formats de document, formats, bibliothèques de nuances |
| `run_vector_commands` | N'importe quels outils du moteur dans une session (références `$steps[N].id`), sans interface ou dans l'app en direct |
| `open_in_vectorcraft` | Ouvre des fichiers dans l'app VectorCraft |
| `get_vectorcraft_status` | Plateforme, installation, version, commandes, app / port de contrôle |

| | |
| --- | --- |
| **Lit** | SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, .drawcraft, .vctemplate, PNG, JPEG, GIF, WebP, TIFF, BMP |
| **Écrit** | SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, TGA, PSD (calques), TXT, .vectorcraft, modèle |
| **Effets** | ombre portée, lueur interne / externe, contour progressif, flou gaussien, arrondis, gribouillage, effet de rugosité, zigzag, contraction et dilatation, torsion, décalage du tracé, 15 déformations (arc, drapeau, vague, fisheye...), réglages de couleur, effets Pathfinder... |

Les coordonnées sont des **points depuis le coin supérieur gauche du plan de travail** (1 px = 1 pt).

## Exemple

```json
{
  "name": "visuel-soldes",
  "width": 1080,
  "height": 1080,
  "background": "#ff6a00",
  "elements": [
    { "type": "star", "cx": 540, "cy": 420, "radius1": 260, "radius2": 120, "fill": "#ffd23f", "effects": [ { "effect": "stylize.dropShadow" } ] },
    { "type": "text", "text": "SOLDES", "x": 280, "y": 880, "size": 180, "color": "#ffffff" }
  ],
  "formats": ["svg", "png", "vectorcraft"],
  "output_dir": "/home/moi/visuels"
}
```

## Prérequis

- **VectorCraft** avec `vectorcraft-cli` (testé avec **0.7.0**) ; voir [Plateformes](#plateformes)
- Node.js ≥ 20 (fourni avec Claude Desktop pour les installations `.mcpb`)

## Installation

### Claude Desktop (recommandé, toutes plateformes)

1. Téléchargez `vectorcraft-mcp-server.mcpb` depuis la [dernière version](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest).
2. Double-cliquez dessus (ou glissez-le dans Claude Desktop → *Paramètres → Extensions*) puis cliquez sur **Installer**.
3. Optionnel : si VectorCraft n'est pas à un emplacement standard, indiquez son dossier ou le chemin de `vectorcraft-cli` dans les réglages de l'extension.

### Claude Code / autres clients MCP

```bash
git clone https://github.com/jhonsu01/vectorcraft-mcp-server.git
cd vectorcraft-mcp-server
npm install
npm run build
```

Windows :

```bash
claude mcp add vectorcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux :

```bash
claude mcp add vectorcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Signification |
| --- | --- |
| `VECTORCRAFT_DIR` | Dossier de VectorCraft, l'un de ses exécutables, la racine d'un `.tar.gz` (avec `bin/`) ou `VectorCraft.app`. Par défaut : détection automatique |
| `VECTORCRAFT_CLI` | Chemin de `vectorcraft-cli` / `vectorcraft-cli.exe` (prioritaire sur `VECTORCRAFT_DIR`) |
| `VECTORCRAFT_APP` | Chemin de l'app de bureau si elle est ailleurs (par ex. une AppImage Linux) |
| `VECTORCRAFT_CONTROL_PORT` | Port de contrôle de l'app de bureau (7979 par défaut) |
| `VECTORCRAFT_MCP_TIMEOUT` | Durée maximale en secondes par appel au moteur (3600 par défaut) |

## Sécurité

- Les fichiers ne sont **jamais écrasés** sans `overwrite: true` : dans un dossier un nom libre (`_2`) est utilisé, un `output_path` existant est une erreur. Les entrées ne sont jamais modifiées.
- Tous les chemins doivent être absolus. Le moteur tourne sans interface et ne modifie jamais une fenêtre VectorCraft ouverte, sauf avec `live: true`.
- Tout s'exécute en local, sans accès réseau. Chaque tâche utilise un moteur privé dans un dossier temporaire supprimé ensuite.

## Développement

```bash
npm run build       # TypeScript + bundle en un seul fichier (dist/bundle.cjs)
npm test            # tests unitaires (logique de chemins Windows, macOS et Linux)
npm run test:e2e    # 17 tests de bout en bout via MCP stdio réel (PNG et visuels synthétiques)
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
```

Test Linux dans Docker (décompressez d'abord `vectorcraft-<version>-linux-x86_64.tar.gz`) :

```bash
docker run --rm -v "$PWD:/work:ro" -v "/chemin/vers/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licence

Apache-2.0. VectorCraft est © ses auteurs (Storytold), Apache-2.0.
Ce projet n'est ni affilié à VectorCraft ou Storytold, ni approuvé par eux. Adobe Illustrator est une marque d'Adobe.
