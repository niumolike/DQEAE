/* 生成 THIRD_PARTY_NOTICES.md：扫描 chat-demo 的依赖清单 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('chatdemo/app/node_modules');
const packages = new Map();

function readPackage(dir) {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) return;
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!json.name || !json.version) return;
    const license =
      typeof json.license === 'string'
        ? json.license
        : json.license && json.license.type
          ? json.license.type
          : Array.isArray(json.licenses)
            ? json.licenses.map((item) => item.type).join(' / ')
            : 'UNKNOWN';
    packages.set(json.name + '@' + json.version, {
      name: json.name,
      version: json.version,
      license,
      repository:
        typeof json.repository === 'string'
          ? json.repository
          : json.repository && json.repository.url
            ? json.repository.url
            : ''
    });
  } catch {
    // 忽略损坏的 package.json
  }
}

for (const entry of fs.readdirSync(root)) {
  if (entry.startsWith('.')) continue;
  const full = path.join(root, entry);
  if (entry.startsWith('@')) {
    for (const sub of fs.readdirSync(full)) {
      readPackage(path.join(full, sub));
    }
  } else {
    readPackage(full);
  }
}

const list = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));

const groups = new Map();
for (const item of list) {
  const key = item.license || 'UNKNOWN';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
}

const lines = [];
lines.push('# 第三方组件许可');
lines.push('');
lines.push('本项目包含以下第三方开源组件。各组件版权归其作者所有，按其各自许可证分发。');
lines.push('');
lines.push('聊天界面主体来自 chat-demo（MIT，Copyright (c) 2026 DeepSeek），完整许可见 `chatdemo/app/LICENSE`。');
lines.push('');
for (const [license, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push('## ' + license);
  lines.push('');
  lines.push('| 组件 | 版本 | 仓库 |');
  lines.push('| --- | --- | --- |');
  for (const item of items) {
    const repo = item.repository
      .replace(/^git\+/, '')
      .replace(/\.git$/, '')
      .replace(/^git:\/\//, 'https://');
    lines.push(`| ${item.name} | ${item.version} | ${repo || '—'} |`);
  }
  lines.push('');
}
lines.push('---');
lines.push('');
lines.push('如果你的分发方式要求附上每个组件的完整许可证文本，请在各组件仓库中获取，或使用 `pnpm licenses list --json` 导出后一并附上。');

fs.writeFileSync('THIRD_PARTY_NOTICES.md', lines.join('\n'), 'utf8');
console.log('✓ THIRD_PARTY_NOTICES.md：' + list.length + ' 个组件');
