import { usePro } from '@/api/pro';
import { useReceipts } from '@/api/queries';
import { captureAllowance, type CaptureAllowance } from '@/lib/allowance';
import { useToday } from '@/lib/use-today';

/**
 * This month's free scans and uploads, from the receipts already on the phone. The database refuses
 * the one past the limit anyway; this is so the app can say so before the camera opens.
 */
export function useCaptureAllowance(): {
  scan: CaptureAllowance;
  upload: CaptureAllowance;
  /** Safe to decide on: Pro is known and, on free, the receipts have been counted. */
  ready: boolean;
} {
  const { pro, ready: proReady } = usePro();
  const receipts = useReceipts();
  const { todayDate } = useToday();

  const rows = receipts.data ?? [];
  // A failed read cannot count, so it does not block: the database still holds the line.
  const counted = pro || receipts.isFetched || receipts.isError;

  return {
    scan: captureAllowance(rows, 'scan', pro, todayDate),
    upload: captureAllowance(rows, 'upload', pro, todayDate),
    ready: proReady && counted,
  };
}
