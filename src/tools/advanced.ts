import { execFile, spawn } from 'child_process';
import * as net from 'net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { COMMAND_TIMEOUT_SEC, CONTROL_PORT, resolveInstall } from '../config.js';
import { runCli, withSession } from '../engine.js';
import {
  READ, READABLE, WRITABLE, collectInputs, errorResult, formatOfPath, json, outputFor, preview, toEnginePath, withPreview,
} from './common.js';

interface CommandDef {
  id: string;
  label: string;
  menu?: string[];
  params: string;
  enabled?: boolean;
}

let commandCache: CommandDef[] | undefined;
async function engineCommands(): Promise<CommandDef[]> {
  if (!commandCache) commandCache = JSON.parse(await runCli(['commands'])) as CommandDef[];
  return commandCache;
}

export function controlPortOpen(port = CONTROL_PORT, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

function appRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/FI', 'IMAGENAME eq vectorcraft.exe', '/NH'], { windowsHide: true }, (err, out) => resolve(!err && /vectorcraft\.exe/i.test(out)));
    } else {
      // exact process name: never matches our own vectorcraft-cli engines
      execFile('pgrep', ['-xi', 'vectorcraft'], (err, out) => resolve(!err && out.trim().length > 0));
    }
  });
}

/**
 * Replace "$steps[N].path.to[0]" with a value returned by step N (0-based), e.g. "$steps[0].id".
 */
export function substitute(value: unknown, steps: unknown[] = []): unknown {
  if (typeof value === 'string') {
    const st = /^\$steps\[(\d+)\]((?:\.[A-Za-z_]\w*|\[\d+\])*)$/.exec(value);
    if (st) {
      let cur: unknown = steps[Number(st[1])];
      for (const part of st[2].match(/\.[A-Za-z_]\w*|\[\d+\]/g) ?? []) {
        const key = part.startsWith('.') ? part.slice(1) : Number(part.slice(1, -1));
        cur = cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[key] : undefined;
      }
      if (cur === undefined) throw new Error(`${value} is not available (step results so far: ${steps.length}).`);
      return cur;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, steps));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, steps)]));
  return value;
}

export function registerAdvancedTools(server: McpServer): void {
  server.registerTool(
    'list_vector_catalog',
    {
      title: 'List commands, effects, presets, formats',
      description:
        'What VectorCraft can do: commands (685 menu actions with their parameters, for run_vector_commands; filter by id/label/menu), ' +
        'effects (51 live effects with parameters and defaults), trace_presets (Image Trace), document_presets (new-document sizes by ' +
        'category), formats (readable and writable), swatch_libraries.',
      inputSchema: {
        kind: z.enum(['commands', 'effects', 'trace_presets', 'document_presets', 'formats', 'swatch_libraries']),
        filter: z.string().optional().describe('Case-insensitive text to match.'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const f = (args.filter ?? '').toLowerCase();
        const match = (...parts: unknown[]) => !f || parts.some((p) => String(p ?? '').toLowerCase().includes(f));
        if (args.kind === 'formats') return json({ success: true, readable: READABLE, writable: WRITABLE });
        if (args.kind === 'commands') {
          const list = (await engineCommands()).filter((c) => match(c.id, c.label, (c.menu ?? []).join(' ')));
          return json({ success: true, count: list.length, commands: list.slice(0, 250).map((c) => ({ id: c.id, label: c.label, menu: (c.menu ?? []).join(' › '), params: c.params })), truncated: list.length > 250 });
        }
        return json(
          await withSession(async (s) => {
            await s.json('run_command', { command: 'file.new' });
            if (args.kind === 'effects') {
              const cat = ((await s.json('apply_effect', {}))['catalog'] ?? []) as any[];
              const list = cat.filter((e) => match(e.id, e.label, (e.menu ?? []).join(' ')));
              return { success: true, count: list.length, effects: list.map((e) => ({ id: e.id, label: e.label, params: e.params, defaults: e.defaults })) };
            }
            if (args.kind === 'trace_presets') {
              const list = ((await s.json('run_command', { command: 'imageTrace.presets' }))['presets'] ?? []) as any[];
              return { success: true, count: list.length, presets: list.filter((p) => match(p.name)) };
            }
            if (args.kind === 'document_presets') {
              const cats = ((await s.json('run_command', { command: 'file.newPresets' }))['categories'] ?? []) as any[];
              return { success: true, categories: cats.map((c) => ({ name: c.name, presets: (c.presets ?? []).filter((p: any) => match(c.name, p.name)).map((p: any) => ({ name: p.name, size: p.size, units: p.units })) })).filter((c) => c.presets.length) };
            }
            const libs = ((await s.json('run_command', { command: 'swatch.library.list' }))['libraries'] ?? []) as any[];
            return { success: true, count: libs.length, libraries: libs.filter((l) => match(l.name, l.category)) };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'run_vector_commands',
    {
      title: 'Run VectorCraft engine tools',
      description:
        'Advanced: open a file (or start empty) and run VectorCraft engine tools in order in one session — run_command (any of the 685 ' +
        'commands: pathfinder, align, symbols, swatches, gradients, layers, artboards, recolor, blends, perspective...), draw_shape, ' +
        'draw_path, add_text, set_paint, transform, apply_effect, pathfinder, create_graph, text_wrap, inspect_document, undo/redo. ' +
        'Arguments can use "$steps[N].id" for a value returned by step N (0-based). Then export / save to the given files. ' +
        'live=true sends them to the open VectorCraft app instead (started with --control).',
      inputSchema: {
        open_path: z.string().optional().describe('Absolute file to open first (default: a new document).'),
        steps: z.array(z.object({ tool: z.string(), args: z.record(z.string(), z.any()).optional() })).max(500).default([]),
        stop_on_error: z.boolean().default(true),
        exports: z
          .array(z.object({ path: z.string().describe('Absolute file; its extension picks the format.'), artboard: z.number().int().min(0).optional(), scale: z.number().positive().optional() }))
          .optional(),
        overwrite: z.boolean().default(false),
        preview: z.boolean().default(false),
        live: z.boolean().default(false).describe(`Drive the running VectorCraft app (control port ${CONTROL_PORT}).`),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        if (args.open_path) collectInputs([args.open_path]);
        if (args.live && !(await controlPortOpen())) throw new Error(`VectorCraft is not listening on port ${CONTROL_PORT}: call open_in_vectorcraft first.`);
        return await withSession(
          async (s) => {
            if (args.open_path) await s.json('open_file', { path: toEnginePath(args.open_path) });
            else if (!args.live) await s.json('run_command', { command: 'file.new' });
            const values: unknown[] = [];
            const results: Record<string, unknown>[] = [];
            let failed = 0;
            for (const step of args.steps) {
              try {
                const out = await s.call(step.tool, substitute(step.args ?? {}, values) as Record<string, unknown>);
                values.push(out.value);
                results.push({ tool: step.tool, ok: true, result: out.value });
              } catch (e) {
                failed++;
                values.push(undefined);
                results.push({ tool: step.tool, ok: false, error: e instanceof Error ? e.message : String(e) });
                if (args.stop_on_error) break;
              }
            }
            const exported: Record<string, unknown>[] = [];
            if (failed === 0 || !args.stop_on_error) {
              for (const ex of args.exports ?? []) {
                const format = formatOfPath(ex.path);
                if (!format) throw new Error(`Can't write ${ex.path}: unknown extension.`);
                const out = outputFor(ex.path + '.__src', WRITABLE[format], '', { output_path: ex.path, overwrite: args.overwrite });
                const r =
                  format === 'vectorcraft'
                    ? await s.json('save_file', { path: toEnginePath(out) })
                    : await s.json('export', { path: toEnginePath(out), format, ...(ex.artboard !== undefined ? { artboard: ex.artboard } : {}), ...(ex.scale ? { scale: ex.scale } : {}) });
                exported.push({ path: out, format, bytes: r['bytes'], warnings: r['warnings'] ?? [] });
              }
            }
            const body = { success: failed === 0, completed: results.length - failed, failed, results, ...(exported.length ? { exported } : {}) };
            return withPreview(body, args.preview ? await preview(s) : undefined, failed > 0);
          },
          args.live ? `127.0.0.1:${CONTROL_PORT}` : undefined,
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'open_in_vectorcraft',
    {
      title: 'Open in VectorCraft',
      description:
        'Open files in the VectorCraft desktop app for manual editing. With control=true the app also starts its control channel so ' +
        'run_vector_commands live=true can drive it.',
      inputSchema: {
        paths: z.array(z.string()).min(1).max(50).describe('Absolute paths of files VectorCraft reads.'),
        control: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const files = collectInputs(args.paths);
        const install = resolveInstall();
        if (!install.app) throw new Error('VectorCraft desktop app not found. Set VECTORCRAFT_DIR (or VECTORCRAFT_APP for an AppImage).');
        const extra = args.control && !(await controlPortOpen()) ? ['--control', String(CONTROL_PORT)] : [];
        const child = spawn(install.app, [...extra, ...files], { detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', () => undefined);
        child.unref();
        return json({ success: true, app: install.app, opened: files, ...(extra.length ? { control_port: CONTROL_PORT } : {}) });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_vectorcraft_status',
    {
      title: 'VectorCraft status',
      description: 'Check the VectorCraft installation: platform, executables, version, number of commands, whether the app is running / listening for control, formats.',
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const install = resolveInstall();
      const status: Record<string, unknown> = {
        ready: !!install.cli,
        platform: `${install.platform} ${process.arch}`,
        install_dir: install.dir,
        cli: install.cli ?? null,
        app: install.app ?? null,
      };
      try {
        if (!install.cli) throw new Error(`vectorcraft-cli not found (searched ${install.searched.length} folders). Install VectorCraft or set VECTORCRAFT_DIR / VECTORCRAFT_CLI.`);
        status['version'] = (await runCli(['--version'])).split('\n')[0].trim();
        status['commands'] = (await engineCommands()).length;
        status['app_running'] = await appRunning();
        status['control_port'] = CONTROL_PORT;
        status['control_listening'] = await controlPortOpen();
        status['readable'] = READABLE;
        status['writable'] = Object.keys(WRITABLE);
        status['timeout_sec'] = COMMAND_TIMEOUT_SEC;
        return json(status);
      } catch (e) {
        return json({ ...status, ready: false, error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );

}
