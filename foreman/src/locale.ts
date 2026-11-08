// User-facing Foreman language. Default is Korean. English is --locale en /
// AGENTCRAFT_LOCALE=en / config.json "locale". Missing Korean keys fall back to English.
//
// Flags, commands, file names, protocol fields, and wire error strings stay unchanged.
// This catalog is only the text the operator reads in --help, startup, config mistakes,
// desktop toasts, and permission-scope sentences.

export const LOCALES = ['ko', 'en'] as const;
export type LocaleId = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: LocaleId = 'ko';

type Vars = Record<string, string | number>;

const en: Record<string, string> = {
  bad_locale: 'unknown locale "{value}" (use ko or en)',
  help: `AgentCraft Foreman {version}

usage: npm run start -- [options]

  --backend sim|claude|codex  agent backend (default: claude; codex = an all-Codex team)
  --repo <path>[,<path>]   register local git repo(s) at start (sim: defaults to a fresh sandbox/sim-demo)
  --goal "<text>"          submit a goal right away
  --port <n>               WebSocket port (default 7878, env AGENTCRAFT_PORT)
  --home <dir>             state root (default ~/.agentcraft, env AGENTCRAFT_HOME)
  --user-name <name>       your name, as the agents address you (default: your OS user name,
                           env AGENTCRAFT_USER_NAME, config.json "userName")
  --profile <name>         state profile under home (default: backend name)
  --reset                  wipe this profile's state first (sim: also recreates the demo repo)
  --notify / --no-notify   desktop notification when a decision waits (default: on for claude, off for sim)
  --toast-silent           toasts without sound
  --repo-poll-ms <n>       how often repo checkouts are checked for head/dirty changes (default 10000)
  --merge-style merge|squash  approved merges: merge commit keeping the agents' commits (default),
                           or one squashed commit authored by you
  --no-sign-merges         never sign approved merge commits (default: signed when your git
                           config has commit.gpgsign=true; claude backend only)
  --debug                  verbose logging
  --locale ko|en           language for this help, status lines and Foreman errors (default: ko).
                           English: --locale en, AGENTCRAFT_LOCALE=en, or config.json "locale": "en".
                           Flags, commands, file names and protocol fields are not translated.
                           Minecraft text uses the game language (a new AgentCraft run directory
                           starts on ko_kr; see the README).

 sim backend
  --speed <x>              speed multiplier (default 1)
  --seed <n>               scenario seed (default 7)
  --autostart              start the scripted scenario immediately (otherwise: on first goal.submit)
  --showcase               run to the showcase checkpoint instantly and hold that static state
  --showcase late          hold the later state instead (blocked, error, done and running agents)
  --auto-answer            answer the scenario's own decisions (unattended runs)
  --no-ambient             no idle chatter while waiting on you

 claude backend
  auth: ANTHROPIC_API_KEY, or a cloud provider (CLAUDE_CODE_USE_BEDROCK / _VERTEX / _FOUNDRY)
  --use-claude-login       use your local \`claude\` CLI login instead (personal use only; env
                           AGENTCRAFT_USE_CLAUDE_LOGIN=1, config.json claude.useClaudeLogin)
  --model <m>              model for lead and workers (default lead: opus, workers: sonnet)
  --lead-model <m> / --worker-model <m>
  --effort low|medium|high|xhigh|max   (default medium)
  --max-turns <n>          turn cap per session run (default lead 40 / worker 80)
  --workers <n|ids>        team size or comma list (default juniper,kit,wren)
  --max-concurrent <n>     workers running at once (default 3)
  --max-budget <usd>       per-turn USD cap
  --ci "<cmd>"             test command run after each task (default: detected, e.g. npm test)
  --lead-read-commands "<cmd>,..."
                           read commands the lead runs without asking, by prefix, e.g.
                           "bd show,gh issue view" (env AGENTCRAFT_LEAD_READ_COMMANDS)
  --no-lead-review         skip the lead's review turn before merge decisions
  --no-resume              do not resume interrupted sessions on start

 codex engine (--backend codex, or mixed teams)
  auth: your Codex login (\`codex login\`: ChatGPT or an OpenAI API key)
  --lead-engine claude|codex / --worker-engine claude|codex
                           mix engines (default: the backend's), e.g. a Claude lead with Codex workers
  --engines <agent=engine,...>  per agent, e.g. kit=codex,wren=claude (env AGENTCRAFT_ENGINES)
  --codex-path <path>      the codex CLI (default: on PATH, else the Codex desktop app's)
  --codex-model <m>        model for Codex agents (default: your Codex config's model)
  --codex-lead-model <m> / --codex-worker-model <m>
  --codex-effort <e>       reasoning effort (low|medium|high|xhigh...; default: your Codex config's)
  Codex agents get none of your own MCP servers, plugins, web search or apps; every command and
  out-of-worktree edit goes through the same policy and in-game permission prompts.`,
  profile_in_use: 'profile "{profile}" is in use by the Foreman pid {pid} (ws://{host}:{port}). Stop it first, or use another --profile.',
  reset_wiping: 'reset: wiping {dir}',
  sim_demo: 'sim: creating fresh demo repo at {dir}',
  refuse_wipe: 'refusing to wipe {dir}',
  port_in_use: 'port {port} is already in use - is another Foreman running? (see {runfile} and <home>/<profile>/foreman.json) Use --port or AGENTCRAFT_PORT.',
  listen_fail: 'could not listen on {host}:{port}: {message}',
  banner: 'AgentCraft Foreman {version} | backend {backend} | ws://{host}:{port} | state {dir}',
  repo_line: 'repo {id}: {path} ({branch})',
  repo_add_fail: 'could not add repo {path}: {message}',
  repo_gone: 'repo {id} path is gone: {path}',
  repo_refresh: 'refresh {id}: {message}',
  shutdown: '{sig}: shutting down (state is saved; agents resume on next start)',
  goal_fail: 'goal: {message}',
  uncaught: 'uncaught: {detail}',
  unhandled: 'unhandled rejection: {detail}',
  toast_one: 'AgentCraft needs you',
  toast_many: 'AgentCraft: {n} decisions waiting',
  toast_failed: 'desktop notification failed',
  toast_error: 'toast notification failed: {message}',
  tui_paused: '(paused)',
  tui_off_shift: '(off shift)',
  tui_unknown: 'unknown command /{cmd}',
  rule_exact: 'only this exact command',
  rule_outside_tree_read: '{cmd} reading everything under {path}',
  rule_outside_tree_change: '{cmd} changing everything under {path}',
  rule_outside_files_r: '{cmd} reading files in {path}',
  rule_outside_files_w: '{cmd} writing files in {path}',
  rule_outside_files_x: '{cmd} running files in {path}',
  rule_net: '{cmd} network access to {host}',
  rule_cd: 'changing directory to {dir}',
  rule_git: 'git {sub} to exactly {target}',
  rule_npx: '`{cmd}` even when that downloads it from the npm registry (paths outside still ask)',
  rule_serve: 'starting the {name} dev server (it listens on a local port)',
  rule_git_internal: '{tool} of {path} (git internals)',
  rule_pattern: '{tool} with only this exact pattern',
  rule_bash: '`{cmd}` inside this agent\'s worktree (paths outside still ask)',
  rule_tree: '{tool} under {path}',
  rule_generic: '{tool} in {path}',
};

const ko: Record<string, string> = {
  bad_locale: '알 수 없는 로케일 "{value}" (ko 또는 en)',
  help: `AgentCraft Foreman {version}

사용법: npm run start -- [옵션]

  --backend sim|claude|codex  에이전트 백엔드 (기본값: claude. codex 는 Codex 팀 전체)
  --repo <path>[,<path>]   시작 때 등록할 로컬 git 저장소 (sim: 새 sandbox/sim-demo 를 기본으로 씀)
  --goal "<text>"          바로 목표를 제출
  --port <n>               WebSocket 포트 (기본 7878, 환경변수 AGENTCRAFT_PORT)
  --home <dir>             상태 디렉터리 (기본 ~/.agentcraft, 환경변수 AGENTCRAFT_HOME)
  --user-name <name>       에이전트가 부를 이름 (기본: OS 사용자 이름,
                           환경변수 AGENTCRAFT_USER_NAME, config.json "userName")
  --profile <name>         home 아래 상태 프로필 (기본: 백엔드 이름)
  --reset                  이 프로필 상태를 지우고 시작 (sim: 데모 저장소도 다시 만듦)
  --notify / --no-notify   결정이 기다릴 때 바탕화면 알림 (기본: claude 켜짐, sim 꺼짐)
  --toast-silent           소리 없는 알림
  --repo-poll-ms <n>       체크아웃의 head/변경 사항을 확인하는 간격 (기본 10000)
  --merge-style merge|squash  승인된 병합: 에이전트 커밋을 남기는 merge 커밋(기본),
                           또는 사용자 이름으로 만든 squash 커밋 하나
  --no-sign-merges         승인된 병합 커밋에 서명하지 않음 (기본: git 설정
                           commit.gpgsign=true 일 때 서명. claude 백엔드만)
  --debug                  자세한 로그
  --locale ko|en           이 도움말, 상태, 포어맨 오류의 언어 (기본값: ko).
                           영어: --locale en, AGENTCRAFT_LOCALE=en, 또는 config.json "locale": "en".
                           플래그, 명령, 파일 이름, 프로토콜 필드는 번역하지 않습니다.
                           마인크래프트 문장은 게임 언어를 따릅니다 (새 실행 디렉터리는 ko_kr.
                           README 참고).

 sim 백엔드
  --speed <x>              속도 배수 (기본 1)
  --seed <n>               시나리오 시드 (기본 7)
  --autostart              스크립트 시나리오를 바로 시작 (아니면 첫 goal.submit 때)
  --showcase               쇼케이스 지점까지 즉시 진행하고 그 상태를 유지
  --showcase late          더 늦은 상태를 유지 (막힘, 오류, 완료, 작업 중인 에이전트)
  --auto-answer            시나리오의 결정에 스스로 답함 (무인 실행)
  --no-ambient             사용자를 기다리는 동안의 잡담 끄기

 claude 백엔드
  인증: ANTHROPIC_API_KEY, 또는 클라우드 (CLAUDE_CODE_USE_BEDROCK / _VERTEX / _FOUNDRY)
  --use-claude-login       로컬 \`claude\` CLI 로그인 사용 (개인 사용만. 환경변수
                           AGENTCRAFT_USE_CLAUDE_LOGIN=1, config.json claude.useClaudeLogin)
  --model <m>              리드와 워커 모델 (기본 리드: opus, 워커: sonnet)
  --lead-model <m> / --worker-model <m>
  --effort low|medium|high|xhigh|max   (기본 medium)
  --max-turns <n>          세션 실행당 턴 상한 (기본 리드 40 / 워커 80)
  --workers <n|ids>        팀 크기 또는 쉼표 목록 (기본 juniper,kit,wren)
  --max-concurrent <n>     동시에 일하는 워커 수 (기본 3)
  --max-budget <usd>       턴당 USD 상한
  --ci "<cmd>"             작업 후 테스트 명령 (기본: 자동 감지, 예: npm test)
  --lead-read-commands "<cmd>,..."
                           리드가 묻지 않고 실행하는 읽기 명령 접두사, 예:
                           "bd show,gh issue view" (환경변수 AGENTCRAFT_LEAD_READ_COMMANDS)
  --no-lead-review         병합 결정 전 리드의 검토 턴 생략
  --no-resume              시작 때 끊긴 세션을 이어받지 않음

 codex 엔진 (--backend codex, 또는 혼합 팀)
  인증: Codex 로그인 (\`codex login\`: ChatGPT 또는 OpenAI API 키)
  --lead-engine claude|codex / --worker-engine claude|codex
                           엔진 혼합 (기본: 백엔드를 따름). 예: Claude 리드와 Codex 워커
  --engines <agent=engine,...>  에이전트별, 예: kit=codex,wren=claude (환경변수 AGENTCRAFT_ENGINES)
  --codex-path <path>      codex CLI (기본: PATH, 없으면 Codex 데스크톱 앱)
  --codex-model <m>        Codex 에이전트 모델 (기본: Codex 설정의 모델)
  --codex-lead-model <m> / --codex-worker-model <m>
  --codex-effort <e>       추론 강도 (low|medium|high|xhigh... 기본: Codex 설정)
  Codex 에이전트는 사용자의 MCP 서버, 플러그인, 웹 검색, 앱을 받지 않습니다. 모든 명령과
  작업 트리 밖 편집은 같은 정책과 게임 안 권한 확인을 거칩니다.`,
  profile_in_use: '프로필 "{profile}" 은 포어맨 pid {pid} 가 사용 중입니다 (ws://{host}:{port}). 먼저 중지하거나 다른 --profile 을 사용하세요.',
  reset_wiping: '초기화: {dir} 을 지웁니다',
  sim_demo: 'sim: 데모 저장소를 새로 만듭니다 ({dir})',
  refuse_wipe: '{dir} 은 지우지 않습니다',
  port_in_use: '포트 {port} 이 이미 사용 중입니다. 다른 포어맨이 실행 중인가요? ({runfile} 및 <home>/<profile>/foreman.json 참고) --port 또는 AGENTCRAFT_PORT 를 사용하세요.',
  listen_fail: '{host}:{port} 에서 받을 수 없습니다: {message}',
  banner: 'AgentCraft Foreman {version} | 백엔드 {backend} | ws://{host}:{port} | 상태 {dir}',
  repo_line: '저장소 {id}: {path} ({branch})',
  repo_add_fail: '저장소 {path} 를 추가하지 못했습니다: {message}',
  repo_gone: '저장소 {id} 경로가 없습니다: {path}',
  repo_refresh: '새로고침 {id}: {message}',
  shutdown: '{sig}: 종료합니다 (상태는 저장됩니다. 에이전트는 다음 시작 때 이어집니다)',
  goal_fail: '목표: {message}',
  uncaught: '처리되지 않은 예외: {detail}',
  unhandled: '처리되지 않은 거부: {detail}',
  toast_one: 'AgentCraft 가 당신을 기다립니다',
  toast_many: 'AgentCraft: 결정 {n}건이 대기 중',
  toast_failed: '바탕화면 알림에 실패했습니다',
  toast_error: '알림 표시에 실패했습니다: {message}',
  tui_paused: '(일시정지)',
  tui_off_shift: '(근무 외)',
  tui_unknown: '알 수 없는 명령 /{cmd}',
  rule_exact: '이 명령 그대로만',
  rule_outside_tree_read: '{cmd}: {path} 아래 전체를 읽기',
  rule_outside_tree_change: '{cmd}: {path} 아래 전체를 변경',
  rule_outside_files_r: '{cmd}: {path} 의 파일을 읽기',
  rule_outside_files_w: '{cmd}: {path} 의 파일을 쓰기',
  rule_outside_files_x: '{cmd}: {path} 의 파일을 실행',
  rule_net: '{cmd} 의 {host} 네트워크 접근',
  rule_cd: '디렉터리를 {dir} 로 변경',
  rule_git: 'git {sub} 대상을 정확히 {target}',
  rule_npx: '`{cmd}` 가 npm 레지스트리에서 받아 올 때도 (작업 트리 밖 경로는 여전히 확인)',
  rule_serve: '{name} 개발 서버를 시작 (로컬 포트에서 수신)',
  rule_git_internal: '{tool}: {path} (git 내부)',
  rule_pattern: '{tool}: 이 패턴 그대로만',
  rule_bash: '`{cmd}` 이 에이전트의 작업 트리 안 (밖 경로는 여전히 확인)',
  rule_tree: '{tool}: {path} 아래',
  rule_generic: '{tool}: {path} 안',
};

const catalogs: Record<LocaleId, Record<string, string>> = { en, ko };

let current: LocaleId = DEFAULT_LOCALE;

export function getLocale(): LocaleId {
  return current;
}

export function setLocale(id: LocaleId): void {
  current = id;
}

/** ko / ko-kr / korean and en / en-us / english. Empty means the default (ko). */
export function resolveLocale(raw: unknown): LocaleId {
  if (raw === undefined || raw === '') return DEFAULT_LOCALE;
  const v = String(raw).trim().toLowerCase().replaceAll('_', '-');
  if (v === 'ko' || v === 'ko-kr' || v === 'korean') return 'ko';
  if (v === 'en' || v === 'en-us' || v === 'english') return 'en';
  throw new Error(format('bad_locale', { value: String(raw) }));
}

export function t(key: string, vars?: Vars): string {
  return format(key, vars);
}

function format(key: string, vars?: Vars): string {
  const primary = catalogs[current][key];
  const fallback = catalogs.en[key];
  let s = primary ?? fallback ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) s = s.replaceAll(`{${name}}`, String(value));
  }
  return s;
}

export function unknownOptionMessage(flags: string[]): string {
  const listed = flags.map((k) => `"--${k}"`).join(', ');
  if (current === 'en') return `unknown option${flags.length > 1 ? 's' : ''} ${listed} (see --help)`;
  return `알 수 없는 옵션 ${listed} (--help 참고)`;
}

export function unexpectedArgumentMessage(arg: string): string {
  if (current === 'en') return `unexpected argument "${arg}" (options start with --; see --help)`;
  return `예기치 않은 인수 "${arg}" (옵션은 -- 로 시작합니다. --help 참고)`;
}

export function unknownEffortMessage(value: string, choices: string): string {
  if (current === 'en') return `unknown effort "${value}" (use ${choices})`;
  return `알 수 없는 --effort 값 "${value}" (${choices} 중 하나)`;
}

export function unknownBackendMessage(value: string): string {
  if (current === 'en') return `unknown backend "${value}" (use sim, claude or codex)`;
  return `알 수 없는 백엔드 "${value}" (sim, claude 또는 codex)`;
}

export function badProfileMessage(value: string): string {
  if (current === 'en') return `bad profile name "${value}"`;
  return `프로필 이름이 올바르지 않습니다 "${value}"`;
}

export function badLeadReadMessage(value: string): string {
  if (current === 'en') return `bad lead read command "${value}" (use a bare program name and plain words, like "bd show")`;
  return `리드 읽기 명령 "${value}" 형식이 올바르지 않습니다 (프로그램 이름과 일반 단어만, 예: "bd show")`;
}

export function deniedLeadReadMessage(entry: string, head: string): string {
  if (current === 'en') return `lead read command "${entry}" is not allowed: "${head}" can write files, run code or use the network`;
  return `리드 읽기 명령 "${entry}" 은 허용되지 않습니다. "${head}" 은 파일을 쓰거나, 코드를 실행하거나, 네트워크를 쓸 수 있습니다`;
}

export function unknownMergeStyleMessage(value: string): string {
  if (current === 'en') return `unknown merge style "${value}" (use merge or squash)`;
  return `알 수 없는 --merge-style 값 "${value}" (merge 또는 squash)`;
}

export function unknownEngineMessage(what: string, value: string, choices: string): string {
  if (current === 'en') return `unknown ${what} "${value}" (use ${choices})`;
  return `알 수 없는 ${engineWhat(what)} "${value}" (${choices.replace(' or ', ' 또는 ')})`;
}

export function badEnginesEntryMessage(agent: string, engine: string): string {
  if (current === 'en') return `bad --engines entry "${agent}=${engine}" (use agent=engine, e.g. kit=codex)`;
  return `잘못된 --engines 항목 "${agent}=${engine}" (agent=engine 형식, 예: kit=codex)`;
}

export function missingEngineMessage(agent: string): string {
  if (current === 'en') return `no engine for ${agent} in --engines (use agent=engine, e.g. ${agent}=codex)`;
  return `--engines 에 ${agent} 의 엔진이 없습니다 (agent=engine 형식, 예: ${agent}=codex)`;
}

function engineWhat(what: string): string {
  if (what === 'lead engine') return '리드 엔진';
  if (what === 'worker engine') return '워커 엔진';
  const m = /^engine for (.+)$/.exec(what);
  if (m) return `${m[1]} 엔진`;
  return what;
}
