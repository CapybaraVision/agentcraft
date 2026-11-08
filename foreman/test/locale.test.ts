import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { helpText, loadConfig } from '../src/config.js';
import {
  DEFAULT_LOCALE,
  getLocale,
  resolveLocale,
  setLocale,
  t,
} from '../src/locale.js';
import { describeRuleKey } from '../src/policy.js';
import { rmrf, tempDir } from './helpers.js';

afterEach(() => setLocale('ko'));

describe('Foreman locale', () => {
  it('defaults to Korean and falls back to English for a missing key', () => {
    expect(DEFAULT_LOCALE).toBe('ko');
    expect(resolveLocale(undefined)).toBe('ko');
    expect(resolveLocale('')).toBe('ko');
    expect(resolveLocale('ko_KR')).toBe('ko');
    expect(resolveLocale('en-US')).toBe('en');
    setLocale('ko');
    expect(t('does_not_exist_key')).toBe('does_not_exist_key');
    expect(t('toast_one')).toMatch(/[가-힣]/);
    expect(t('toast_one')).not.toBe('AgentCraft needs you');
  });

  it('rejects an unknown locale in Korean by default and in English when that is current', () => {
    setLocale('ko');
    expect(() => resolveLocale('fr')).toThrow(/알 수 없는 로케일 "fr"/);
    expect(() => resolveLocale('fr')).toThrow(/ko 또는 en/);
    setLocale('en');
    expect(() => resolveLocale(true)).toThrow('unknown locale "true" (use ko or en)');
  });

  it('prints Korean help by default and English help for --locale en, with flags unchanged', () => {
    const ko = helpText([]);
    expect(getLocale()).toBe('ko');
    expect(ko).toContain('사용법: npm run start -- [옵션]');
    expect(ko).toContain('--backend sim|claude|codex');
    expect(ko).toContain('--locale ko|en');
    expect(ko).not.toContain('--백엔드');
    expect(ko).toMatch(/[가-힣]/);

    const en = helpText(['--locale', 'en']);
    expect(en).toContain('usage: npm run start -- [options]');
    expect(en).toContain('--locale ko|en');
    expect(en).toContain('language for this help, status lines and Foreman errors (default: ko)');
    expect(en).not.toMatch(/[가-힣]/);
  });

  it('loadConfig defaults locale to ko and lets config.json or the flag override it', () => {
    const home = tempDir();
    try {
      expect(loadConfig(['--home', home, '--backend', 'sim'], {}).locale).toBe('ko');
      expect(loadConfig(['--home', home, '--locale', 'en'], {}).locale).toBe('en');
      fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ locale: 'en' }));
      expect(loadConfig(['--home', home], {}).locale).toBe('en');
      expect(loadConfig(['--home', home, '--locale', 'ko'], {}).locale).toBe('ko');
      expect(() => loadConfig(['--home', home, '--locale', 'jp'], {})).toThrow(/"jp"/);
    } finally {
      rmrf(home);
    }
  });

  it('keeps the English wording of config errors and permission scope when locale is en', () => {
    const home = tempDir();
    try {
      expect(() => loadConfig(['--home', home, '--locale', 'en', '--wokers', 'kit'], {})).toThrow(
        'unknown option "--wokers" (see --help)',
      );
      expect(() => loadConfig(['--home', home, '--locale', 'en', '--effort', 'lo'], {})).toThrow(
        'unknown effort "lo" (use low, medium, high, xhigh, max)',
      );
      expect(() => loadConfig(['--home', home, '--locale', 'en', '--worker-engine', 'gemini'], {})).toThrow(
        'unknown worker engine "gemini" (use claude or codex)',
      );
      setLocale('en');
      expect(describeRuleKey('Bash:rm -r')).toBe("`rm -r` inside this agent's worktree (paths outside still ask)");
      expect(describeRuleKey('Bash:outside:rm:wtree:c:\\x')).toBe('rm changing everything under c:\\x');
      expect(describeRuleKey('Write:.git:c:\\wt\\.git')).toBe('Write of c:\\wt\\.git (git internals)');
      expect(describeRuleKey('Bash:npx tsc')).toBe(
        '`npx tsc` even when that downloads it from the npm registry (paths outside still ask)',
      );
      expect(describeRuleKey('Bash:vite serve')).toBe('starting the vite dev server (it listens on a local port)');
      expect(describeRuleKey('Bash:exact:0123456789abcdef')).toBe('only this exact command');
      expect(describeRuleKey('Bash:git checkout:main')).toBe('git checkout to exactly main');
    } finally {
      rmrf(home);
    }
  });

  it('says the same permission scope in Korean without translating the command or path', () => {
    setLocale('ko');
    expect(describeRuleKey('Bash:rm -r')).toBe('`rm -r` 이 에이전트의 작업 트리 안 (밖 경로는 여전히 확인)');
    expect(describeRuleKey('Bash:outside:rm:wtree:c:\\x')).toBe('rm: c:\\x 아래 전체를 변경');
    expect(describeRuleKey('only-this')).toBe('only-this');
  });
});
