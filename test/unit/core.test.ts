import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { cleanEnv, resolveInstall, resolveInt } from '../../src/config.js';
import { resolveOutputPath, sameFile, toEnginePath } from '../../src/paths.js';
import { substitute } from '../../src/tools/advanced.js';
import { RASTER_INPUTS, collectInputs, formatOfPath } from '../../src/tools/common.js';
import { seriesNames } from '../../src/tools/vector.js';

describe('config', () => {
  it('treats unfilled MCPB placeholders as unset', () => {
    expect(cleanEnv('${user_config.vectorcraft_dir}')).toBeUndefined();
    expect(resolveInt('${user_config.control_port}', 7979, 65535)).toBe(7979);
  });
  it('Windows: install folder, an .exe inside it, or nothing', () => {
    const exists = (p: string) => /^D:\\VC\\vectorcraft(-cli)?\.exe$/i.test(p);
    const r = resolveInstall({ VECTORCRAFT_DIR: 'D:\\VC' }, exists, 'win32', 'C:\\Users\\u');
    expect([r.cli, r.app]).toEqual(['D:\\VC\\vectorcraft-cli.exe', 'D:\\VC\\vectorcraft.exe']);
    expect(resolveInstall({ VECTORCRAFT_DIR: 'D:\\VC\\vectorcraft.exe' }, exists, 'win32').cli).toBe('D:\\VC\\vectorcraft-cli.exe');
    const pf = (p: string) => p === 'C:\\Program Files\\VectorCraft\\vectorcraft-cli.exe';
    expect(resolveInstall({ ProgramFiles: 'C:\\Program Files' }, pf, 'win32').cli).toBe('C:\\Program Files\\VectorCraft\\vectorcraft-cli.exe');
  });
  it('Linux: deb/rpm, tar.gz root, PATH, AppImage app', () => {
    const deb = new Set(['/usr/bin/vectorcraft-cli', '/usr/bin/vectorcraft']);
    expect(Object.values(resolveInstall({}, (p) => deb.has(p), 'linux', '/home/u')).slice(2, 4)).toEqual(['/usr/bin/vectorcraft-cli', '/usr/bin/vectorcraft']);
    const tar = new Set(['/opt/x/vectorcraft-0.7.0/bin/vectorcraft-cli']);
    expect(resolveInstall({ VECTORCRAFT_DIR: '/opt/x/vectorcraft-0.7.0' }, (p) => tar.has(p), 'linux', '/home/u').cli).toBe('/opt/x/vectorcraft-0.7.0/bin/vectorcraft-cli');
    const onPath = new Set(['/srv/vectorcraft-cli']);
    expect(resolveInstall({ PATH: '/usr/sbin:/srv' }, (p) => onPath.has(p), 'linux', '/home/u').cli).toBe('/srv/vectorcraft-cli');
    const img = '/home/u/vectorcraft-0.7.0-linux-x86_64.AppImage';
    expect(resolveInstall({ VECTORCRAFT_APP: img }, (p) => p === img, 'linux', '/home/u').app).toBe(img);
  });
  it('macOS: VectorCraft.app plus the separate CLI zip', () => {
    const files = new Set(['/Applications/VectorCraft.app/Contents/MacOS/VectorCraft', '/usr/local/bin/vectorcraft-cli']);
    const r = resolveInstall({}, (p) => files.has(p), 'darwin', '/Users/u');
    expect([r.cli, r.app]).toEqual(['/usr/local/bin/vectorcraft-cli', '/Applications/VectorCraft.app/Contents/MacOS/VectorCraft']);
  });
});

describe('paths and formats', () => {
  it('never overwrites, POSIX case-sensitive', () => {
    const exists = (p: string) => p === 'D:\\a\\logo.svg';
    expect(resolveOutputPath({ inputPath: 'D:\\a\\logo.png', ext: 'svg', exists, platform: 'win32' })).toEqual({ path: 'D:\\a\\logo_2.svg' });
    expect(resolveOutputPath({ inputPath: '/a/logo.png', ext: 'svg', outputPath: '/a/out.pdf', platform: 'linux' })).toHaveProperty('error');
    expect(sameFile('/a/A.svg', '/a/a.svg', 'linux')).toBe(false);
    expect(toEnginePath('D:\\a\\b.svg', 'win32')).toBe('D:/a/b.svg');
  });
  it('maps extensions to writable formats', () => {
    expect(formatOfPath('x.JPEG')).toBe('jpg');
    expect(formatOfPath('x.tif')).toBe('tiff');
    expect(formatOfPath('x.vctemplate')).toBe('template');
    expect(formatOfPath('x.ai')).toBeUndefined();
  });
  it('collects only rasters for tracing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vc-unit-'));
    for (const f of ['b.png', 'a.JPG', 'c.svg', 'd.txt']) writeFileSync(join(dir, f), 'x');
    expect(collectInputs([], dir, RASTER_INPUTS).map((p) => p.slice(dir.length + 1))).toEqual(['a.JPG', 'b.png']);
    expect(collectInputs([], dir).length).toBe(3);
  });
});

describe('run_vector_commands references', () => {
  it('replaces $steps values', () => {
    expect(substitute({ ids: ['$steps[0].id', '$steps[1].ids[1]'], x: '$x' }, [{ id: 4 }, { ids: [7, 9] }])).toEqual({ ids: [4, 9], x: '$x' });
    expect(() => substitute('$steps[3].id', [])).toThrow();
  });
});

describe('chart series', () => {
  it('reads series names from the CSV header, honouring quotes', () => {
    expect(seriesNames(',Ventas,Costos\nEne,1,2')).toEqual(['Ventas', 'Costos']);
    expect(seriesNames(',"A, B",C\r\nx,1,2')).toEqual(['A, B', 'C']);
    expect(seriesNames(',"Dicho ""x""",Y')).toEqual(['Dicho "x"', 'Y']);
    expect(seriesNames(',Solo')).toEqual(['Solo']);
  });
});

