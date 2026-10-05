import { render } from '@testing-library/react-native';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
jest.mock('@/providers/theme-provider', () => ({ useColors: () => ({ ink: '#000000' }) }));

describe('DashboardHeader', () => {
  it('announces unread news on the bell', async () => {
    const screen = await render(<DashboardHeader name="Sam" unread />);
    expect(screen.getByLabelText('Notifications, new')).toBeTruthy();
  });

  it('is a plain bell otherwise', async () => {
    const screen = await render(<DashboardHeader name="Sam" />);
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
    expect(screen.queryByLabelText('Notifications, new')).toBeNull();
  });
});
