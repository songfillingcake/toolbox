import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadBrowserScript(relativePath, exportName) {
  const filePath = path.join(root, relativePath);
  const code = readFileSync(filePath, 'utf8');
  const sandbox = { globalThis: null };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const mod = sandbox[exportName];
  if (!mod) {
    throw new Error('Export not found: ' + exportName + ' in ' + relativePath);
  }
  return mod;
}
