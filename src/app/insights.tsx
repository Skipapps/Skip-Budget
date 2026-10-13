import { InsightsScreen } from '@/components/insights/insights-screen';

/** Insights, with Choose month and Choose year as its own pages. */
export default function InsightsRoute() {
  return <InsightsScreen periodHref={(params) => ({ pathname: '/insights-period', params })} />;
}
