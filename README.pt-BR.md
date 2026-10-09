<p align="center"><img src="icon.png" width="120" alt="Ícone do VectorCraft Bridge"></p>

<h1 align="center">VectorCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <b>Português</b> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deixe o Claude trabalhar com arte vetorial usando o <b>VectorCraft</b> instalado no seu computador — <b>Windows, macOS e Linux</b>:<br>
  vetorizar imagens, converter entre 20 formatos, criar e recolorir designs com formas, texto, gráficos e efeitos.
</p>

---

## Por quê

O [VectorCraft](https://github.com/storytold/vectorcraft) é um editor vetorial de código aberto, no nível do Illustrator, escrito em Rust, com uma CLI sem interface (`vectorcraft-cli`), 685 comandos e um modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) transforma esse motor em **ferramentas de arquivo para arquivo** para o Claude, para pedir coisas como:

> *"Vetorize todos os logos de `D:\logos` com 6 cores e fundo transparente, em SVG e PDF."*
> *"Faça um post 1080×1080: fundo laranja, o título 'Promoção' em branco, uma estrela e um gráfico de barras com estes números."*
> *"Troque o vermelho de `marca.svg` por #0055ff e exporte como EPS, DXF e PNG em 2×."*
> *"Converta este arquivo AI para SVG com o texto em contornos, um arquivo por prancheta."*

Irmão do [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), do [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) e do [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Pacote do VectorCraft a instalar | Onde o servidor o encontra (sem configurar) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portátil | `C:\Program Files\VectorCraft`, `%LOCALAPPDATA%\Programs\VectorCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/vectorcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sem interface) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (o app) **mais** `vectorcraft-cli-<versão>-macos-universal.zip` | `/Applications/VectorCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Suportado, ainda não testado em um Mac |

Downloads: [versões do VectorCraft](https://github.com/storytold/vectorcraft/releases) (há também um tar.gz para FreeBSD; aponte `VECTORCRAFT_DIR` para ele). Em qualquer outro local: defina `VECTORCRAFT_DIR` (pasta, raiz do `.tar.gz` ou `VectorCraft.app`) ou `VECTORCRAFT_CLI`.

- **macOS:** o DMG contém apenas o app. Descompacte o zip separado do `vectorcraft-cli` e mova `vectorcraft-cli` para `/usr/local/bin` (ou aponte `VECTORCRAFT_CLI` para ele). Se o macOS bloquear a primeira execução, permita em *Ajustes do Sistema → Privacidade e Segurança*.
- **Linux:** o AppImage e o Flatpak contêm apenas o app, sem `vectorcraft-cli`; use o deb, o rpm ou o tar.gz. Se o app for um AppImage, defina `VECTORCRAFT_APP` para que `open_in_vectorcraft` consiga iniciá-lo. Em um servidor sem GPU, a configuração verificada usou `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Como funciona

| Parte | O que é |
| --- | --- |
| **Motor do VectorCraft** (`vectorcraft-cli mcp --headless`) | O próprio motor do VectorCraft: importadores, renderização, Image Trace, efeitos, Pathfinder, texto, gráficos e exportadores. Iniciado do zero e **sem interface** para cada tarefa, então nunca edita uma janela do VectorCraft que você tenha aberta. |
| **Servidor MCP** (Node.js) | 10 ferramentas de alto nível. Chama o motor uma vez por vez (os ids dos objetos passam de uma chamada à seguinte), valida caminhos e nunca sobrescreve. |
| **App ao vivo** (opcional) | `run_vector_commands live=true` controla o app de desktop pelo canal de controle (`vectorcraft --control 7979`). |

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `vectorize_image` | Image Trace de PNG / JPEG / TIFF / WebP / GIF / BMP para vetores: presets (logos, fotos, traço, silhuetas...) ou modo, cores, limiar, caminhos, cantos, ruído, fundo transparente; uma imagem ou uma pasta inteira |
| `convert_vector` | De qualquer formato legível para qualquer gravável, vários de uma vez, um arquivo por prancheta, escala, qualidade, texto em contornos |
| `create_design` | Arte nova de qualquer tamanho ou preset: fundo, retângulos, elipses, polígonos, estrelas, linhas, caminhos SVG, texto, imagens inseridas, gráficos — com preenchimento, traço, opacidade e efeitos ao vivo |
| `edit_vector` | Recolorir (cor antiga → nova), reduzir cores, escalar / girar / mover / refletir, efeitos, texto em contornos, adicionar elementos, ajustar a prancheta, metadados; ou listar as cores usadas |
| `render_preview` | Uma prancheta como PNG, que o Claude vê |
| `get_vector_info` | Pranchetas, modo de cor, unidades, objetos por tipo, fontes (incluindo as ausentes), metadados, avisos de importação |
| `list_vector_catalog` | 685 comandos, 51 efeitos, presets de Image Trace, presets de documento, formatos, bibliotecas de amostras |
| `run_vector_commands` | Qualquer ferramenta do motor em uma sessão (referências `$steps[N].id`), sem interface ou no app ao vivo |
| `open_in_vectorcraft` | Abre arquivos no app VectorCraft |
| `get_vectorcraft_status` | Plataforma, instalação, versão, comandos, app / porta de controle |

| | |
| --- | --- |
| **Lê** | SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, .drawcraft, .vctemplate, PNG, JPEG, GIF, WebP, TIFF, BMP |
| **Grava** | SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, TGA, PSD (com camadas), TXT, .vectorcraft, modelo |
| **Efeitos** | sombra, brilho interno / externo, difusão, desfoque gaussiano, cantos arredondados, rabisco, aspereza, zigue-zague, franzir e inchar, torção, deslocar caminho, 15 deformações (arco, bandeira, onda, olho de peixe...), ajustes de cor, efeitos de Pathfinder... |

As coordenadas são **pontos a partir do canto superior esquerdo da prancheta** (1 px = 1 pt).

## Exemplo

```json
{
  "name": "post-promocao",
  "width": 1080,
  "height": 1080,
  "background": "#ff6a00",
  "elements": [
    { "type": "star", "cx": 540, "cy": 420, "radius1": 260, "radius2": 120, "fill": "#ffd23f", "effects": [ { "effect": "stylize.dropShadow" } ] },
    { "type": "text", "text": "PROMO", "x": 300, "y": 880, "size": 180, "color": "#ffffff" },
    { "type": "chart", "chart_type": "column", "x": 640, "y": 900, "width": 380, "height": 160, "csv": ",2025,2026\nQ1,12,18\nQ2,15,24", "colors": ["#ffffff", "#ffd23f"], "text_color": "#ffffff" }
  ],
  "formats": ["svg", "png", "vectorcraft"],
  "output_dir": "/home/eu/designs"
}
```

## Requisitos

- **VectorCraft** com `vectorcraft-cli` (testado com **0.7.0**); veja [Plataformas](#plataformas)
- Node.js ≥ 20 (incluído no Claude Desktop para instalações `.mcpb`)

## Instalação

### Claude Desktop (recomendado, todas as plataformas)

1. Baixe `vectorcraft-mcp-server.mcpb` da [versão mais recente](https://github.com/jhonsu01/vectorcraft-mcp-server/releases/latest).
2. Clique duas vezes (ou arraste para o Claude Desktop → *Configurações → Extensões*) e clique em **Instalar**.
3. Opcional: se o VectorCraft não estiver em um local padrão, informe a pasta ou o caminho do `vectorcraft-cli` nas configurações da extensão.

### Claude Code / outros clientes MCP

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

## Configuração

| Variável | Significado |
| --- | --- |
| `VECTORCRAFT_DIR` | Pasta do VectorCraft, um de seus executáveis, a raiz de um `.tar.gz` (com `bin/`) ou `VectorCraft.app`. Padrão: detecção automática |
| `VECTORCRAFT_CLI` | Caminho do `vectorcraft-cli` / `vectorcraft-cli.exe` (tem prioridade sobre `VECTORCRAFT_DIR`) |
| `VECTORCRAFT_APP` | Caminho do app de desktop quando está em outro lugar (ex.: um AppImage no Linux) |
| `VECTORCRAFT_CONTROL_PORT` | Porta de controle do app de desktop (padrão 7979) |
| `VECTORCRAFT_MCP_TIMEOUT` | Máximo de segundos por chamada ao motor (padrão 3600) |

## Segurança

- Os arquivos **nunca são sobrescritos**, exceto com `overwrite: true`: em uma pasta é usado um nome livre (`_2`) e um `output_path` existente dá erro. As entradas nunca são modificadas.
- Todos os caminhos devem ser absolutos. O motor roda sem interface e nunca edita uma janela aberta do VectorCraft, exceto com `live: true`.
- Tudo roda localmente, sem acesso à rede. Cada tarefa usa um motor privado em uma pasta temporária que é apagada ao final.

## Desenvolvimento

```bash
npm run build       # TypeScript + bundle de arquivo único (dist/bundle.cjs)
npm test            # testes unitários (lógica de caminhos de Windows, macOS e Linux)
npm run test:e2e    # 18 testes de ponta a ponta via MCP stdio real (PNGs e designs sintéticos)
npm run pack:mcpb   # vectorcraft-mcp-server.mcpb
```

Teste de Linux no Docker (descompacte antes `vectorcraft-<versão>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/caminho/para/vectorcraft-0.7.0-linux-x86_64:/opt/vectorcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licença

Apache-2.0. O VectorCraft é © de seus autores (Storytold), Apache-2.0.
Este projeto não é afiliado nem endossado pelo VectorCraft ou pela Storytold. Adobe Illustrator é marca da Adobe.
