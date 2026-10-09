import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdvancedTools } from './tools/advanced.js';
import { registerVectorTools } from './tools/vector.js';

/** serverInfo.version comes from package.json (reachable as ../package.json from dist/ and src/). */
export function readPackageVersion(): string {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.resolve(dir, '../package.json'), 'utf-8')) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
  } catch {
    // package.json not shipped next to the bundle: still start
  }
  return '0.0.0-unknown';
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'vectorcraft-mcp-server', version: readPackageVersion() },
    {
      instructions:
        'Works on vector artwork with the engine of the locally installed VectorCraft (Windows, macOS, Linux), an open-source ' +
        'Illustrator-class editor: vectorize bitmaps (Image Trace), convert between SVG, PDF, AI, EPS, DXF, EMF, PNG, JPEG, PSD and more, ' +
        'create designs from shapes, paths, text, images, charts and live effects, recolor and transform existing art, and preview it. ' +
        'Coordinates are points from the top-left of the artboard (1 px = 1 pt). All paths must be absolute; files are never ' +
        'overwritten unless overwrite is true. The engine runs headless and never touches an open VectorCraft window unless live=true. ' +
        'list_vector_catalog lists the 685 commands and 51 effects; run_vector_commands runs any of them.',
    },
  );
  registerVectorTools(server);
  registerAdvancedTools(server);
  return server;
}
