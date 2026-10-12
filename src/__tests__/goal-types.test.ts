import { GOAL_TYPES, goalIconOf, goalTypeLabelKey } from '@/data/goal-types';
import { t } from '@/i18n';

/**
 * A goal stores its type as `icon_id`. These ids are what the database holds, so they must not be
 * renamed; anything a later version (or a typo) stores is drawn as Other, never left blank.
 */

describe('the goal types', () => {
  it('are the twelve the brief lists, in its order, under ids that stay put', () => {
    expect(GOAL_TYPES).toEqual([
      'trip',
      'emergency',
      'home',
      'car',
      'education',
      'wedding',
      'phone',
      'gifts',
      'health',
      'family',
      'pets',
      'other',
    ]);
  });

  it('read back every stored id as itself', () => {
    for (const type of GOAL_TYPES) expect(goalIconOf(type)).toBe(type);
  });

  it.each([null, undefined, '', 'yacht', 'Trip', 'loan-car'])('draw %p as Other', (stored) => {
    expect(goalIconOf(stored)).toBe('other');
  });

  it('each have a name', () => {
    for (const type of GOAL_TYPES) {
      const label = t(goalTypeLabelKey(type));
      expect([type, label.length > 0, label.startsWith('goals.')]).toEqual([type, true, false]);
    }
  });
});
