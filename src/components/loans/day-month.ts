import { monthShort } from '@/i18n/calendar';

/** "15 Oct": a payment date close enough that its year goes without saying. */
export function dayMonth(date: Date): string {
  return `${date.getDate()} ${monthShort(date.getMonth())}`;
}
