/*
 * 无 Gradle 的 Android 构建：aapt2 + javac + d8 + zipalign + apksigner
 * 前置：android/toolchain 下已解压 platform-35、build-tools-35、JDK 17
 * 产物：dist/DeepSeek角色客户端.apk、dist/DeepSeek会话合并.apk
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(root);
const toolchain = path.join(root, 'toolchain');
const buildRoot = path.join(root, 'build');
const distDir = path.join(repo, 'dist');

function locate(dir, test, depth = 4) {
  if (test(dir)) return dir;
  if (depth <= 0) return null;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      const found = locate(full, test, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

function run(command, args, options = {}) {
  const shown = path.basename(command) + ' ' + args.map((a) => (a.length > 60 ? a.slice(0, 57) + '...' : a)).join(' ');
  console.log('  > ' + shown);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: options.cwd || root,
    env: options.env || process.env
  });
  if (result.error) throw new Error('无法执行 ' + command + '：' + result.error.message);
  if (result.status !== 0) throw new Error('命令失败（' + result.status + '）：' + command);
}

function walk(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full, suffix));
    else if (full.endsWith(suffix)) out.push(full);
  }
  return out;
}

// --- 定位工具链 ---------------------------------------------------------
const platformDir = locate(toolchain, (dir) => fs.existsSync(path.join(dir, 'android.jar')));
const buildTools = locate(toolchain, (dir) => fs.existsSync(path.join(dir, 'aapt2.exe')));
const jre = locate(toolchain, (dir) => fs.existsSync(path.join(dir, 'bin', 'java.exe')));

if (!platformDir || !buildTools || !jre) {
  console.error('工具链不完整：', { platformDir, buildTools, jre });
  process.exit(1);
}

const androidJar = path.join(platformDir, 'android.jar');

const aapt2 = path.join(buildTools, 'aapt2.exe');
const zipalign = path.join(buildTools, 'zipalign.exe');
const d8Jar = path.join(buildTools, 'lib', 'd8.jar');
const apksignerJar = path.join(buildTools, 'lib', 'apksigner.jar');
const java17 = path.join(jre, 'bin', 'java.exe');

const jdk8Home = process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', 'javac.exe'))
  ? process.env.JAVA_HOME
  : 'D:\\Program Files\\Java\\jdk1.8.0_351';
const javac8 = path.join(jdk8Home, 'bin', 'javac.exe');
const jar8 = path.join(jdk8Home, 'bin', 'jar.exe');
const keytool = path.join(jdk8Home, 'bin', 'keytool.exe');
if (!fs.existsSync(javac8)) throw new Error('找不到 JDK 8 的 javac：' + javac8);

console.log('android.jar : ' + androidJar);
console.log('build-tools : ' + buildTools);
console.log('jre         : ' + jre);
console.log('javac8      : ' + javac8);

// --- 签名密钥 -----------------------------------------------------------
const keystoreDir = path.join(root, 'keystore');
fs.mkdirSync(keystoreDir, { recursive: true });
const keystore = path.join(keystoreDir, 'dsmigrate.keystore');
const storePass = 'dsmigrate123';
const keyAlias = 'dsmigrate';
if (!fs.existsSync(keystore)) {
  console.log('生成签名密钥 ...');
  run(keytool, [
    '-genkeypair', '-keystore', keystore, '-alias', keyAlias,
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-storetype', 'JKS',
    '-storepass', storePass, '-keypass', storePass,
    '-dname', 'CN=DSMigrate, OU=Community, O=DSMigrate, C=CN'
  ]);
}

// --- App 配置 -----------------------------------------------------------
const apps = [
  {
    id: 'dqeae',
    pkg: 'com.dqeae.app',
    label: 'DQEAE',
    icon: 'dqeae',
    bg: '#0B0D12',
    output: 'DQEAE.apk'
  }
];

const manifestTpl = fs.readFileSync(path.join(root, 'app', 'AndroidManifest.xml.tpl'), 'utf8');
const stylesTpl = fs.readFileSync(path.join(root, 'app', 'styles.xml.tpl'), 'utf8');
const javaTpl = fs.readFileSync(path.join(root, 'app', 'MainActivity.java.tpl'), 'utf8');
const addDex = path.join(root, 'add-dex.py');
const python = 'D:\\deepseekplayground\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe';

fs.mkdirSync(distDir, { recursive: true });

for (const app of apps) {
  console.log('\n===== ' + app.label + ' (' + app.pkg + ') =====');

  const work = path.join(buildRoot, app.id);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.join(work, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(work, 'res', 'values'), { recursive: true });
  fs.mkdirSync(path.join(work, 'classes'), { recursive: true });
  fs.mkdirSync(path.join(work, 'dex'), { recursive: true });

  // 引导页 + 官方 chat-demo 构建产物
  fs.copyFileSync(path.join(repo, 'src', 'native-shell', 'index.html'), path.join(work, 'assets', 'index.html'));
  const appDist = path.join(repo, 'chatdemo', 'app', 'dist');
  if (!fs.existsSync(path.join(appDist, 'index.html'))) {
    throw new Error('缺少 chat-demo 构建产物：' + appDist + '，先运行 node chatdemo/build.mjs');
  }
  fs.cpSync(appDist, path.join(work, 'assets', 'app'), { recursive: true });

  fs.cpSync(path.join(root, 'res', app.icon), path.join(work, 'res'), { recursive: true });

  fs.writeFileSync(
    path.join(work, 'res', 'values', 'strings.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">' + app.label + '</string>\n</resources>\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(work, 'res', 'values', 'styles.xml'),
    stylesTpl.replace(/__BG__/g, app.bg),
    'utf8'
  );

  const manifest = manifestTpl
    .replace(/__PACKAGE__/g, app.pkg)
    .replace(/__VERSION_CODE__/g, '1')
    .replace(/__VERSION_NAME__/g, '1.0');
  fs.writeFileSync(path.join(work, 'AndroidManifest.xml'), manifest, 'utf8');

  const javaDir = path.join(work, 'src', app.pkg.replace(/\./g, path.sep));
  fs.mkdirSync(javaDir, { recursive: true });
  fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), javaTpl.replace(/__PACKAGE__/g, app.pkg), 'utf8');

  console.log('编译资源 ...');
  const resZip = path.join(work, 'res.zip');
  run(aapt2, ['compile', '--dir', path.join(work, 'res'), '-o', resZip]);

  console.log('链接 APK ...');
  const baseApk = path.join(work, 'base.apk');
  run(aapt2, [
    'link', '-o', baseApk,
    '-I', androidJar,
    '--manifest', path.join(work, 'AndroidManifest.xml'),
    '-A', path.join(work, 'assets'),
    '-R', resZip,
    '--auto-add-overlay',
    '--min-sdk-version', '24',
    '--target-sdk-version', '34',
    '--version-code', '1',
    '--version-name', '1.0'
  ]);

  console.log('编译 Java ...');
  const javaFiles = walk(path.join(work, 'src'), '.java');
  run(javac8, [
    '-encoding', 'UTF-8', '-source', '8', '-target', '8',
    '-classpath', androidJar,
    '-d', path.join(work, 'classes'),
    ...javaFiles
  ]);

  console.log('打 classes.jar ...');
  const classesJar = path.join(work, 'classes.jar');
  run(jar8, ['cf', classesJar, '-C', path.join(work, 'classes'), '.']);

  console.log('d8 转 dex ...');
  run(java17, ['-cp', d8Jar, 'com.android.tools.r8.D8', '--lib', androidJar, '--min-api', '24', '--output', path.join(work, 'dex'), classesJar]);

  console.log('合并 dex ...');
  const unsigned = path.join(work, 'unsigned.apk');
  run(python, [addDex, baseApk, path.join(work, 'dex', 'classes.dex'), unsigned]);

  console.log('zipalign ...');
  const aligned = path.join(work, 'aligned.apk');
  run(zipalign, ['-f', '-p', '4', unsigned, aligned]);

  console.log('签名 ...');
  const signed = path.join(work, 'signed.apk');
  run(java17, [
    '-jar', apksignerJar, 'sign',
    '--ks', keystore,
    '--ks-key-alias', keyAlias,
    '--ks-pass', 'pass:' + storePass,
    '--key-pass', 'pass:' + storePass,
    '--out', signed,
    aligned
  ]);

  console.log('校验 ...');
  run(java17, ['-jar', apksignerJar, 'verify', '--verbose', signed]);

  const finalPath = path.join(distDir, app.output);
  fs.copyFileSync(signed, finalPath);
  const size = fs.statSync(finalPath).size;
  console.log('✓ ' + path.relative(repo, finalPath) + '  ' + (size / 1024).toFixed(0) + ' KB');
}

console.log('\n全部 APK 构建完成。');
