import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, setLocale } from '../src/locale.js';
import { P, migrateNarrative, q1IncludesCompleted, show } from '../src/agents/sim/narrative.js';
import { currentSimGoal } from '../src/agents/sim/scenario.js';
import { leadSystemPrompt } from '../src/agents/prompts.js';
import type { Agent, Decision, Goal, Task } from '../src/protocol.js';
import type { BusMessage } from '../src/store.js';

afterEach(() => setLocale('ko'));

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    status: 'todo',
    deps: [],
    priority: 0,
    ci: 'unknown',
    createdBy: 'marlow',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

function decision(partial: Partial<Decision> & Pick<Decision, 'id' | 'question'>): Decision {
  return {
    agentId: 'marlow',
    kind: 'question',
    options: [],
    status: 'open',
    createdAt: 1,
    ...partial,
  };
}

describe('built-in sim narrative', () => {
  it('shows the pictured question in Korean by default and English on --locale en', () => {
    setLocale('ko');
    expect(getLocale()).toBe('ko');
    expect(show(P.q1)).toBe('`notes tags`가 완료된 메모의 태그도 셀까요?');
    expect(show(P.q1)).toMatch(/[가-힣]/);
    expect(show(P.q1)).toContain('`notes tags`');
    expect(show(P.q1Open)).toBe('열린 메모만 (권장)');
    expect(show(P.q1Done)).toBe('완료된 메모도 포함');
    expect(currentSimGoal()).toContain('`notes list --tag`');
    expect(currentSimGoal()).toContain('`notes tags`');
    expect(currentSimGoal()).toMatch(/[가-힣]/);
    expect(show(P.t2)).toContain('src/tags.ts');

    setLocale('en');
    expect(show(P.q1)).toBe('Should `notes tags` count tags on completed notes too?');
    expect(show(P.q1Open)).toBe('Only open notes (recommended)');
    expect(show(P.q1Done)).toBe('Include completed notes');
    expect(currentSimGoal()).toBe('Add #tags to pocket-notes: parse them, filter with `notes list --tag`, and show a `notes tags` summary');
    expect(show(P.t3)).toBe('`notes list --tag` + `notes tags`');
  });

  it('still treats either language of the completed-notes choice as that choice', () => {
    expect(q1IncludesCompleted(P.q1Done.en)).toBe(true);
    expect(q1IncludesCompleted(P.q1Done.ko)).toBe(true);
    expect(q1IncludesCompleted(P.q1Open.en)).toBe(false);
    expect(q1IncludesCompleted('/gamemode creative')).toBe(false);
  });

  it('rewrites only exact demo sentences and keeps the saved profile', () => {
    const userGoal = '1@juniper @tove /gamemode creative';
    const tasks = [task({ id: 't1', title: P.t1.en, description: 'leave this custom note' }), task({ id: 't2', title: 'my own task' })];
    const decisions = [decision({
      id: 'd1',
      question: P.q1.en,
      options: [P.q1Open.en, P.q1Done.en],
      context: P.q1Context.en,
      answer: { option: P.q1Done.en, text: 'also /gamemode creative', ts: 2 },
    })];
    const goals = [{ id: 'g1', text: userGoal, progress: 0.39, status: 'active' as const, createdAt: 1, updatedAt: 2 }, { id: 'g2', text: P.goal.en, progress: 0, status: 'active' as const, createdAt: 1, updatedAt: 1 }];
    const agents = [{ id: 'marlow', name: 'Marlow', role: 'lead' as const, color: '#fff', skin: 'marlow', state: 'waiting_user' as const, activity: 'asking you about `notes tags`', station: 'user' as const }];
    const messages: BusMessage[] = [{ id: 'm1', ts: 1, from: 'user', to: 'all', text: '/gamemode creative', readBy: [] }];
    const data = { tasks, decisions, goals: goals as Goal[], agents: agents as Agent[], messages };

    expect(migrateNarrative(data, 'ko')).toBe(true);
    expect(tasks.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(tasks[0]!.title).toBe(P.t1.ko);
    expect(tasks[0]!.description).toBe('leave this custom note');
    expect(tasks[1]!.title).toBe('my own task');
    expect(decisions[0]!.question).toBe(P.q1.ko);
    expect(decisions[0]!.options).toEqual([P.q1Open.ko, P.q1Done.ko]);
    expect(decisions[0]!.answer?.option).toBe(P.q1Done.ko);
    expect(decisions[0]!.answer?.text).toBe('also /gamemode creative');
    expect(goals[0]!.text).toBe(userGoal);
    expect(goals[1]!.text).toBe(P.goal.ko);
    expect(agents[0]!.activity).toBe('asking you about `notes tags`');
    expect(messages[0]!.text).toBe('/gamemode creative');
    expect(q1IncludesCompleted(decisions[0]!.answer?.option)).toBe(true);

    expect(migrateNarrative(data, 'ko')).toBe(false);
    expect(migrateNarrative(data, 'en')).toBe(true);
    expect(decisions[0]!.question).toBe(P.q1.en);
    expect(goals[0]!.text).toBe(userGoal);
    expect(tasks).toHaveLength(2);
    expect(decisions).toHaveLength(1);
    expect(agents).toHaveLength(1);
  });
});

describe('model language instructions', () => {
  it('asks a Korean Foreman to write user-facing text in Korean and leave identifiers in English', async () => {
    setLocale('ko');
    const { makeForeman } = await import('./helpers.js');
    const home = (await import('./helpers.js')).tempDir();
    const h = makeForeman(home, ['--locale', 'ko', '--backend', 'claude', '--user-name', 'Sam']);
    try {
      const prompt = leadSystemPrompt(h.fm, ['kit']);
      expect(prompt).toContain('The user is Sam.');
      expect(prompt).toContain('Write what Sam reads in Korean');
      expect(prompt).toContain('`notes tags`');
      expect(prompt).toContain('src/tags.ts');
    } finally {
      await h.fm.close();
    }
  });

  it('leaves the English prompt without the Korean language block', async () => {
    setLocale('en');
    const { makeForeman, tempDir } = await import('./helpers.js');
    const h = makeForeman(tempDir(), ['--locale', 'en', '--backend', 'claude', '--user-name', 'Sam']);
    try {
      const prompt = leadSystemPrompt(h.fm, ['kit']);
      expect(prompt).toContain('The user is Sam.');
      expect(prompt).not.toContain('Write what Sam reads in Korean');
    } finally {
      await h.fm.close();
    }
  });
});
