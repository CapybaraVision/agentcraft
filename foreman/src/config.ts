// Configuration: defaults < <AGENTCRAFT_HOME>/config.json < environment < CLI flags.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './util/fsx.js';
import type { BackendName } from './protocol.js';
import { defaultUserName } from './user.js';
import type { EffortLevel } from '@anthropic-ai/claude-agent-sdk';
import {
  badEnginesEntryMessage,
  badLeadReadMessage,
  badProfileMessage,
  deniedLeadReadMessage,
  getLocale,
  missingEngineMessage,
  resolveLocale,
  setLocale,
  t,
  unexpectedArgumentMessage,
  unknownBackendMessage,
  unknownEffortMessage,
  unknownEngineMessage,
  unknownMergeStyleMessage,
  unknownOptionMessage,
  type LocaleId,
} from './locale.js';

export const FOREMAN_VERSION = '0.1.0';

/** Repo root of the AgentCraft project (foreman/src/config.ts -> ../..). */
export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface ClaudeConfig {
  leadModel: string;
  workerModel: string;
  effort: EffortLevel;
  leadEffort: EffortLevel;
  maxTurnsLead: number;
  maxTurnsWorker: number;
  /** max workers running a turn at the same time */
  maxConcurrent: number;
  /** worker ids in the team (subset of the cast) */
  workers: string[];
  /** test command for CI after a worker finishes (default: detect, e.g. `npm test`) */
  ciCommand?: string;
  /** per-turn budget cap passed to the SDK */
  maxBudgetUsdPerTurn?: number;
  /** resume interrupted sessions on Foreman start */
  resumeOnStart: boolean;
  /** lead reviews each finished task before the merge decision reaches the user */
  leadReview: boolean;
  /**
   * Use the local `claude` CLI's claude.ai login instead of an API key / cloud provider. Personal use
   * only: Anthropic does not allow third-party tools to offer claude.ai login (see agents/claude/auth.ts).
   */
  useClaudeLogin: boolean;
  /** command prefixes the lead runs without asking, e.g. `bd show` */
  leadReadCommands: string[];
}

export type EngineName = 'claude' | 'codex';
export const ENGINE_NAMES: readonly EngineName[] = ['claude', 'codex'];

/** Codex engine (`codex app-server`): models and effort default to your Codex config. */
export interface CodexConfig {
  /** the codex CLI (default: `codex` on PATH, else the one inside the Codex desktop app) */
  path?: string;
  leadModel?: string;
  workerModel?: string;
  /** model_reasoning_effort for workers / the lead (low, medium, high, xhigh...) */
  effort?: string;
  leadEffort?: string;
}

/** Which engine runs the lead, the workers, and per-agent exceptions (`--engines kit=codex`). */
export interface EngineChoice {
  lead: EngineName;
  worker: EngineName;
  byAgent: Record<string, EngineName>;
}

export type ShowcaseCheckpoint = 'showcase' | 'showcase-late';

export interface SimConfig {
  speed: number;
  seed: number;
  showcase: boolean;
  /** which static state --showcase holds: the busy mid-run state (default) or `--showcase late` */
  showcaseAt: ShowcaseCheckpoint;
  /** sim answers its own decisions (first option) after a short delay — for unattended runs/tests */
  autoAnswer: boolean;
  /** extra idle log lines while waiting on the user */
  ambient: boolean;
}

export interface Config {
  backend: BackendName;
  /** the person the team works for (prompts, feed, UI); default: the OS user name */
  userName: string;
  home: string;
  profile: string;
  /** profile directory: <home>/<profile> */
  dataDir: string;
  host: string;
  port: number;
  repos: string[];
  goal?: string;
  autostart: boolean;
  reset: boolean;
  notify: boolean;
  toastSilent: boolean;
  debug: boolean;
  quiet: boolean;
  projectRoot: string;
  /** reject WebSocket upgrades that carry a browser Origin (CSRF-style protection) */
  allowBrowserOrigins: boolean;
  /** how often the main checkouts are polled for head/dirty changes (ms) */
  repoPollMs: number;
  /** approved merges: a merge commit (keeps the agents' commits) or one squashed commit */
  mergeStyle: 'merge' | 'squash';
  /** sign approved merge commits when the repo's own git config says commit.gpgsign=true */
  signMerges: boolean;
  /** team settings (workers, CI, review, lead read commands) and the Claude engine's options */
  claude: ClaudeConfig;
  codex: CodexConfig;
  engines: EngineChoice;
  sim: SimConfig;
  /** operator language for help, status and Foreman errors. Default ko. Not a protocol field. */
  locale: LocaleId;
}

type Flags = Record<string, string | boolean>;

export function parseFlags(argv: string[]): { flags: Flags; positional: string[] } {
  const flags: Flags = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq > 0) {
      flags[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    if (key.startsWith('no-')) {
      flags[key.slice(3)] = false;
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else flags[key] = true;
  }
  return { flags, positional };
}

function num(v: unknown, d: number): number {
  if (v === undefined || v === '' || v === true) return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function bool(v: unknown, d: boolean): boolean {
  if (v === undefined) return d;
  if (typeof v === 'boolean') return v;
  return !/^(0|false|no|off)$/i.test(String(v));
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length ? v : undefined;
}

/** Comma list (flag, env) or array (config.json). */
function list(v: unknown): string[] {
  const items = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',') : [];
  return items.map((s) => s.trim()).filter(Boolean);
}

/** Programs that can write, run other code or reach the network: never declarable as lead "read" commands. */
const NOT_READ_ONLY = new Set([
  'git', 'rm', 'mv', 'cp', 'tee', 'dd', 'sed', 'awk', 'find', 'xargs', 'env', 'sudo', 'sh', 'bash', 'zsh',
  'node', 'npm', 'npx', 'python', 'python3', 'pip', 'perl', 'ruby', 'curl', 'wget', 'ssh', 'scp', 'eval', 'exec',
  'cmd', 'powershell', 'pwsh', 'touch', 'mkdir', 'chmod', 'kill',
]);

/** Each entry is a bare program name plus plain words ("bd show"): no paths, shell syntax, or writers/interpreters. */
function readCommands(v: unknown): string[] {
  const entries = list(v);
  for (const e of entries) {
    const [head = '', ...words] = e.split(/\s+/);
    if (!/^[A-Za-z0-9_.+-]+$/.test(head) || !words.every((w) => /^[A-Za-z0-9_.:@+=-]+$/.test(w))) {
      throw new Error(badLeadReadMessage(e));
    }
    if (NOT_READ_ONLY.has(head.toLowerCase().replace(/\.(exe|cmd|bat)$/, ''))) {
      throw new Error(deniedLeadReadMessage(e, head));
    }
  }
  return entries;
}

function mergeStyle(v: unknown): 'merge' | 'squash' {
  if (v === undefined || v === 'merge') return 'merge';
  if (v === 'squash') return 'squash';
  throw new Error(unknownMergeStyleMessage(String(v)));
}

const EFFORTS: EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max'];
function effort(v: unknown, d: EffortLevel): EffortLevel {
  if (v === undefined) return d;
  if (typeof v === 'string' && (EFFORTS as string[]).includes(v)) return v as EffortLevel;
  throw new Error(unknownEffortMessage(String(v), EFFORTS.join(', ')));
}

/** Every flag loadConfig reads (the `no-` prefix is stripped by parseFlags). */
export const KNOWN_FLAGS = new Set([
  'home', 'backend', 'profile', 'user-name', 'use-claude-login', 'repo', 'workers', 'model', 'port', 'goal', 'autostart', 'reset', 'notify',
  'toast-silent', 'debug', 'quiet', 'allow-browser-origins', 'repo-poll-ms', 'merge-style', 'sign-merges',
  'lead-model', 'worker-model', 'effort', 'lead-effort', 'max-turns', 'max-turns-lead', 'max-turns-worker',
  'max-concurrent', 'ci', 'max-budget', 'resume', 'lead-review', 'speed', 'seed', 'showcase', 'auto-answer',
  'ambient', 'lead-read-commands', 'lead-engine', 'worker-engine', 'engines', 'codex-path', 'codex-model', 'codex-lead-model',
  'codex-worker-model', 'codex-effort', 'codex-lead-effort', 'locale',
]);

function engineName(v: unknown, d: EngineName, what: string): EngineName {
  if (v === undefined || v === '') return d;
  if (typeof v === 'string' && (ENGINE_NAMES as string[]).includes(v)) return v as EngineName;
  throw new Error(unknownEngineMessage(what, String(v), ENGINE_NAMES.join(' or ')));
}

/** "kit=codex,wren=claude" (flag/env) or {"kit": "codex"} (config.json) */
function engineMap(v: unknown): Record<string, EngineName> {
  const pairs: Array<[string, unknown]> =
    v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v as Record<string, unknown>) : list(v).map((e) => e.split('=').map((x) => x.trim()) as [string, string]);
  const out: Record<string, EngineName> = {};
  for (const [agent, engine] of pairs) {
    if (!agent || !/^[a-z0-9_-]+$/i.test(agent)) throw new Error(badEnginesEntryMessage(agent, String(engine)));
    if (engine === undefined || engine === '') throw new Error(missingEngineMessage(agent));
    out[agent.toLowerCase()] = engineName(engine, 'claude', `engine for ${agent}`);
  }
  return out;
}

/**
 * Unknown flags and stray positionals are errors, not silently ignored: a mistyped or mangled flag
 * (e.g. PowerShell passing `--workers,kit,--model,sonnet` as ONE argument) would otherwise start a
 * real claude team on the expensive defaults (opus lead, medium effort, three workers).
 */
function checkArgs(flags: Flags, positional: string[]): void {
  const unknown = Object.keys(flags).filter((k) => !KNOWN_FLAGS.has(k));
  if (unknown.length) throw new Error(unknownOptionMessage(unknown));
  if (positional.length) throw new Error(unexpectedArgumentMessage(positional[0]!));
}

export function loadConfig(argv: string[], env: NodeJS.ProcessEnv = process.env): Config {
  const { flags, positional } = parseFlags(argv);
  const home = path.resolve(str(flags.home) ?? env.AGENTCRAFT_HOME ?? path.join(os.homedir(), '.agentcraft'));
  const file = readJson<Record<string, unknown>>(path.join(home, 'config.json')) ?? {};
  setLocale(resolveLocale(flags.locale ?? env.AGENTCRAFT_LOCALE ?? file.locale));
  checkArgs(flags, positional);
  const fileClaude = (file.claude ?? {}) as Record<string, unknown>;
  const fileSim = (file.sim ?? {}) as Record<string, unknown>;
  const fileCodex = (file.codex ?? {}) as Record<string, unknown>;
  const pick = (k: string, envKey?: string): unknown => flags[k] ?? (envKey ? env[envKey] : undefined) ?? file[k];

  const backendRaw = String(pick('backend', 'AGENTCRAFT_BACKEND') ?? 'claude');
  if (backendRaw !== 'sim' && backendRaw !== 'claude' && backendRaw !== 'codex') throw new Error(unknownBackendMessage(backendRaw));
  const backend = backendRaw as BackendName;
  const profile = str(pick('profile', 'AGENTCRAFT_PROFILE')) ?? backend;
  if (!/^[a-zA-Z0-9_-]+$/.test(profile)) throw new Error(badProfileMessage(profile));

  const repoFlag = flags.repo;
  const repos: string[] = [];
  if (typeof repoFlag === 'string') repos.push(...repoFlag.split(',').map((s) => s.trim()).filter(Boolean));
  else if (Array.isArray(file.repos)) repos.push(...(file.repos as string[]));

  const workersRaw = str(flags.workers) ?? env.AGENTCRAFT_WORKERS ?? (fileClaude.workers as string[] | string | undefined);
  const workers = Array.isArray(workersRaw)
    ? workersRaw
    : typeof workersRaw === 'string'
      ? /^\d+$/.test(workersRaw)
        ? ['juniper', 'kit', 'wren', 'rowan', 'tove'].slice(0, Math.max(1, Math.min(5, Number(workersRaw))))
        : workersRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : ['juniper', 'kit', 'wren'];

  const model = str(flags.model);
  const cfg: Config = {
    backend,
    userName: (str(pick('user-name', 'AGENTCRAFT_USER_NAME')) ?? str(file.userName))?.trim().slice(0, 40) || defaultUserName(),
    home,
    profile,
    dataDir: path.join(home, profile),
    host: '127.0.0.1',
    port: num(pick('port', 'AGENTCRAFT_PORT'), 7878),
    repos,
    goal: str(flags.goal),
    autostart: bool(flags.autostart, false) || !!str(flags.goal),
    reset: bool(flags.reset, false),
    notify: bool(pick('notify', 'AGENTCRAFT_NOTIFY'), backend !== 'sim'),
    toastSilent: bool(pick('toast-silent', 'AGENTCRAFT_TOAST_SILENT'), false),
    debug: bool(pick('debug', 'AGENTCRAFT_DEBUG'), false),
    quiet: bool(flags.quiet, false),
    projectRoot: PROJECT_ROOT,
    allowBrowserOrigins: bool(pick('allow-browser-origins'), false),
    repoPollMs: Math.max(500, num(pick('repo-poll-ms'), 10_000)),
    mergeStyle: mergeStyle(pick('merge-style', 'AGENTCRAFT_MERGE_STYLE')),
    // the sim answers merges unattended (screenshot QA, --auto-answer): never sign there
    signMerges: bool(pick('sign-merges', 'AGENTCRAFT_SIGN_MERGES'), backend !== 'sim'),
    claude: {
      leadModel: str(flags['lead-model']) ?? model ?? str(env.AGENTCRAFT_LEAD_MODEL) ?? str(fileClaude.leadModel) ?? 'opus',
      workerModel: str(flags['worker-model']) ?? model ?? str(env.AGENTCRAFT_WORKER_MODEL) ?? str(fileClaude.workerModel) ?? 'sonnet',
      effort: effort(flags.effort ?? fileClaude.effort, 'medium'),
      leadEffort: effort(flags['lead-effort'] ?? flags.effort ?? fileClaude.leadEffort, 'medium'),
      maxTurnsLead: num(flags['max-turns-lead'] ?? flags['max-turns'] ?? fileClaude.maxTurnsLead, 40),
      maxTurnsWorker: num(flags['max-turns-worker'] ?? flags['max-turns'] ?? fileClaude.maxTurnsWorker, 80),
      maxConcurrent: Math.max(1, num(flags['max-concurrent'] ?? fileClaude.maxConcurrent, 3)),
      workers,
      ciCommand: str(flags.ci) ?? str(fileClaude.ciCommand),
      maxBudgetUsdPerTurn: flags['max-budget'] !== undefined ? num(flags['max-budget'], 0) || undefined : (fileClaude.maxBudgetUsdPerTurn as number | undefined),
      resumeOnStart: bool(flags.resume ?? fileClaude.resumeOnStart, true),
      leadReview: bool(flags['lead-review'] ?? fileClaude.leadReview, true),
      useClaudeLogin: bool(flags['use-claude-login'] ?? env.AGENTCRAFT_USE_CLAUDE_LOGIN ?? fileClaude.useClaudeLogin, false),
      leadReadCommands: readCommands(flags['lead-read-commands'] ?? env.AGENTCRAFT_LEAD_READ_COMMANDS ?? fileClaude.leadReadCommands),
    },
    codex: {
      path: str(flags['codex-path']) ?? str(env.AGENTCRAFT_CODEX_PATH) ?? str(fileCodex.path),
      leadModel: str(flags['codex-lead-model']) ?? str(flags['codex-model']) ?? str(fileCodex.leadModel) ?? str(fileCodex.model),
      workerModel: str(flags['codex-worker-model']) ?? str(flags['codex-model']) ?? str(fileCodex.workerModel) ?? str(fileCodex.model),
      effort: str(flags['codex-effort']) ?? str(fileCodex.effort),
      leadEffort: str(flags['codex-lead-effort']) ?? str(flags['codex-effort']) ?? str(fileCodex.leadEffort) ?? str(fileCodex.effort),
    },
    engines: {
      lead: engineName(pick('lead-engine', 'AGENTCRAFT_LEAD_ENGINE') ?? (file.engines as Record<string, unknown> | undefined)?.lead, backend === 'codex' ? 'codex' : 'claude', 'lead engine'),
      worker: engineName(pick('worker-engine', 'AGENTCRAFT_WORKER_ENGINE') ?? (file.engines as Record<string, unknown> | undefined)?.worker, backend === 'codex' ? 'codex' : 'claude', 'worker engine'),
      byAgent: engineMap(flags.engines ?? env.AGENTCRAFT_ENGINES ?? (file.engines as Record<string, unknown> | undefined)?.byAgent),
    },
    sim: {
      speed: Math.max(0.05, num(flags.speed ?? env.AGENTCRAFT_SIM_SPEED ?? fileSim.speed, 1)),
      seed: num(flags.seed ?? fileSim.seed, 7),
      showcase: bool(flags.showcase, false),
      showcaseAt: flags.showcase === 'late' ? 'showcase-late' : 'showcase',
      autoAnswer: bool(flags['auto-answer'] ?? fileSim.autoAnswer, false),
      ambient: bool(flags.ambient ?? fileSim.ambient, true),
    },
    locale: getLocale(),
  };
  if (cfg.sim.showcase) cfg.autostart = true;
  return cfg;
}

/** --help. Honors --locale / AGENTCRAFT_LOCALE. config.json is not read for help. */
export function helpText(argv: string[], env: NodeJS.ProcessEnv = process.env): string {
  const { flags } = parseFlags(argv);
  setLocale(resolveLocale(flags.locale ?? env.AGENTCRAFT_LOCALE));
  return t('help', { version: FOREMAN_VERSION });
}
