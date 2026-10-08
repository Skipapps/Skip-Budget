import { MIN_TEXT_SIZE, TEXT_CAP, renderedSize } from '@/theme/text-scale';

describe('text ceilings', () => {
  it('holds one ceiling per role, as the large-text rules set them', () => {
    expect(TEXT_CAP).toEqual({ reading: 1.6, row: 1.4, control: 1.3, heading: 1.3, figure: 1.2 });
    expect(MIN_TEXT_SIZE).toBe(11);
  });

  it('follows the phone up to the ceiling and no further', () => {
    expect(renderedSize(15, 'row', 1)).toBe(15);
    expect(renderedSize(15, 'row', 1.235)).toBeCloseTo(18.525, 5);
    // AX3 is 2.643x; a row stops at 1.4x.
    expect(renderedSize(15, 'row', 2.643)).toBeCloseTo(21, 5);
    // A smaller setting is followed down: the ceiling only limits growth.
    expect(renderedSize(12, 'control', 0.882)).toBeCloseTo(10.584, 5);
  });
});
