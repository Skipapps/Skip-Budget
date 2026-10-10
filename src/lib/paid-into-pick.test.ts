import { onPaidIntoPicked, pickPaidInto } from '@/lib/paid-into-pick';

describe('the Paid into hand-off', () => {
  it('hands a pick to every editor listening, and to none once it stops', () => {
    const heard = jest.fn();
    const stop = onPaidIntoPicked(heard);

    pickPaidInto({ editor: 'e1', source: 's1', accountId: 'acc1' });
    expect(heard).toHaveBeenCalledWith({ editor: 'e1', source: 's1', accountId: 'acc1' });

    stop();
    pickPaidInto({ editor: 'e1', source: 's1', accountId: null });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('keeps nothing for an editor that starts listening later', () => {
    pickPaidInto({ editor: 'e1', source: 'salary-2', accountId: 'acc1' });

    const later = jest.fn();
    const stop = onPaidIntoPicked(later);
    expect(later).not.toHaveBeenCalled();
    stop();
  });
});
