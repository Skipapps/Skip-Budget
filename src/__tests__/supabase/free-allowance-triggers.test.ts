import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Which free-plan limits the migrations leave in place, replayed in the order the CLI applies them:
 * salary is free on every plan, while cards and bank accounts keep their limit of one. Read from
 * the files, so a later migration that quietly re-creates the salary limit fails here.
 */

const DIR = join(__dirname, '../../../supabase/migrations');
const FILES = readdirSync(DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();

/** Comments out, so a sentence that names a trigger is not read as creating one. */
function stripComments(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const MIGRATIONS = FILES.map((name) => stripComments(readFileSync(join(DIR, name), 'utf8')));

/**
 * Every trigger left on the table after the scripts run in order, with the function it runs. Reads
 * `create [or replace] trigger … on public.<table> … execute function|procedure public.<fn>(` and
 * `drop trigger [if exists] <name> on public.<table>`; within a script, statements apply in order.
 */
function replayTriggers(scripts: readonly string[], table: string): Map<string, string> {
  const live = new Map<string, string>();
  const statement = new RegExp(
    String.raw`drop\s+trigger\s+(?:if\s+exists\s+)?(\w+)\s+on\s+public\.${table}\b` +
      String.raw`|create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+(\w+)\s+[^;]*?\bon\s+public\.${table}\b[^;]*?execute\s+(?:function|procedure)\s+public\.(\w+)\s*\(`,
    'gi',
  );
  for (const script of scripts) {
    for (const match of script.matchAll(statement)) {
      if (match[1]) live.delete(match[1]);
      else live.set(match[2], match[3]);
    }
  }
  return live;
}

/** Whether a function exists after the scripts run: last created or replaced, and not dropped since. */
function functionLives(scripts: readonly string[], fn: string): boolean {
  const statement = new RegExp(
    String.raw`(create\s+(?:or\s+replace\s+)?function|drop\s+function\s+(?:if\s+exists\s+)?)\s*public\.${fn}\s*\(`,
    'gi',
  );
  let lives = false;
  for (const script of scripts) {
    for (const match of script.matchAll(statement)) {
      lives = /^create/i.test(match[1]);
    }
  }
  return lives;
}

describe('reading the migrations', () => {
  it('counts a trigger made with create or replace', () => {
    const scripts = [
      `create or replace trigger salary_sources_free_allowance
         before insert on public.salary_sources
         for each row execute function public.enforce_income_allowance();`,
    ];
    expect(replayTriggers(scripts, 'salary_sources').get('salary_sources_free_allowance')).toBe(
      'enforce_income_allowance',
    );
  });

  it('counts a trigger dropped without if exists', () => {
    const scripts = [
      `create trigger salary_sources_free_allowance
         before insert on public.salary_sources
         for each row execute function public.enforce_income_allowance();`,
      'drop trigger salary_sources_free_allowance on public.salary_sources;',
    ];
    expect(replayTriggers(scripts, 'salary_sources').size).toBe(0);
  });

  it('applies a drop and a re-create in the order they appear in one script', () => {
    const recreated = `drop trigger if exists t on public.cards;
      create trigger t before insert on public.cards for each row execute function public.f();`;
    const dropped = `create trigger t before insert on public.cards for each row execute function public.f();
      drop trigger t on public.cards;`;
    expect(replayTriggers([recreated], 'cards').get('t')).toBe('f');
    expect(replayTriggers([dropped], 'cards').has('t')).toBe(false);
  });

  it('ignores a trigger on another table and one named only in a comment', () => {
    const scripts = [
      stripComments(`-- create trigger x before insert on public.salary_sources execute function public.f();
        create trigger y before insert on public.cards for each row execute function public.g();`),
    ];
    expect(replayTriggers(scripts, 'salary_sources').size).toBe(0);
  });

  it('follows a function through create, create or replace, and a drop with or without if exists', () => {
    expect(functionLives(['create function public.f() returns trigger as $$ $$;'], 'f')).toBe(true);
    expect(
      functionLives(['create or replace function public.f()', 'drop function public.f();'], 'f'),
    ).toBe(false);
    expect(
      functionLives(
        ['drop function if exists public.f();', 'create or replace function public.f()'],
        'f',
      ),
    ).toBe(true);
  });
});

describe('free-plan limits the database keeps', () => {
  it('has no limit left on salary sources', () => {
    const salary = replayTriggers(MIGRATIONS, 'salary_sources');
    expect([...salary.keys()].filter((name) => /allowance|lock|pro/i.test(name))).toEqual([]);
    expect(functionLives(MIGRATIONS, 'enforce_income_allowance')).toBe(false);
  });

  it('keeps one card and one bank account through the shared function', () => {
    expect(replayTriggers(MIGRATIONS, 'cards').get('cards_free_allowance')).toBe(
      'enforce_free_allowance',
    );
    expect(replayTriggers(MIGRATIONS, 'bank_accounts').get('bank_accounts_free_allowance')).toBe(
      'enforce_free_allowance',
    );
    expect(functionLives(MIGRATIONS, 'enforce_free_allowance')).toBe(true);
  });

  it('reads the salary limit as live before the migration that frees it', () => {
    // The replay itself is checked: stopping one file short finds the trigger and its function.
    const freed = FILES.indexOf('20261009100006_salary_sources_free.sql');
    expect(freed).toBeGreaterThan(0);
    const before = MIGRATIONS.slice(0, freed);
    expect(replayTriggers(before, 'salary_sources').get('salary_sources_free_allowance')).toBe(
      'enforce_income_allowance',
    );
    expect(functionLives(before, 'enforce_income_allowance')).toBe(true);
  });
});
