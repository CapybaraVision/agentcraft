import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyGameLanguage, catalogKeys, normalizeLocale, translate } from '../locale.mjs';

// fileURLToPath, not URL.pathname. On Windows pathname is "/C:/..." and
// path.resolve treats the leading slash as "absolute on the current drive",
// so the drive letter becomes a directory: C:\C:\Users\...
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Node's Windows fileURLToPath for a drive or UNC file URL. Platform-independent. */
function windowsPathFromFileUrl(fileUrl) {
  const url = new URL(fileUrl);
  if (url.protocol !== 'file:') throw new Error(`not a file URL: ${fileUrl}`);
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    throw new Error(`bad file URL encoding: ${fileUrl}`);
  }
  if (url.hostname) return `\\\\${decodeURIComponent(url.hostname)}${pathname.replaceAll('/', '\\')}`;
  if (!/^\/[A-Za-z]:\//.test(pathname)) throw new Error(`not a Windows drive file URL: ${fileUrl}`);
  return pathname.slice(1).replaceAll('/', '\\');
}

function windowsCheckoutRoot(fileUrl) {
  return path.win32.resolve(path.win32.dirname(windowsPathFromFileUrl(fileUrl)), '..', '..');
}

test('launcher catalogs share keys and Korean copy is Korean', () => {
  const { ko, en } = catalogKeys();
  assert.deepEqual(ko.sort(), en.sort());
  assert.equal(normalizeLocale(undefined), 'ko');
  assert.equal(normalizeLocale('ko_KR'), 'ko');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.throws(() => normalizeLocale('fr'), /ko or en/);
  const koHelp = translate('ko', 'unix_usage');
  assert.match(koHelp, /[가-힣]/);
  assert.match(koHelp, /--locale ko\|en/);
  assert.match(koHelp, /--backend sim\|claude\|codex/);
  assert.doesNotMatch(koHelp, /--백엔드/);
  const enNode = translate('en', 'fail_node_missing');
  assert.match(enNode, /Node\.js 22\+/);
  assert.match(translate('ko', 'fail_node_missing'), /[가-힣]/);
  assert.match(translate('ko', 'running'), /실행/);
});

test('a Windows file URL is not resolved as a directory on the current drive', () => {
  const fileUrl = 'file:///C:/Users/pop49/AppData/Local/Programs/AgentCraft/tools/test/locale.test.mjs';
  const pathname = new URL(fileUrl).pathname;
  assert.equal(pathname, '/C:/Users/pop49/AppData/Local/Programs/AgentCraft/tools/test/locale.test.mjs');
  // path.win32 leaves the slash-rooted pathname as \C:\... On a C: cwd,
  // path.resolve prefixes that drive and the open() path becomes C:\C:\...
  const rooted = path.win32.normalize(path.win32.join(path.win32.dirname(pathname), '..', '..'));
  assert.equal(rooted, '\\C:\\Users\\pop49\\AppData\\Local\\Programs\\AgentCraft');
  const cwd = 'C:\\Users\\pop49\\AppData\\Local\\Programs\\AgentCraft\\tools';
  const doubled = `${cwd.slice(0, 2)}\\${rooted.replace(/^\\+/, '')}`;
  assert.equal(doubled, 'C:\\C:\\Users\\pop49\\AppData\\Local\\Programs\\AgentCraft');

  const fixed = windowsCheckoutRoot(fileUrl);
  assert.equal(fixed, 'C:\\Users\\pop49\\AppData\\Local\\Programs\\AgentCraft');
  const lang = path.win32.join(fixed, 'mod', 'src', 'main', 'resources', 'assets', 'agentcraft', 'lang', 'en_us.json');
  assert.equal(lang, 'C:\\Users\\pop49\\AppData\\Local\\Programs\\AgentCraft\\mod\\src\\main\\resources\\assets\\agentcraft\\lang\\en_us.json');
  assert.equal(windowsPathFromFileUrl('file:///C:/Users/pop%2049/AgentCraft/tools/test/locale.test.mjs'), 'C:\\Users\\pop 49\\AgentCraft\\tools\\test\\locale.test.mjs');
});

test('Minecraft lang files cover the same keys and Korean UI strings are Korean', () => {
  const dir = path.join(root, 'mod', 'src', 'main', 'resources', 'assets', 'agentcraft', 'lang');
  const en = JSON.parse(fs.readFileSync(path.join(dir, 'en_us.json'), 'utf8'));
  const ko = JSON.parse(fs.readFileSync(path.join(dir, 'ko_kr.json'), 'utf8'));
  assert.deepEqual(Object.keys(en), Object.keys(ko));
  for (const key of ['agentcraft.screen.console', 'agentcraft.ui.merge', 'agentcraft.console.placeholder', 'block.agentcraft.task_board', 'key.agentcraft.decisions', 'agentcraft.hud.doing', 'agentcraft.hud.waiting_press', 'agentcraft.plate.question', 'agentcraft.hud.decisions_n', 'agentcraft.plate.failing_n']) {
    assert.match(ko[key], /[가-힣]/, key);
    assert.notEqual(ko[key], en[key], key);
  }
  assert.match(en['agentcraft.console.placeholder'], /\/help/);
  assert.match(ko['agentcraft.console.placeholder'], /\/help/);
  assert.equal(en['key.category.agentcraft.agentcraft'], 'AgentCraft');
  assert.equal(en['agentcraft.hud.doing'], 'doing');
  assert.equal(en['agentcraft.hud.review'], 'review');
  assert.equal(en['agentcraft.hud.todo'], 'todo');
  assert.equal(en['agentcraft.hud.blocked'], 'blocked');
  assert.equal(en['agentcraft.hud.done_ratio'], '%s/%s done');
  assert.equal(en['agentcraft.hud.waiting_press'], '%s waiting · press');
  assert.equal(en['agentcraft.plate.question'], 'question for you');
  assert.equal(en['agentcraft.hud.decisions_n'], '%s decisions waiting');
  assert.equal(en['agentcraft.plate.failing_n'], '%s failing');
  assert.match(ko['agentcraft.hud.waiting_press'], /%s/);
  assert.match(ko['agentcraft.plate.failing_n'], /%s/);
  const template = fs.readFileSync(path.join(root, 'mod', 'run-template', 'options.txt'), 'utf8');
  assert.match(template, /^lang:ko_kr$/m);
});

test('game language default is applied once and does not overwrite a later choice', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-lang-'));
  const optionsPath = path.join(dir, 'options.txt');
  const templatePath = path.join(dir, 'template.txt');
  const markerPath = path.join(dir, 'agentcraft-locale.applied');
  fs.writeFileSync(templatePath, 'soundCategory_master:0.0\nlang:ko_kr\n');
  fs.writeFileSync(optionsPath, 'soundCategory_master:0.4\nlang:en_us\nguiScale:3\n');
  const first = applyGameLanguage({ optionsPath, templatePath, markerPath, locale: 'ko' });
  assert.equal(first.changed, true);
  assert.match(fs.readFileSync(optionsPath, 'utf8'), /^lang:ko_kr$/m);
  assert.match(fs.readFileSync(optionsPath, 'utf8'), /soundCategory_master:0.4/);
  fs.writeFileSync(optionsPath, fs.readFileSync(optionsPath, 'utf8').replace('lang:ko_kr', 'lang:en_us'));
  const second = applyGameLanguage({ optionsPath, templatePath, markerPath, locale: 'ko' });
  assert.equal(second.changed, false);
  assert.match(fs.readFileSync(optionsPath, 'utf8'), /^lang:en_us$/m);
});

test('English locale seeds a missing options file from the template', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-lang-en-'));
  const optionsPath = path.join(dir, 'options.txt');
  const templatePath = path.join(dir, 'template.txt');
  const markerPath = path.join(dir, 'applied');
  fs.writeFileSync(templatePath, 'lang:ko_kr\n');
  const created = applyGameLanguage({ optionsPath, templatePath, markerPath, locale: 'en' });
  assert.equal(created.created, true);
  assert.match(fs.readFileSync(optionsPath, 'utf8'), /^lang:en_us$/m);
  const skipped = applyGameLanguage({ optionsPath, templatePath, markerPath, locale: 'ko' });
  assert.equal(skipped.reason, 'already-applied');
  assert.match(fs.readFileSync(optionsPath, 'utf8'), /^lang:en_us$/m);
});
