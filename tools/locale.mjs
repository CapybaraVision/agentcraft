// Launcher language and the one-time Minecraft lang: default. Shared by
// launch.ps1 (via this CLI), unix.mjs, and tests. Flags stay in English.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalogs = JSON.parse(fs.readFileSync(path.join(here, 'locale', 'messages.json'), 'utf8'));

export function normalizeLocale(raw) {
  if (raw === undefined || raw === null || raw === '') return 'ko';
  const v = String(raw).trim().toLowerCase().replaceAll('_', '-');
  if (v === 'ko' || v === 'ko-kr' || v === 'korean') return 'ko';
  if (v === 'en' || v === 'en-us' || v === 'english') return 'en';
  const err = new Error(`unknown locale "${raw}" (use ko or en)`);
  err.code = 'BAD_LOCALE';
  throw err;
}

export function translate(locale, key, vars = {}) {
  const id = normalizeLocale(locale);
  let s = catalogs[id]?.[key] ?? catalogs.en[key] ?? key;
  for (const [name, value] of Object.entries(vars)) s = s.replaceAll(`{${name}}`, String(value));
  return s;
}

export function catalogKeys() {
  return {
    ko: Object.keys(catalogs.ko),
    en: Object.keys(catalogs.en),
  };
}

/**
 * Apply the fork's language default to a game directory once.
 * A new options.txt is copied from the template only for --locale en (the template
 * itself is already ko_kr). An existing options.txt has its lang: line changed once;
 * a marker then keeps a later in-game choice.
 */
export function applyGameLanguage({ optionsPath, templatePath, markerPath, locale }) {
  const id = normalizeLocale(locale);
  const code = id === 'en' ? 'en_us' : 'ko_kr';
  if (fs.existsSync(markerPath)) return { changed: false, reason: 'already-applied', lang: fs.readFileSync(markerPath, 'utf8').trim() };
  let text = null;
  let created = false;
  if (fs.existsSync(optionsPath)) text = fs.readFileSync(optionsPath, 'utf8');
  else if (id === 'en' && templatePath && fs.existsSync(templatePath)) {
    text = fs.readFileSync(templatePath, 'utf8');
    created = true;
  } else return { changed: false, reason: 'no-options', lang: code };
  const next = /^lang:/m.test(text) ? text.replace(/^lang:.*$/m, `lang:${code}`) : `${text.replace(/\s*$/, '')}\nlang:${code}\n`;
  fs.mkdirSync(path.dirname(optionsPath), { recursive: true });
  if (created || next !== text) fs.writeFileSync(optionsPath, next);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.writeFileSync(markerPath, `${code}\n`);
  return { changed: true, created, lang: code };
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) throw new Error(`${name} needs a value`);
  return argv[i + 1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  try {
    if (cmd === 'apply-lang') {
      const locale = normalizeLocale(argValue(process.argv, '--locale'));
      const mod = argValue(process.argv, '--mod');
      const result = applyGameLanguage({
        locale,
        optionsPath: path.join(mod, 'run', 'options.txt'),
        templatePath: path.join(mod, 'run-template', 'options.txt'),
        markerPath: path.join(mod, 'run', 'agentcraft-locale.applied'),
      });
      console.log(JSON.stringify(result));
    } else if (cmd === 'text') {
      const locale = normalizeLocale(argValue(process.argv, '--locale'));
      const key = argValue(process.argv, '--key');
      console.log(translate(locale, key));
    } else {
      console.error('usage: node tools/locale.mjs apply-lang --locale ko|en --mod <mod dir>');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
