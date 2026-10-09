# Changelog

## [1.0.2] - 2026-10-09
### Fixed
- Chart series and category names with commas. VectorCraft's own CSV reader splits on every comma, even inside
  quotes, so `,"Costs, net",Sales` became three series ("Costs", "net", "Sales") and the 1.0.1 note below about
  quotes did not hold. The connector now parses the chart CSV itself (quotes and `""` escapes honoured, blank
  values as 0, a clear error for non-numbers) and gives the engine plain series / categories / rows arrays, which it
  keeps intact.
### Added
- Chart data can also be given without CSV: `series`, `categories` and `rows` (one array of values per category).
### Verified
- Windows 11 and Debian 12 (Docker): 19/19 end-to-end checks each (new: names with commas, from quoted CSV and
  from arrays, keep their names and colours).

## [1.0.1] - 2026-10-09
### Added
- Chart colours in `create_design` and `edit_vector` (`add`): `colors` gives one colour per series in the order of
  the CSV header (bars, slices, lines, areas and their legend swatches), `text_color` colours the axes, tick and
  category labels and the legend text, so charts read well on dark backgrounds. Works for column, bar, stacked,
  line, area, pie, scatter and radar charts; each series is recoloured inside its own group, so the first series'
  black never touches the labels.
- CSV series names honour quotes (`,"Costs, net",Sales`) — only in the connector's own colour mapping; the engine
  still split them, fixed in 1.0.2.
### Verified
- Windows 11 and Debian 12 (Docker): 18/18 end-to-end checks each (new: per-series chart colours on a dark background).

## [1.0.0] - 2026-10-09
### Added
- MCP server on VectorCraft's own engine (`vectorcraft-cli mcp --headless`): one private, headless engine per
  job, so it never edits a VectorCraft window that is open; calls sent one at a time so object ids carry over.
- 10 tools: `vectorize_image` (Image Trace with presets or mode / colours / threshold / paths / corners / noise /
  transparent background, single image or folder), `convert_vector` (20 readable and 19 writable formats, several
  at once, one file per artboard), `create_design` (background, shapes, SVG paths, text, placed images, charts,
  fill / stroke / opacity, live effects), `edit_vector` (recolor, reduce colours, transform, effects, text to
  outlines, add elements, fit artboard, metadata, list colours), `render_preview`, `get_vector_info`,
  `list_vector_catalog` (685 commands, 51 effects, trace and document presets), `run_vector_commands` (any engine
  tool, `$steps` references, headless or live), `open_in_vectorcraft`, `get_vectorcraft_status`.
- Windows, macOS and Linux install detection (Program Files, deb/rpm in /usr/bin, tar.gz in /opt/vectorcraft/bin,
  VectorCraft.app plus the CLI zip, PATH); `VECTORCRAFT_DIR`, `VECTORCRAFT_CLI`, `VECTORCRAFT_APP`,
  `VECTORCRAFT_CONTROL_PORT` settings.
- Input schemas use plain arrays only (no JSON Schema tuples).
- README in 9 languages.
### Verified
- Windows 11 and Debian 12 (Docker, headless, VectorCraft 0.7.0 tar.gz): 17/17 end-to-end checks each.
  macOS is supported by the same code paths but not yet tested on a Mac.
