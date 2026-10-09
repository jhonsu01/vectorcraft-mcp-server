import { writeFileSync } from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { VectorCraftSession, runCli, withSession } from '../engine.js';
import {
  RASTER_INPUTS, READ, WRITE, WritableFormat, colorSchema, collectInputs, errorResult, exportAll, exportOptionsSchema,
  formatOfPath, formatsSchema, inputsOf, inputsSchema, json, outputFor, point2, preview, toEnginePath, withPreview,
} from './common.js';

// ---------------------------------------------------------------- elements

const effectSchema = z.object({
  effect: z.string().describe('Effect id from list_vector_catalog kind=effects, e.g. "stylize.dropShadow", "distort.roughen", "warp.arc", "blur.gaussian".'),
  params: z.record(z.string(), z.any()).optional().describe('Effect parameters, e.g. {"x": 4, "y": 4, "blur": 6, "opacity": 60}.'),
});

export const elementSchema = z.object({
  type: z.enum(['rectangle', 'ellipse', 'polygon', 'star', 'line', 'path', 'text', 'image', 'chart']),
  x: z.number().optional().describe('rectangle / ellipse / image / chart: left; text: baseline start.'),
  y: z.number().optional().describe('rectangle / ellipse / image / chart: top; text: first baseline.'),
  width: z.number().positive().optional().describe('rectangle / ellipse / image / chart width; text: area-type frame width.'),
  height: z.number().positive().optional(),
  radius: z.number().min(0).optional().describe('rectangle corner radius, or polygon radius.'),
  cx: z.number().optional().describe('polygon / star centre x.'),
  cy: z.number().optional(),
  sides: z.number().int().min(3).optional().describe('polygon sides (default 6).'),
  star_points: z.number().int().min(3).optional().describe('star points (default 5).'),
  radius1: z.number().positive().optional().describe('star outer radius.'),
  radius2: z.number().positive().optional().describe('star inner radius.'),
  rotation: z.number().optional().describe('polygon / star rotation in degrees.'),
  x1: z.number().optional().describe('line start x.'),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  d: z.string().optional().describe('path: SVG path data, e.g. "M0 0 L100 0 L50 80 Z".'),
  points: z.array(point2).optional().describe('path: anchor points [[x, y], ...].'),
  closed: z.boolean().optional().describe('path with points: close it.'),
  fill: colorSchema.optional().describe('"#rrggbb" or "none" (shapes default black, lines none).'),
  stroke: colorSchema.optional().describe('"#rrggbb" or "none" (default none; lines black).'),
  stroke_width: z.number().min(0).optional().describe('Stroke weight in pt.'),
  text: z.string().optional().describe('text: the words (\\n for new lines).'),
  size: z.number().positive().optional().describe('text: font size in pt.'),
  font: z.string().optional().describe('text: font family.'),
  color: colorSchema.optional().describe('text colour.'),
  image_path: z.string().optional().describe('image: absolute PNG, JPEG, SVG, PDF, EPS... path, fitted into x/y/width/height (aspect kept) or centred.'),
  chart_type: z.enum(['column', 'stackedColumn', 'bar', 'stackedBar', 'line', 'area', 'scatter', 'pie', 'radar']).optional(),
  csv: z.string().optional().describe('chart data: first row an empty cell then series names; then one row per category, e.g. ",Sales\\nJan,10\\nFeb,25".'),
  opacity: z.number().min(0).max(100).optional(),
  effects: z.array(effectSchema).max(20).optional().describe('Live effects on this element.'),
});
export type Element = z.infer<typeof elementSchema>;

function paint(el: Element, kind: 'shape' | 'line'): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  out['fill'] = el.fill ?? (kind === 'line' ? 'none' : '#000000');
  out['stroke'] = el.stroke ?? (kind === 'line' ? '#000000' : 'none');
  if (el.stroke_width !== undefined) out['strokeWidth'] = el.stroke_width;
  else if (kind === 'line') out['strokeWidth'] = 1;
  return out;
}

function need(el: Element, ...keys: (keyof Element)[]): void {
  const missing = keys.filter((k) => el[k] === undefined);
  if (missing.length) throw new Error(`${el.type} needs ${missing.join(', ')}.`);
}

/** Draw one element in the active document; returns its object id(s). */
export async function addElement(s: VectorCraftSession, el: Element): Promise<{ type: string; ids: number[] }> {
  let ids: number[] = [];
  switch (el.type) {
    case 'rectangle':
    case 'ellipse': {
      need(el, 'x', 'y', 'width', 'height');
      const r = await s.json('draw_shape', { shape: el.type, x: el.x, y: el.y, width: el.width, height: el.height, ...(el.radius ? { radius: el.radius } : {}), ...paint(el, 'shape') });
      ids = [r['id']];
      break;
    }
    case 'polygon': {
      need(el, 'cx', 'cy', 'radius');
      const r = await s.json('draw_shape', { shape: 'polygon', cx: el.cx, cy: el.cy, radius: el.radius, sides: el.sides ?? 6, ...(el.rotation ? { rotation: el.rotation } : {}), ...paint(el, 'shape') });
      ids = [r['id']];
      break;
    }
    case 'star': {
      need(el, 'cx', 'cy', 'radius1', 'radius2');
      const r = await s.json('draw_shape', {
        shape: 'star', cx: el.cx, cy: el.cy, radius1: el.radius1, radius2: el.radius2, points: el.star_points ?? 5, ...(el.rotation ? { rotation: el.rotation } : {}), ...paint(el, 'shape'),
      });
      ids = [r['id']];
      break;
    }
    case 'line': {
      need(el, 'x1', 'y1', 'x2', 'y2');
      const r = await s.json('draw_shape', { shape: 'line', x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2, ...paint(el, 'line') });
      ids = [r['id']];
      break;
    }
    case 'path': {
      if (!el.d && !el.points) throw new Error('path needs d or points.');
      const open = !el.d && !el.closed;
      const r = await s.json('draw_path', { ...(el.d ? { d: el.d } : { points: el.points, closed: !!el.closed }), ...paint(el, open && el.fill === undefined ? 'line' : 'shape') });
      ids = [r['id']];
      break;
    }
    case 'text': {
      need(el, 'text', 'x', 'y');
      const r = await s.json('add_text', {
        text: el.text, x: el.x, y: el.y, ...(el.size ? { size: el.size } : {}), ...(el.font ? { font: el.font } : {}), ...(el.color ? { color: el.color } : {}),
        ...(el.width ? { width: el.width } : {}), ...(el.height ? { height: el.height } : {}),
      });
      ids = [r['id']];
      break;
    }
    case 'image': {
      need(el, 'image_path');
      const p = collectInputs([el.image_path!])[0];
      const where = el.x !== undefined && el.y !== undefined && el.width && el.height ? { rect: [el.x, el.y, el.width, el.height] } : el.x !== undefined && el.y !== undefined ? { at: [el.x, el.y] } : {};
      const r = await s.json('run_command', { command: 'file.place', params: { path: toEnginePath(p), link: false, ...where } });
      ids = (r['ids'] ?? r['result']?.['ids'] ?? []) as number[];
      break;
    }
    case 'chart': {
      need(el, 'x', 'y', 'width', 'height', 'csv');
      const r = await s.json('create_graph', { type: el.chart_type ?? 'column', x: el.x, y: el.y, width: el.width, height: el.height, csv: el.csv });
      ids = [r['id']];
      break;
    }
  }
  if (el.opacity !== undefined && ids.length) await s.json('run_command', { command: 'transparency.set', params: { ids, opacity: el.opacity } });
  for (const fx of el.effects ?? []) await s.json('apply_effect', { effect: fx.effect, ids, ...(fx.params ? { params: fx.params } : {}) });
  return { type: el.type, ids };
}

// ---------------------------------------------------------------- documents

const UNITS = { px: 'Pixels', pt: 'Points', mm: 'Millimeters', cm: 'Centimeters', in: 'Inches' } as const;

async function openFile(s: VectorCraftSession, input: string): Promise<Record<string, any>> {
  return s.json('open_file', { path: toEnginePath(input) });
}

function deriveFormats(input: string, formats?: WritableFormat[]): WritableFormat[] {
  if (formats?.length) return formats;
  const own = formatOfPath(input);
  return own && !RASTER_INPUTS.includes(path.extname(input).slice(1).toLowerCase()) ? [own] : ['svg'];
}

async function batch(inputs: string[], fn: (input: string) => Promise<{ body: Record<string, unknown>; img?: { data: string; mimeType: string } }>) {
  const results: Record<string, unknown>[] = [];
  let firstImg: { data: string; mimeType: string } | undefined;
  for (const input of inputs) {
    try {
      const r = await fn(input);
      results.push(r.body);
      if (!firstImg && r.img) firstImg = r.img;
    } catch (e) {
      results.push({ success: false, input, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const ok = results.filter((r) => r['success']).length;
  const body = inputs.length === 1 ? results[0] : { success: ok === inputs.length, total: inputs.length, succeeded: ok, results };
  return withPreview(body, firstImg, ok === 0);
}

export function registerVectorTools(server: McpServer): void {
  server.registerTool(
    'get_vector_info',
    {
      title: 'Vector file info',
      description:
        'Summary of any file VectorCraft reads (SVG, PDF, AI, EPS, DXF, EMF, WMF, .vectorcraft, PNG/JPEG...): artboards and sizes, colour ' +
        'mode, units, object counts by kind, fonts (and missing ones), title/author metadata, and import warnings.',
      inputSchema: { input_path: z.string().describe('Absolute path of the file.') },
      annotations: READ,
    },
    async (args) => {
      try {
        const input = collectInputs([args.input_path])[0];
        const r = JSON.parse(await runCli(['info', input]));
        return json({ success: true, input, ...r });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'convert_vector',
    {
      title: 'Convert / export',
      description:
        'Convert one or many files between VectorCraft\'s formats. Reads SVG, SVGZ, PDF, AI, AIT, EPS, DXF, EMF, WMF, .vectorcraft, ' +
        '.drawcraft, PNG, JPEG, GIF, WebP, TIFF, BMP; writes SVG, SVGZ, PDF, EPS, DXF, EMF, WMF, PNG, PNG8, JPEG, WebP, GIF, TIFF, BMP, ' +
        'TGA, PSD (with layers), TXT and .vectorcraft. Several formats at once; all_artboards writes one file per artboard ' +
        '(<name>_ab1.svg...). Results go next to each input or into output_dir. Raster to vector needs vectorize_image.',
      inputSchema: {
        ...inputsSchema,
        formats: formatsSchema,
        all_artboards: z.boolean().default(false).describe('One file per artboard (PDF already holds every artboard).'),
        output_path: z.string().optional().describe('Absolute output file (single input and single format).'),
        output_dir: z.string().optional().describe('Absolute folder for the results. Default: next to each input.'),
        ...exportOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args);
        if (args.output_path && (inputs.length > 1 || args.formats.length > 1)) throw new Error('output_path needs one input and one format; use output_dir.');
        return await batch(inputs, (input) =>
          withSession(async (s) => {
            await openFile(s, input);
            const info = await s.json('inspect_document', { depth: 0 });
            const boards = (info['artboards'] ?? []).length || 1;
            const outputs = [];
            if (args.all_artboards && boards > 1) {
              for (let i = 0; i < boards; i++) {
                outputs.push(
                  ...(await exportAll(s, { input, suffix: `_ab${i + 1}`, output_dir: args.output_dir, overwrite: args.overwrite }, args.formats.filter((f) => f !== 'pdf'), { ...args, artboard: i })),
                );
              }
              if (args.formats.includes('pdf')) outputs.push(...(await exportAll(s, { input, suffix: '', output_dir: args.output_dir, overwrite: args.overwrite }, ['pdf'], args)));
            } else {
              outputs.push(...(await exportAll(s, { input, suffix: '', output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args)));
            }
            return { body: { success: true, input, artboards: boards, outputs } };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'vectorize_image',
    {
      title: 'Vectorize (Image Trace)',
      description:
        'Turn bitmap images (PNG, JPEG, GIF, WebP, TIFF, BMP) into vector art with VectorCraft\'s Image Trace and export it (default SVG; ' +
        'also PDF, EPS, DXF, .vectorcraft...). Use a preset ("High Fidelity Photo", "6 Colors", "16 Colors", "Black and White Logo", ' +
        '"Sketched Art", "Line Art", "Silhouettes"...; list_vector_catalog kind=trace_presets) and/or settings: mode, colors, threshold, ' +
        'paths, corners, noise, ignore_white (drop the white background). Returns path/anchor/colour counts and a preview.',
      inputSchema: {
        ...inputsSchema,
        preset: z.string().optional().describe('Image Trace preset name (default "Default": black and white).'),
        mode: z.enum(['blackAndWhite', 'grayscale', 'color']).optional(),
        colors: z.number().int().min(2).max(256).optional().describe('color / grayscale mode: number of colours.'),
        threshold: z.number().int().min(0).max(255).optional().describe('blackAndWhite mode: darker than this becomes black.'),
        paths: z.number().min(0).max(100).optional().describe('Path fitting: higher follows the pixels more closely.'),
        corners: z.number().min(0).max(100).optional().describe('Higher keeps more sharp corners.'),
        noise: z.number().int().min(0).optional().describe('Ignore areas smaller than this many pixels.'),
        method: z.enum(['abutting', 'overlapping']).optional(),
        ignore_white: z.boolean().optional().describe('Leave white areas out (transparent background).'),
        snap_curves_to_lines: z.boolean().optional(),
        expand: z.boolean().default(true).describe('Keep only the traced paths (false keeps a live trace in .vectorcraft).'),
        formats: formatsSchema.optional().describe('Default ["svg"].'),
        output_path: z.string().optional().describe('Absolute output file (single input; its extension picks the format).'),
        output_dir: z.string().optional().describe('Absolute folder. Default: next to each image.'),
        preview: z.boolean().default(true),
        ...exportOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = inputsOf(args, RASTER_INPUTS);
        if (args.output_path && inputs.length > 1) throw new Error('output_path only works with one input; use output_dir.');
        const formats: WritableFormat[] = args.formats ?? (args.output_path && formatOfPath(args.output_path) ? [formatOfPath(args.output_path)!] : ['svg']);
        const settings: Record<string, unknown> = {};
        for (const [k, v] of Object.entries({ mode: args.mode, colors: args.colors, threshold: args.threshold, paths: args.paths, corners: args.corners, noise: args.noise, method: args.method, ignoreWhite: args.ignore_white, snapCurvesToLines: args.snap_curves_to_lines })) {
          if (v !== undefined) settings[k] = v;
        }
        let presetParams: Record<string, unknown> | undefined;
        return await batch(inputs, (input) =>
          withSession(async (s) => {
            await openFile(s, input);
            if (args.preset && Object.keys(settings).length && !presetParams) {
              const list = (await s.json('run_command', { command: 'imageTrace.presets' }))['presets'] as { name: string; params: Record<string, unknown> }[];
              const p = list.find((x) => x.name.toLowerCase() === args.preset!.toLowerCase());
              if (!p) throw new Error(`Unknown Image Trace preset "${args.preset}". Presets: ${list.map((x) => x.name).join(', ')}`);
              presetParams = p.params;
            }
            await s.json('run_command', { command: 'select.all' });
            const params = Object.keys(settings).length ? { params: { ...(presetParams ?? {}), ...settings } } : args.preset ? { preset: args.preset } : {};
            const traced = await s.json('run_command', { command: args.expand ? 'imageTrace.makeAndExpand' : 'imageTrace.make', params });
            const outputs = await exportAll(s, { input, suffix: '', output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, formats, args);
            return {
              body: { success: true, input, paths: traced['paths'], anchors: traced['anchors'], colors: traced['colors'], outputs },
              img: args.preview ? await preview(s) : undefined,
            };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'create_design',
    {
      title: 'Create a design',
      description:
        'Make new vector artwork from a description and export it: a document of any size (px, pt, mm, cm, in; or a preset like ' +
        '"Letter", "A4", "Instagram Post"...), an optional background colour, and elements in back-to-front order — rectangle, ellipse, ' +
        'polygon, star, line, path (SVG d or points), text, image (placed file) and chart (column, bar, line, area, pie, radar... from CSV), ' +
        'each with fill / stroke / opacity and live effects (drop shadow, glow, roughen, warp...). Coordinates are points from the ' +
        'top-left of the artboard (1 px = 1 pt). Exports to every requested format (default SVG + PNG) and returns a preview.',
      inputSchema: {
        name: z.string().default('design').describe('File name (without extension).'),
        width: z.number().positive().optional().describe('Artboard width in `units` (default 800 px).'),
        height: z.number().positive().optional().describe('Artboard height in `units` (default 600 px).'),
        units: z.enum(['px', 'pt', 'mm', 'cm', 'in']).default('px'),
        preset: z.string().optional().describe('New-document preset name (list_vector_catalog kind=document_presets); width/height override it.'),
        background: colorSchema.optional().describe('Fill the artboard with this colour first.'),
        elements: z.array(elementSchema).max(500).default([]),
        title: z.string().optional().describe('Document title metadata.'),
        formats: formatsSchema.optional().describe('Default ["svg", "png"]. Add "vectorcraft" to keep an editable file.'),
        output_dir: z.string().describe('Absolute folder for the files.'),
        preview: z.boolean().default(true),
        ...exportOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        if (!path.isAbsolute(args.output_dir)) throw new Error('output_dir must be an absolute path.');
        const formats: WritableFormat[] = args.formats ?? ['svg', 'png'];
        const ref = path.join(args.output_dir, `${args.name}.__src`);
        return await withSession(async (s) => {
          const unit = UNITS[args.units];
          const size = (v: number | undefined, def: number) => {
            const n = v ?? (args.preset ? undefined : def);
            if (n === undefined) return {};
            return args.units === 'px' || args.units === 'pt' ? n : `${n} ${args.units}`;
          };
          const w = size(args.width, 800);
          const h = size(args.height, 600);
          await s.json('run_command', {
            command: 'file.new',
            params: {
              name: args.name,
              units: unit,
              ...(args.preset ? { preset: args.preset } : {}),
              ...(typeof w === 'object' ? {} : { width: w }),
              ...(typeof h === 'object' ? {} : { height: h }),
            },
          });
          const info = await s.json('inspect_document', { depth: 0 });
          const ab = (info['artboards'] ?? [])[0] ?? { x: 0, y: 0, width: 800, height: 600 };
          const made: { type: string; ids: number[] }[] = [];
          if (args.background) made.push(await addElement(s, { type: 'rectangle', x: ab.x, y: ab.y, width: ab.width, height: ab.height, fill: args.background, stroke: 'none' }));
          for (const el of args.elements) made.push(await addElement(s, el));
          if (args.title) await s.json('run_command', { command: 'file.info', params: { title: args.title } });
          await s.json('run_command', { command: 'select.none' }).catch(() => undefined);
          const outputs = await exportAll(s, { input: ref, suffix: '', output_dir: args.output_dir, overwrite: args.overwrite }, formats, args);
          return withPreview(
            { success: true, artboard: { width: ab.width, height: ab.height, units: args.units }, elements: made, outputs },
            args.preview ? await preview(s) : undefined,
          );
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'edit_vector',
    {
      title: 'Edit vector artwork',
      description:
        'Open a vector file (SVG, PDF, AI, EPS, .vectorcraft...) and change it, in this order: recolor (map old → new colours), reduce ' +
        'colours, transform everything (scale, rotate, move, reflect), apply live effects to everything, convert text to outlines, add ' +
        'elements (same as create_design), fit the artboard to the art, set metadata; then export (default: the input format, as ' +
        '<name>_edit.<ext>) with a preview. list_colors=true only reports the colours used.',
      inputSchema: {
        input_path: z.string().describe('Absolute path of the file.'),
        list_colors: z.boolean().default(false).describe('Only list the colours used (hex and count); change nothing.'),
        recolor: z.record(z.string(), z.string()).optional().describe('Old colour → new colour, e.g. {"#ff0000": "#0055ff", "#000000": "#222222"}.'),
        reduce_colors: z.number().int().min(1).max(64).optional().describe('Reduce the artwork to this many colours.'),
        transform: z
          .object({
            scale: z.number().positive().optional().describe('%'),
            rotate: z.number().optional().describe('degrees counter-clockwise'),
            dx: z.number().optional(),
            dy: z.number().optional(),
            reflect: z.enum(['vertical', 'horizontal']).optional(),
          })
          .optional(),
        effects: z.array(effectSchema).max(20).optional().describe('Live effects applied to all the art.'),
        text_to_outlines: z.boolean().default(false).describe('Convert all text to paths in the document itself.'),
        add: z.array(elementSchema).max(500).optional().describe('Elements to add on top.'),
        fit_artboard: z.boolean().default(false).describe('Resize the first artboard to the art.'),
        metadata: z.object({ title: z.string().optional(), author: z.string().optional(), description: z.string().optional(), keywords: z.array(z.string()).optional() }).optional(),
        formats: formatsSchema.optional().describe('Default: the input format (raster inputs: svg).'),
        output_path: z.string().optional(),
        output_dir: z.string().optional(),
        suffix: z.string().default('_edit'),
        preview: z.boolean().default(true),
        ...exportOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const input = collectInputs([args.input_path])[0];
        return await withSession(async (s) => {
          await openFile(s, input);
          await s.json('run_command', { command: 'select.all' });
          if (args.list_colors) {
            const r = await s.json('run_command', { command: 'recolor.colors' });
            return json({ success: true, input, colors: r['colors'] });
          }
          const done: string[] = [];
          if (args.recolor && Object.keys(args.recolor).length) {
            await s.json('run_command', { command: 'recolor.apply', params: { map: args.recolor } });
            done.push(`recolor ${Object.keys(args.recolor).length}`);
          }
          if (args.reduce_colors) {
            await s.json('run_command', { command: 'recolor.reduce', params: { colors: args.reduce_colors } });
            done.push(`reduce to ${args.reduce_colors} colours`);
          }
          if (args.transform && Object.keys(args.transform).length) {
            await s.json('transform', { ...args.transform });
            done.push('transform');
          }
          for (const fx of args.effects ?? []) {
            await s.json('run_command', { command: 'select.all' });
            await s.json('apply_effect', { effect: fx.effect, ...(fx.params ? { params: fx.params } : {}) });
            done.push(fx.effect);
          }
          if (args.text_to_outlines) {
            await s.json('run_command', { command: 'select.all' });
            await s.json('run_command', { command: 'type.createOutlines' }).catch(() => undefined);
            done.push('text to outlines');
          }
          for (const el of args.add ?? []) await addElement(s, el);
          if (args.add?.length) done.push(`${args.add.length} element(s)`);
          if (args.fit_artboard) {
            await s.json('run_command', { command: 'artboard.fitToArt', params: { index: 0 } });
            done.push('artboard fitted');
          }
          if (args.metadata) {
            await s.json('run_command', { command: 'file.info', params: args.metadata });
            done.push('metadata');
          }
          if (!done.length) throw new Error('Nothing to change: give recolor, reduce_colors, transform, effects, text_to_outlines, add, fit_artboard or metadata.');
          await s.json('run_command', { command: 'select.none' }).catch(() => undefined);
          const outputs = await exportAll(s, { input, suffix: args.suffix, output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, deriveFormats(input, args.formats), args);
          return withPreview({ success: true, input, applied: done, outputs }, args.preview ? await preview(s) : undefined);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'render_preview',
    {
      title: 'Preview a file',
      description: 'Render an artboard of any file VectorCraft reads to PNG and show it. Saved as output_path or <name>_preview.png next to the input.',
      inputSchema: {
        input_path: z.string().describe('Absolute path of the file.'),
        artboard: z.number().int().min(0).default(0),
        max_side: z.number().int().min(64).max(8192).default(900).describe('Longest side of the PNG in pixels.'),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const input = collectInputs([args.input_path])[0];
        const out = outputFor(input, 'png', '_preview', args);
        return await withSession(async (s) => {
          await openFile(s, input);
          const img = await preview(s, args.artboard, args.max_side);
          if (!img) throw new Error('VectorCraft returned no image.');
          writeFileSync(out, Buffer.from(img.data, 'base64'));
          return withPreview({ success: true, input, artboard: args.artboard, output: out }, img);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
