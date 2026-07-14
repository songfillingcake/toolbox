import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || path.join(
  root,
  '../.cursor/projects/d-code-dev-dev-toolbox/assets/c__Users_Administrator_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-9b50d512-c6fb-4580-a4e4-9eaa7eff19f4.png'
);
const dest = path.join(root, 'tests/fixtures/explain-user-screenshot.png');

const candidates = [
  src,
  path.join(process.env.USERPROFILE || '', '.cursor/projects/d-code-dev-dev-toolbox/assets/c__Users_Administrator_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-9b50d512-c6fb-4580-a4e4-9eaa7eff19f4.png')
];

let found = candidates.find(p => fs.existsSync(p));
if (!found) {
  console.error('User screenshot not found. Pass source path as argv[2].');
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(found, dest);
console.log('Copied to', dest, '(' + fs.statSync(dest).size + ' bytes)');
