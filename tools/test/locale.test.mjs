import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyGameLanguage, catalogKeys, normalizeLocale, translate } from '../locale.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

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

test('Minecraft lang files cover the same keys and Korean UI strings are Korean', () => {
  const dir = path.join(root, 'mod', 'src', 'main', 'resources', 'assets', 'agentcraft', 'lang');
  const en = JSON.parse(fs.readFileSync(path.join(dir, 'en_us.json'), 'utf8'));
  const ko = JSON.parse(fs.readFileSync(path.join(dir, 'ko_kr.json'), 'utf8'));
  assert.deepEqual(Object.keys(en), Object.keys(ko));
  for (const key of ['agentcraft.screen.console', 'agentcraft.ui.merge', 'agentcraft.console.placeholder', 'block.agentcraft.task_board', 'key.agentcraft.decisions']) {
    assert.match(ko[key], /[가-힣]/, key);
    assert.notEqual(ko[key], en[key], key);
  }
  assert.match(en['agentcraft.console.placeholder'], /\/help/);
  assert.match(ko['agentcraft.console.placeholder'], /\/help/);
  assert.equal(en['key.category.agentcraft.agentcraft'], 'AgentCraft');
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
