import { existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * An unfilled MCPB user_config placeholder ("${user_config.x}") reaches the process
 * literally when the user left the field empty, so treat it as unset.
 */
export function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(/^"(.*)"$/, '$1');
  if (!v || v.includes('${')) return undefined;
  return v;
}

export type Platform = 'win32' | 'darwin' | 'linux';

export function currentPlatform(): Platform {
  return process.platform === 'win32' || process.platform === 'darwin' ? process.platform : 'linux';
}

/** Path helpers of the given platform (lets the tests check every OS from any OS). */
export function pathFor(platform: Platform): path.PlatformPath {
  return platform === 'win32' ? path.win32 : path.posix;
}

export interface VectorCraftInstall {
  platform: Platform;
  /** Where we looked first (VECTORCRAFT_DIR or the platform default). */
  dir: string;
  cli: string | undefined;
  app: string | undefined;
  searched: string[];
}

/** Executable names of the headless CLI and the desktop app. */
export function exeNames(platform: Platform): { cli: string; app: string[] } {
  if (platform === 'win32') return { cli: 'vectorcraft-cli.exe', app: ['vectorcraft.exe'] };
  // macOS: the app binary inside VectorCraft.app is "VectorCraft"; Linux packages install "vectorcraft"
  return { cli: 'vectorcraft-cli', app: platform === 'darwin' ? ['VectorCraft', 'vectorcraft'] : ['vectorcraft'] };
}

/** Folders VectorCraft installs into on each OS (the official MSI, DMG, deb/rpm and tar.gz layouts). */
export function defaultDirs(platform: Platform, env: NodeJS.ProcessEnv, home = os.homedir()): string[] {
  const p = pathFor(platform);
  if (platform === 'win32') {
    const local = env['LOCALAPPDATA'] || p.join(home, 'AppData', 'Local');
    return [
      p.join(env['ProgramFiles'] || 'C:\\Program Files', 'VectorCraft'),
      p.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'VectorCraft'),
      p.join(local, 'Programs', 'VectorCraft'),
    ];
  }
  if (platform === 'darwin') {
    return [
      '/Applications/VectorCraft.app/Contents/MacOS',
      p.join(home, 'Applications', 'VectorCraft.app', 'Contents', 'MacOS'),
      '/usr/local/bin',
      '/opt/homebrew/bin',
      p.join(home, '.local', 'bin'),
      p.join(home, 'bin'),
    ];
  }
  return ['/usr/bin', '/usr/local/bin', '/opt/vectorcraft/bin', '/opt/vectorcraft', p.join(home, '.local', 'bin'), p.join(home, 'bin')];
}

/**
 * Find vectorcraft-cli and the desktop app.
 *  - VECTORCRAFT_CLI: the CLI executable itself (wins).
 *  - VECTORCRAFT_DIR: install folder, one of its executables, a tar.gz root (with bin/) or VectorCraft.app.
 *  - VECTORCRAFT_APP: the desktop app executable (e.g. an AppImage) when it lives elsewhere.
 *  - otherwise the platform's default folders, then PATH.
 */
export function resolveInstall(
  env: NodeJS.ProcessEnv = process.env,
  exists: (p: string) => boolean = existsSync,
  platform: Platform = currentPlatform(),
  home = os.homedir(),
): VectorCraftInstall {
  const p = pathFor(platform);
  const names = exeNames(platform);
  const dirs: string[] = [];
  const fromEnv = cleanEnv(env['VECTORCRAFT_DIR']);
  if (fromEnv) {
    let d = fromEnv;
    if (/\.app\/?$/i.test(d)) d = p.join(d, 'Contents', 'MacOS');
    else if (/\.(exe|appimage)$/i.test(d) || /(^|[\\/])(vectorcraft|vectorcraft-cli|VectorCraft)$/.test(d)) d = p.dirname(d);
    dirs.push(d, p.join(d, 'bin'));
  }
  dirs.push(...defaultDirs(platform, env, home));
  const sep = platform === 'win32' ? ';' : ':';
  for (const d of (env['PATH'] || env['Path'] || '').split(sep)) if (d) dirs.push(d.replace(/"/g, ''));
  const searched = [...new Set(dirs)];

  const cliEnv = cleanEnv(env['VECTORCRAFT_CLI']);
  const cli = [cliEnv, ...searched.map((d) => p.join(d, names.cli))].filter((x): x is string => !!x).find((x) => exists(x));

  const appEnv = cleanEnv(env['VECTORCRAFT_APP']);
  const appDirs = [...(cli ? [p.dirname(cli)] : []), ...searched];
  if (platform === 'darwin') appDirs.unshift('/Applications/VectorCraft.app/Contents/MacOS', p.join(home, 'Applications', 'VectorCraft.app', 'Contents', 'MacOS'));
  const app = [appEnv, ...appDirs.flatMap((d) => names.app.map((n) => p.join(d, n)))]
    .filter((x): x is string => !!x)
    .find((x) => exists(x));

  return { platform, dir: searched[0], cli, app, searched };
}

/** Positive integer from an env var, otherwise the default. */
export function resolveInt(envValue: string | undefined, def: number, max = 86400): number {
  if (!envValue || !/^\d+$/.test(envValue.trim())) return def;
  const n = Number(envValue.trim());
  return n > 0 && n <= max ? n : def;
}

/** Longest single engine call (tracing a large image or exporting many artboards can take a while). */
export const COMMAND_TIMEOUT_SEC = resolveInt(process.env['VECTORCRAFT_MCP_TIMEOUT'], 3600);

/** Control port of the live VectorCraft app (`vectorcraft --control PORT`, the app default is 7979). */
export const CONTROL_PORT = resolveInt(cleanEnv(process.env['VECTORCRAFT_CONTROL_PORT']), 7979, 65535);
