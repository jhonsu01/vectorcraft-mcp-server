import { ChildProcessWithoutNullStreams, execFile, spawn } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createInterface } from 'readline';
import { COMMAND_TIMEOUT_SEC, resolveInstall } from './config.js';

/** A VectorCraft tool call the engine rejected (unknown tool, bad arguments, file problems...). */
export class VectorCraftToolError extends Error {
  constructor(
    public readonly tool: string,
    message: string,
  ) {
    super(`${tool}: ${message}`);
    this.name = 'VectorCraftToolError';
  }
}

let running = 0;
/** Engine sessions still open (index.ts waits for them before exiting). */
export function pendingRuns(): number {
  return running;
}

export function requireCli(): string {
  const install = resolveInstall();
  if (!install.cli) {
    throw new Error(
      `vectorcraft-cli not found (looked in ${install.searched.slice(0, 6).join(', ')} and PATH). Install VectorCraft ` +
        '(https://github.com/storytold/vectorcraft/releases; on macOS also the vectorcraft-cli zip) or set VECTORCRAFT_DIR / VECTORCRAFT_CLI.',
    );
  }
  return install.cli;
}

export interface ContentItem {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolOutput {
  /** The tool's JSON result (structuredContent, or the parsed text). */
  value: Record<string, any>;
  content: ContentItem[];
}

interface RpcResponse {
  result?: { content?: ContentItem[]; structuredContent?: Record<string, any>; isError?: boolean };
  error?: { message: string };
}

interface Pending {
  resolve: (v: RpcResponse) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * One VectorCraft engine: `vectorcraft-cli mcp` over stdio. Documents stay open in it, so the ids that
 * new objects get (and the active document) carry over to the next calls. Calls are sent one at a time.
 * Each session runs in its own temporary folder, removed when it closes.
 */
export class VectorCraftSession {
  private proc: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private stderr = '';
  private closed = false;
  private readonly workDir: string;
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(cli: string, bridge?: string) {
    this.workDir = mkdtempSync(path.join(os.tmpdir(), 'vcmcp-'));
    // --headless: never attach to (and edit) a VectorCraft window the user has open on the control port
    const args = bridge ? ['mcp', '--connect', bridge] : ['mcp', '--headless'];
    this.proc = spawn(cli, args, { cwd: this.workDir, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    running++;
    this.proc.stderr.setEncoding('utf-8');
    this.proc.stderr.on('data', (d: string) => {
      this.stderr = (this.stderr + d).slice(-4000);
    });
    createInterface({ input: this.proc.stdout }).on('line', (line) => this.onLine(line));
    this.proc.on('error', (e) => this.failAll(e));
    this.proc.on('exit', (code) => this.failAll(new Error(`VectorCraft engine exited (code ${code}). ${this.stderr.trim()}`.trim())));
  }

  static async open(bridge?: string): Promise<VectorCraftSession> {
    const s = new VectorCraftSession(requireCli(), bridge);
    try {
      await s.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'vectorcraft-mcp-server', version: '1' } });
      s.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    } catch (e) {
      s.close();
      throw e;
    }
    return s;
  }

  private send(msg: unknown): void {
    this.proc.stdin.write(JSON.stringify(msg) + '\n');
  }

  private onLine(line: string): void {
    let msg: { id?: number } & RpcResponse;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof msg.id !== 'number') return;
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    p.resolve(msg);
  }

  private failAll(e: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(e);
    }
    this.pending.clear();
    this.finish();
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    running--;
    try {
      rmSync(this.workDir, { recursive: true, force: true });
    } catch {
      // still locked: the OS temp cleanup takes it later
    }
  }

  private rpc(method: string, params: unknown, timeoutSec = COMMAND_TIMEOUT_SEC): Promise<RpcResponse> {
    const run = () =>
      new Promise<RpcResponse>((resolve, reject) => {
        if (this.closed) return reject(new Error('VectorCraft engine is closed.'));
        const id = this.nextId++;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`VectorCraft engine timed out after ${timeoutSec} s (${method}).`));
        }, timeoutSec * 1000);
        this.pending.set(id, { resolve, reject, timer });
        this.send({ jsonrpc: '2.0', id, method, params });
      });
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Call one of VectorCraft's automation tools (same names and arguments as `vectorcraft-cli tools`). */
  async call(tool: string, args: Record<string, unknown> = {}): Promise<ToolOutput> {
    const r = await this.rpc('tools/call', { name: tool, arguments: args });
    if (r.error) throw new VectorCraftToolError(tool, r.error.message);
    const result = r.result ?? {};
    const content = result.content ?? [];
    const text = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n')
      .trim();
    if (result.isError) throw new VectorCraftToolError(tool, text || 'failed');
    let value: Record<string, any> = result.structuredContent ?? {};
    if (!result.structuredContent && text) {
      try {
        value = JSON.parse(text);
      } catch {
        value = { text };
      }
    }
    return { value, content };
  }

  /** The JSON result only. */
  async json<T = Record<string, any>>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
    return (await this.call(tool, args)).value as T;
  }

  close(): void {
    if (this.closed) return;
    try {
      this.proc.stdin.end();
    } catch {
      // already gone
    }
    const p = this.proc;
    setTimeout(() => {
      if (p.exitCode === null) p.kill();
    }, 2000).unref();
    this.finish();
  }
}

/** Open a session, run fn, always close. */
export async function withSession<T>(fn: (s: VectorCraftSession) => Promise<T>, bridge?: string): Promise<T> {
  const s = await VectorCraftSession.open(bridge);
  try {
    return await fn(s);
  } finally {
    s.close();
  }
}

/** One-shot CLI call (--version, info, convert, commands): stdout as text. */
export function runCli(args: string[], timeoutSec = 120): Promise<string> {
  const cli = requireCli();
  return new Promise((resolve, reject) => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), 'vcmcp-'));
    execFile(
      cli,
      args,
      { cwd, windowsHide: true, timeout: timeoutSec * 1000, maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' },
      (err, stdout, stderr) => {
        try {
          rmSync(cwd, { recursive: true, force: true });
        } catch {
          // ignore
        }
        if (err) reject(new Error(`vectorcraft-cli ${args[0]}: ${(stderr || stdout || err.message).toString().trim()}`));
        else resolve(stdout);
      },
    );
  });
}
