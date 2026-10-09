import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { VectorCraftSession } from '../engine.js';
import { resolveOutputPath, stemOf, toEnginePath } from '../paths.js';

export type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export type ToolResult = { content: Content[]; isError?: boolean };

export function json(obj: unknown, isError = false): ToolResult {
  const out: ToolResult = { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
  if (isError) out.isError = true;
  return out;
}

export function errorResult(e: unknown): ToolResult {
  return json({ success: false, error: e instanceof Error ? e.message : String(e) }, true);
}

export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
export const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

// ---------------------------------------------------------------- formats

/** What VectorCraft opens (vectorcraft-cli --help, "Readable formats"). */
export const READABLE = ['vectorcraft', 'drawcraft', 'svg', 'svgz', 'pdf', 'ai', 'ait', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff', 'bmp', 'vctemplate', 'dxf', 'emf', 'wmf', 'eps'];
export const RASTER_INPUTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff', 'bmp'];

/** What it writes: format id → file extension. */
export const WRITABLE = {
  svg: 'svg',
  svgz: 'svgz',
  pdf: 'pdf',
  eps: 'eps',
  dxf: 'dxf',
  emf: 'emf',
  wmf: 'wmf',
  png: 'png',
  png8: 'png',
  jpg: 'jpg',
  webp: 'webp',
  gif: 'gif',
  tiff: 'tif',
  bmp: 'bmp',
  tga: 'tga',
  psd: 'psd',
  txt: 'txt',
  vectorcraft: 'vectorcraft',
  template: 'vctemplate',
} as const;
export type WritableFormat = keyof typeof WRITABLE;
export const WRITABLE_IDS = Object.keys(WRITABLE) as [WritableFormat, ...WritableFormat[]];

export const formatsSchema = z
  .array(z.enum(WRITABLE_IDS))
  .min(1)
  .max(12)
  .describe('Output formats: svg, svgz, pdf, eps, dxf, emf, wmf (vector), png, png8, jpg, webp, gif, tiff, bmp, tga, psd (raster), txt (text), vectorcraft (editable native file), template.');

// ---------------------------------------------------------------- schemas

/** Plain arrays only: some model APIs reject JSON Schema tuples. */
export const point2 = z.array(z.number()).length(2);
export const colorSchema = z.string().describe('"#rrggbb" or "none".');

export const inputsSchema = {
  input_path: z.string().optional().describe('Absolute path of one file.'),
  input_paths: z.array(z.string()).max(500).optional().describe('Absolute paths of several files.'),
  input_dir: z.string().optional().describe('Absolute folder: every readable file directly inside it (non-recursive).'),
};

export const exportOptionsSchema = {
  scale: z.number().positive().max(64).optional().describe('Raster pixels per point (default 1; 2 = double resolution).'),
  outline_text: z.boolean().optional().describe('SVG: write text as paths (viewable without the fonts).'),
  artboard: z.number().int().min(0).optional().describe('0-based artboard to export (default: the first; PDF: all).'),
  quality: z.number().int().min(1).max(100).optional().describe('JPEG / WebP quality.'),
  overwrite: z.boolean().default(false).describe('Replace existing output files.'),
};

// ---------------------------------------------------------------- inputs

/** Absolute, existing files from explicit paths plus every file with one of exts directly inside dir. */
export function collectInputs(paths: string[], dir?: string, exts = READABLE): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!path.isAbsolute(p)) throw new Error(`Paths must be absolute: ${p}`);
    if (!existsSync(p) || !statSync(p).isFile()) throw new Error(`File not found: ${p}`);
    out.push(p);
  }
  if (dir) {
    if (!path.isAbsolute(dir)) throw new Error(`input_dir must be an absolute path: ${dir}`);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Folder not found: ${dir}`);
    for (const name of readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const full = path.join(dir, name);
      if (exts.includes(path.extname(name).slice(1).toLowerCase()) && statSync(full).isFile()) out.push(full);
    }
  }
  if (out.length === 0) throw new Error('No input files: give input_path, input_paths or input_dir.');
  return out;
}

export function inputsOf(a: { input_path?: string; input_paths?: string[]; input_dir?: string }, exts = READABLE): string[] {
  return collectInputs([...(a.input_path ? [a.input_path] : []), ...(a.input_paths ?? [])], a.input_dir, exts);
}

/** Decide where a result goes (never overwriting unless asked). */
export function outputFor(
  input: string,
  ext: string,
  suffix: string,
  o: { output_path?: string; output_dir?: string; overwrite?: boolean },
): string {
  if (o.output_dir) mkdirSync(o.output_dir, { recursive: true });
  const r = resolveOutputPath({ inputPath: input, ext, suffix, outputPath: o.output_path, outputDir: o.output_dir, overwrite: o.overwrite });
  if ('error' in r) throw new Error(r.error);
  mkdirSync(path.dirname(r.path), { recursive: true });
  return r.path;
}

/** The format a path's extension asks for. */
export function formatOfPath(p: string): WritableFormat | undefined {
  const e = path.extname(p).slice(1).toLowerCase();
  const map: Record<string, WritableFormat> = { jpeg: 'jpg', tif: 'tiff', vctemplate: 'template' };
  const f = (map[e] ?? e) as WritableFormat;
  return f in WRITABLE ? f : undefined;
}

// ---------------------------------------------------------------- engine helpers

export interface ExportOpts {
  scale?: number;
  outline_text?: boolean;
  artboard?: number;
  quality?: number;
}

export interface Exported {
  path: string;
  format: string;
  bytes: number;
  warnings: string[];
}

/** Export the active document to out in format. */
export async function exportActive(s: VectorCraftSession, out: string, format: WritableFormat, o: ExportOpts): Promise<Exported> {
  if (format === 'vectorcraft') {
    const r = await s.json('save_file', { path: toEnginePath(out) });
    return { path: out, format, bytes: r['bytes'], warnings: r['warnings'] ?? [] };
  }
  const r = await s.json('export', {
    path: toEnginePath(out),
    format,
    ...(o.scale ? { scale: o.scale } : {}),
    ...(o.outline_text ? { outlineText: true } : {}),
    ...(o.artboard !== undefined ? { artboard: o.artboard } : {}),
    ...(o.quality ? { options: { quality: o.quality } } : {}),
  });
  return { path: out, format, bytes: r['bytes'], warnings: r['warnings'] ?? [] };
}

/**
 * Export the active document once per format: output_path for the format matching its extension,
 * the others as <output_dir or input folder>/<stem><suffix>.<ext>, never replacing anything.
 */
export async function exportAll(
  s: VectorCraftSession,
  base: { input: string; suffix: string; output_dir?: string; output_path?: string; overwrite?: boolean },
  formats: WritableFormat[],
  o: ExportOpts,
): Promise<Exported[]> {
  const out: Exported[] = [];
  const named = base.output_path ? formatOfPath(base.output_path) : undefined;
  if (base.output_path && !named) throw new Error(`output_path has an extension VectorCraft can't write: ${base.output_path}`);
  const stemSource = base.output_path ? base.output_path + '.__src' : base.input;
  for (const f of formats) {
    const target =
      named === f
        ? outputFor(stemSource, WRITABLE[f], '', { output_path: base.output_path, overwrite: base.overwrite })
        : outputFor(base.output_path ? path.join(path.dirname(base.output_path), stemOf(base.output_path) + '.__src') : base.input, WRITABLE[f], base.output_path ? '' : base.suffix, {
            output_dir: base.output_dir ?? (base.output_path ? path.dirname(base.output_path) : undefined),
            overwrite: base.overwrite,
          });
    out.push(await exportActive(s, target, f, o));
  }
  return out;
}

/** PNG preview of an artboard of the active document, returned as an MCP image. */
export async function preview(s: VectorCraftSession, artboard = 0, maxSide = 900): Promise<{ data: string; mimeType: string } | undefined> {
  const info = await s.json('inspect_document', { depth: 0 });
  const ab = (info['artboards'] ?? [])[artboard] ?? { width: 612, height: 792 };
  const scale = Math.min(2, maxSide / Math.max(ab.width ?? 612, ab.height ?? 792));
  const r = await s.call('screenshot', { artboard, scale });
  const img = r.content.find((c) => c.type === 'image');
  return img?.data ? { data: img.data, mimeType: img.mimeType ?? 'image/png' } : undefined;
}

export function withPreview(body: unknown, img: { data: string; mimeType: string } | undefined, isError = false): ToolResult {
  const res = json(body, isError);
  if (img) res.content.push({ type: 'image', ...img });
  return res;
}

export { stemOf, toEnginePath };
