// End-to-end test over real MCP stdio against dist/bundle.cjs (what the .mcpb runs).
// Needs VectorCraft installed. Usage: npm run build && npm run test:e2e
// E2E_BUNDLE=<path to bundle.cjs> tests another build (e.g. the contents of an unpacked .mcpb).
// Draws its own synthetic PNGs (no personal files).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { deflateSync } from 'zlib';

const out = mkdtempSync(join(tmpdir(), 'vc-e2e-'));
const src = join(out, 'Imágenes ñandú');
mkdirSync(src, { recursive: true });

// --- tiny PNG writer: white background, a red disc, a blue square, a yellow triangle
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(path, w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const logo = join(src, 'logo.png');
png(logo, 400, 300, (x, y) => {
  if ((x - 120) ** 2 + (y - 120) ** 2 < 80 ** 2) return [220, 30, 60];
  if (x > 220 && x < 360 && y > 80 && y < 240) return [20, 90, 200];
  if (y > 150 && y < 270 && Math.abs(x - 200) < (y - 150) * 0.66) return [250, 190, 20];
  return [255, 255, 255];
});
const ink = join(src, 'firma.png');
png(ink, 300, 120, (x, y) => (Math.abs(y - 60 - 30 * Math.sin(x / 25)) < 4 ? [0, 0, 0] : [255, 255, 255]));

const client = new Client({ name: 'e2e', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [process.env.E2E_BUNDLE || 'dist/bundle.cjs'] }));

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  const body = JSON.parse(res.content.find((c) => c.type === 'text').text);
  if (res.isError) console.log('      ', JSON.stringify(body).slice(0, 400));
  return { ...body, _img: res.content.some((c) => c.type === 'image') };
};
const t0 = Date.now();

const { tools } = await client.listTools();
check(tools.length === 10, `10 tools exposed (${tools.map((t) => t.name).join(', ')})`);
check(!JSON.stringify(tools.map((t) => t.inputSchema)).includes('"items":['), 'no JSON Schema tuples in any input schema');

const status = await call('get_vectorcraft_status', {});
check(status.ready && /vectorcraft-cli/.test(status.version) && status.commands >= 500, `VectorCraft ready: ${status.version}, ${status.commands} commands (${status.platform})`);

const design = await call('create_design', {
  name: 'póster',
  width: 800,
  height: 600,
  background: '#fff4e0',
  title: 'Póster e2e',
  elements: [
    { type: 'rectangle', x: 40, y: 40, width: 300, height: 180, radius: 24, fill: '#ff6600', effects: [{ effect: 'stylize.dropShadow', params: { x: 6, y: 6, blur: 8, opacity: 50 } }] },
    { type: 'star', cx: 560, cy: 150, radius1: 110, radius2: 45, fill: '#2266ff', stroke: '#000000', stroke_width: 3 },
    { type: 'ellipse', x: 380, y: 300, width: 160, height: 100, fill: '#00aa66', opacity: 60 },
    { type: 'polygon', cx: 700, cy: 380, radius: 60, sides: 6, fill: '#aa00cc' },
    { type: 'line', x1: 40, y1: 260, x2: 760, y2: 260, stroke: '#333333', stroke_width: 2 },
    { type: 'path', d: 'M60 560 C160 460 260 640 360 540', stroke: '#cc0000', stroke_width: 4, fill: 'none' },
    { type: 'path', points: [[600, 560], [650, 480], [700, 560]], closed: true, fill: '#ffcc00' },
    { type: 'text', text: 'Hola ñandú', x: 60, y: 330, size: 54, color: '#222222' },
    { type: 'image', image_path: logo, x: 60, y: 380, width: 160, height: 120 },
    { type: 'chart', chart_type: 'column', x: 400, y: 420, width: 200, height: 140, csv: ',Ventas\nEne,10\nFeb,25\nMar,18' },
  ],
  formats: ['svg', 'png', 'pdf', 'vectorcraft'],
  output_dir: join(out, 'design'),
});
check(design.success && design.outputs?.length === 4 && design.outputs.every((o) => existsSync(o.path)) && design._img, `create_design: ${design.elements?.length} elements → ${design.outputs?.map((o) => o.format).join(', ')} + preview`);
const svgText = design.success ? readFileSync(design.outputs[0].path, 'utf-8') : '';
check(svgText.includes('ñandú') && svgText.includes('viewBox="0 0 800 600"'), 'SVG keeps the text (ñ) and the 800×600 artboard');

const chart = await call('create_design', {
  name: 'grafico-color',
  width: 520,
  height: 300,
  background: '#0f172a',
  elements: [{ type: 'chart', chart_type: 'column', x: 30, y: 30, width: 380, height: 230, csv: ',Ventas,Costos,Margen\nEne,10,6,4\nFeb,25,12,13\nMar,18,9,9', colors: ['#38bdf8', '#f97316', '#22c55e'], text_color: '#e2e8f0' }],
  formats: ['svg'],
  output_dir: join(out, 'design'),
  preview: false,
});
const chartColors = chart.success ? await call('edit_vector', { input_path: chart.outputs[0].path, list_colors: true }) : {};
const hexes = (chartColors.colors ?? []).map((c) => c.hex);
check(chart.success && ['#38bdf8', '#f97316', '#22c55e', '#e2e8f0'].every((h) => hexes.includes(h)) && !hexes.includes('#000000') && !hexes.includes('#8c8c8c'), `chart colours per series + light axes/legend: ${hexes.join(' ')}`);

const native = design.outputs?.find((o) => o.format === 'vectorcraft')?.path;
const info = await call('get_vector_info', { input_path: native });
check(info.success && info.artboards?.[0]?.rect?.[2] === 800 && info.info?.title === 'Póster e2e' && Object.keys(info.kinds ?? {}).length >= 3, `info: ${JSON.stringify(info.kinds)}`);

const prev = await call('render_preview', { input_path: design.outputs?.[0]?.path, max_side: 300 });
check(prev.success && prev._img && existsSync(prev.output), 'render_preview of the SVG');

const conv = await call('convert_vector', { input_path: design.outputs?.[0]?.path, formats: ['pdf', 'eps', 'dxf', 'emf', 'psd', 'jpg', 'webp'], quality: 80, output_dir: join(out, 'conv') });
check(conv.success && conv.outputs?.length === 7 && conv.outputs.every((o) => o.bytes > 0), `convert_vector: ${conv.outputs?.map((o) => `${o.format} ${o.bytes}B`).join(', ')}`);

const multi = await call('run_vector_commands', {
  open_path: native,
  steps: [{ tool: 'run_command', args: { command: 'artboard.new', params: { width: 300, height: 300 } } }, { tool: 'draw_shape', args: { shape: 'ellipse', x: 900, y: 50, width: 200, height: 200, fill: '#ff0088', stroke: 'none' } }],
  exports: [{ path: join(out, 'two-boards.vectorcraft') }],
});
const perBoard = multi.success ? await call('convert_vector', { input_path: join(out, 'two-boards.vectorcraft'), formats: ['svg', 'png'], all_artboards: true, output_dir: join(out, 'boards') }) : {};
check(perBoard.success && perBoard.artboards === 2 && perBoard.outputs?.length === 4, `all_artboards: ${perBoard.outputs?.map((o) => o.path.split(/[\\/]/).pop()).join(', ')}`);

const tr = await call('vectorize_image', { input_path: logo, preset: '6 Colors', ignore_white: true, formats: ['svg', 'pdf'] });
const trSvg = tr.success ? readFileSync(tr.outputs[0].path, 'utf-8') : '';
check(tr.success && tr.paths >= 3 && tr._img && !/fill="#ffffff"|fill="#fff"/i.test(trSvg), `vectorize colour logo: ${tr.paths} paths, ${tr.anchors} anchors, ${tr.colors} colours, white dropped`);
const bw = await call('vectorize_image', { input_path: ink, mode: 'blackAndWhite', threshold: 128, ignore_white: true, output_path: join(out, 'firma-vector.svg') });
check(bw.success && existsSync(join(out, 'firma-vector.svg')) && bw.paths >= 1, `vectorize black & white signature: ${bw.paths} path(s)`);
const both = await call('vectorize_image', { input_dir: src, preset: '16 Colors', output_dir: join(out, 'traced'), preview: false });
check(both.success && both.succeeded === 2, 'vectorize a whole folder (2 images)');

const colors = await call('edit_vector', { input_path: design.outputs?.[0]?.path, list_colors: true });
check(colors.success && colors.colors?.some((c) => c.hex === '#ff6600'), `edit_vector list_colors: ${colors.colors?.length} colours`);
const ed = await call('edit_vector', {
  input_path: design.outputs?.[0]?.path,
  recolor: { '#ff6600': '#00aa00', '#2266ff': '#ffaa00' },
  transform: { scale: 90 },
  effects: [{ effect: 'distort.roughen', params: { size: 1 } }],
  text_to_outlines: true,
  add: [{ type: 'text', text: 'Editado', x: 600, y: 590, size: 20, color: '#000000' }],
  metadata: { title: 'Editado e2e', author: 'e2e' },
  formats: ['svg', 'vectorcraft'],
});
const edColors = ed.success ? await call('edit_vector', { input_path: ed.outputs[0].path, list_colors: true }) : {};
check(ed.success && edColors.colors?.some((c) => c.hex === '#00aa00') && !edColors.colors?.some((c) => c.hex === '#ff6600'), `edit_vector: ${ed.applied?.join(' · ')}`);

const again = await call('convert_vector', { input_path: design.outputs?.[0]?.path, formats: ['pdf'], output_dir: join(out, 'conv') });
const refused = await call('convert_vector', { input_path: design.outputs?.[0]?.path, formats: ['pdf'], output_path: conv.outputs?.[0]?.path });
check(again.success && /_2\.pdf$/.test(again.outputs?.[0]?.path ?? '') && !refused.success && /already exists/.test(refused.error ?? ''), 'never overwrites: a free name (_2) in a folder, an error for an existing output_path');

const fx = await call('list_vector_catalog', { kind: 'effects' });
const pr = await call('list_vector_catalog', { kind: 'trace_presets' });
const dp = await call('list_vector_catalog', { kind: 'document_presets', filter: 'a4' });
const cm = await call('list_vector_catalog', { kind: 'commands', filter: 'pathfinder' });
check(fx.count >= 40 && pr.count >= 5 && dp.categories?.length >= 1 && cm.count >= 5, `catalog: ${fx.count} effects, ${pr.count} trace presets, A4 presets, ${cm.count} pathfinder commands`);

const pf = await call('run_vector_commands', {
  steps: [
    { tool: 'draw_shape', args: { shape: 'ellipse', x: 50, y: 50, width: 200, height: 200, fill: '#3366ff', stroke: 'none' } },
    { tool: 'draw_shape', args: { shape: 'rectangle', x: 150, y: 150, width: 200, height: 200, fill: '#3366ff', stroke: 'none' } },
    { tool: 'pathfinder', args: { operation: 'unite', ids: ['$steps[0].id', '$steps[1].id'] } },
  ],
  exports: [{ path: join(out, 'united.svg') }, { path: join(out, 'united.png'), scale: 0.5 }],
  preview: true,
});
check(pf.success && pf.exported?.length === 2 && pf._img && existsSync(join(out, 'united.svg')), 'run_vector_commands: pathfinder unite with $steps ids, export SVG + PNG');

await client.close();
console.log(`\n${failed ? `${failed} FAILED` : 'ALL PASSED'} in ${((Date.now() - t0) / 1000).toFixed(1)} s · output in ${out}`);
process.exit(failed ? 1 : 0);
