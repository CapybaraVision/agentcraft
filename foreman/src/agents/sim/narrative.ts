// Built-in sim demo copy. Code, commands, and file names stay in both languages.
// migrateNarrative rewrites only exact matches, so a saved profile keeps its tasks,
// answers, and any goal the user actually typed.
import { getLocale, type LocaleId } from '../../locale.js';
import type { Agent, Decision, Goal, Task } from '../../protocol.js';
import type { BusMessage } from '../../store.js';

export interface Phrase {
  en: string;
  ko: string;
}

export function phrase(en: string, ko: string): Phrase {
  return { en, ko };
}

export function show(p: Phrase): string {
  return getLocale() === 'en' ? p.en : p.ko;
}

export const P = {
  goal: phrase(
    'Add #tags to pocket-notes: parse them, filter with `notes list --tag`, and show a `notes tags` summary',
    'pocket-notes에 #tags를 추가합니다. 파싱하고, `notes list --tag`로 거르고, `notes tags` 요약을 보여 주세요',
  ),
  q1: phrase(
    'Should `notes tags` count tags on completed notes too?',
    '`notes tags`가 완료된 메모의 태그도 셀까요?',
  ),
  q1Open: phrase('Only open notes (recommended)', '열린 메모만 (권장)'),
  q1Done: phrase('Include completed notes', '완료된 메모도 포함'),
  q1Context: phrase(
    'Juniper is building the `tags` command now. Open-only matches what `notes list` shows by default; `--all` could include done notes.',
    'Juniper가 지금 `tags` 명령을 만들고 있습니다. 열린 메모만 세는 것이 `notes list`의 기본과 같고, `--all`이면 완료된 메모도 포함됩니다.',
  ),
  t1: phrase('Explore repo & draft plan', '저장소를 살펴보고 계획을 적기'),
  t2: phrase('Tag parser module (src/tags.ts)', '태그 파서 모듈 (src/tags.ts)'),
  t2d: phrase(
    'parseTags/hasTag/normalizeTag: lowercase, de-duplicated, "-" and "_" allowed, "issue#12" is not a tag. Unit tests.',
    'parseTags/hasTag/normalizeTag: 소문자, 중복 제거, "-"와 "_" 허용, "issue#12"는 태그가 아님. 단위 테스트.',
  ),
  t3: phrase('`notes list --tag` + `notes tags`', '`notes list --tag` + `notes tags`'),
  t3d: phrase(
    'Filter list by tag; new `tags` command with usage counts. Uses src/tags.ts.',
    '태그로 목록을 거릅니다. 사용 횟수를 보여 주는 `tags` 명령을 추가합니다. src/tags.ts를 사용합니다.',
  ),
  t4: phrase('Highlight #tags in list output', '목록에서 #tags 강조'),
  t4d: phrase(
    'Cyan tags when printing to a terminal; formatNote/formatList take {color}. No new dependencies.',
    '터미널에 출력할 때 태그를 청록색으로. formatNote/formatList가 {color}를 받습니다. 새 의존성 없음.',
  ),
  t5: phrase('Tag edge cases: unicode & punctuation', '태그 경계: 유니코드와 문장부호'),
  t5d: phrase(
    'Tests + fixes for #café, #crème-brûlée, trailing punctuation.',
    '#café, #crème-brûlée, 끝의 문장부호에 대한 테스트와 수정.',
  ),
  t6: phrase('README + help text for tags', '태그 README와 도움말'),
  t6d: phrase(
    'Document tags; update `notes help`; enable colors on a TTY.',
    '태그를 문서화합니다. `notes help`를 고치고, TTY에서 색을 켭니다.',
  ),
  t7: phrase('Publish 0.3.0 to npm', 'npm에 0.3.0 게시'),
  t8: phrase('QA: full test run + CLI smoke on main', 'QA: main에서 전체 테스트와 CLI 확인'),
  t8d: phrase(
    'After merges: npm test on main, smoke the CLI with tagged notes, draft release notes.',
    '병합 후: main에서 npm test, 태그가 있는 메모로 CLI를 확인하고, 릴리스 노트를 적습니다.',
  ),
  t9: phrase('Stretch: shell completion for #tags', '여유: #tags 셸 자동완성'),
} as const;

export const PHRASES: readonly Phrase[] = Object.values(P);

export function q1IncludesCompleted(option: string | undefined): boolean {
  return option === P.q1Done.en || option === P.q1Done.ko;
}

function mapText(text: string, locale: LocaleId): string {
  for (const p of PHRASES) {
    if (locale === 'ko' && text === p.en) return p.ko;
    if (locale === 'en' && text === p.ko) return p.en;
  }
  return text;
}

export interface NarrativeSnapshot {
  tasks: Task[];
  decisions: Decision[];
  goals: Goal[];
  agents: Agent[];
  messages: BusMessage[];
}

/** Swap exact built-in demo sentences to the current locale. Other text is left as saved. */
export function migrateNarrative(data: NarrativeSnapshot, locale: LocaleId): boolean {
  let changed = false;
  const apply = (text: string): string => {
    const next = mapText(text, locale);
    if (next !== text) changed = true;
    return next;
  };
  for (const task of data.tasks) {
    task.title = apply(task.title);
    if (task.description !== undefined) task.description = apply(task.description);
    if (task.blockedReason !== undefined) task.blockedReason = apply(task.blockedReason);
  }
  for (const decision of data.decisions) {
    decision.question = apply(decision.question);
    if (decision.context !== undefined) decision.context = apply(decision.context);
    decision.options = decision.options.map(apply);
    if (decision.answer?.option !== undefined) decision.answer.option = apply(decision.answer.option);
  }
  for (const goal of data.goals) goal.text = apply(goal.text);
  for (const agent of data.agents) agent.activity = apply(agent.activity);
  for (const message of data.messages) message.text = apply(message.text);
  return changed;
}
