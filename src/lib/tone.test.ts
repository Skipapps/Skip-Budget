import { contrast } from '@/lib/tone';

describe('contrast', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrast('#FA8F6F', '#FA8F6F')).toBeCloseTo(1, 5);
  });
});
