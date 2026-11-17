/* 构建 fork 后的 chat-demo：node chatdemo/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(root, 'app');
const rspack = path.join(app, 'node_modules', '@rspack', 'cli', 'bin', 'rspack.js');

if (!fs.existsSync(rspack)) {
  console.error('依赖未安装：先在 chatdemo/app 里执行 pnpm install --node-linker=hoisted');
  process.exit(1);
}

fs.rmSync(path.join(app, 'dist'), { recursive: true, force: true });

const result = spawnSync(process.execPath, [rspack, 'build', '-c', 'rspack.config.ts'], {
  cwd: app,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
console.log('✓ chat-demo 构建完成：' + path.join(app, 'dist'));
