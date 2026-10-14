import { useCaptureUsage } from '@/api/capture-usage';
import { usePro } from '@/api/pro';
import { useReceipts } from '@/api/queries';
import { captureAllowance, type CaptureAllowance } from '@/lib/allowance';
import { useToday } from '@/lib/use-today';

/**
 * This month's free scans and uploads, from the database's usage rows, which outlive a deleted
 * receipt. The database refuses the one past the limit anyway; this is so the app can say so before
 * the camera opens.
 */
export function useCaptureAllowance(): {
  scan: CaptureAllowance;
  upload: CaptureAllowance;
  /** Safe to decide on: Pro is known and, on free, the scans have been counted. */
  ready: boolean;
  /** Counts again, for when the database refused a receipt this phone thought had room. */
  recount: () => void;
} {
  const { pro, ready: proReady } = usePro();
  const usage = useCaptureUsage();
  const receipts = useReceipts();
  const { todayDate } = useToday();

  // A database without usage rows yet, or a usage read that failed, counts the receipts kept, as it
  // did before them.
  const rows = usage.data ?? receipts.data ?? [];
  // A failed read cannot count, so it does not block: the database still holds the line.
  const counted =
    pro ||
    usage.isError ||
    (usage.isSuccess && (usage.data !== null || receipts.isFetched || receipts.isError));

  return {
    scan: captureAllowance(rows, 'scan', pro, todayDate),
    upload: captureAllowance(rows, 'upload', pro, todayDate),
    ready: proReady && counted,
    recount: () => {
      void usage.refetch();
      void receipts.refetch();
    },
  };
}
