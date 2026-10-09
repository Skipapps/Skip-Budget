import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlignLeft,
  CalendarDays,
  ImageUp,
  ScanLine,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { guessCategory, matchBrand, useBrandDirectory, useSpendCategories } from '@/api/brands';
import { useCaptureAllowance } from '@/api/capture-allowance';
import { usePro } from '@/api/pro';
import { buildReceiptValues } from '@/api/entry-values';
import { receiptParseOptions } from '@/api/scan';
import {
  useCreateReceipt,
  useDeleteReceipt,
  useUpdateReceipt,
  type CaptureSource,
} from '@/api/mutations';
import { usePaymentSources, useReceipt } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { openChangeLogo } from '@/components/brands/change-logo-button';
import { AmountEditPage, NoteEditPage, DateEditPage } from '@/components/entry/edit-pages';
import {
  DateChips,
  EntryReview,
  GlyphWell,
  type EntryRowSpec,
} from '@/components/entry/entry-review';
import { AmountStep } from '@/components/flow/amount-step';
import { StepFlow } from '@/components/flow/step-flow';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceTiles } from '@/components/ui/source-tiles';
import { FieldLabel } from '@/components/ui/typography';
import { useDialog, useConfirm } from '@/providers/dialog-provider';
import { t, type MessageKey } from '@/i18n';
import { success, warn } from '@/lib/haptics';
import { withTap } from '@/lib/press';
import { formatEntryDay } from '@/lib/entry-day';
import { failureMessage, failureText } from '@/lib/failure';
import { logoColumns } from '@/lib/logo-columns';
import { logoDomainOf, type LogoFields } from '@/lib/logo-domain';
import { refusedForPro } from '@/lib/pro-refusal';
import { receiptCategoryName } from '@/lib/receipt-category';
import { parseReceipt, parseReceiptFromLines, type ParsedReceipt } from '@/lib/receipt-parser';
import {
  clearVoiceDraft,
  readAmountParam,
  readDayParam,
  readMerchantParams,
  readNoteParam,
  readSourceParam,
} from '@/lib/voice-draft';
import { useToday } from '@/lib/use-today';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';
import {
  captureReceipt,
  hasLayoutRecognition,
  isCaptureAvailable,
  isRecognitionAvailable,
  isScanningAvailable,
  recognizeReceipt,
  recognizeText,
} from '../../modules/receipt-scanner';

type ScanField = 'store' | 'date' | 'amount' | 'card';

type ScanResult = { read: ScanField[]; missed: ScanField[] };

const FIELD_WORDS: Record<ScanField, MessageKey> = {
  store: 'receipts.scan.field.store',
  date: 'receipts.scan.field.date',
  amount: 'receipts.scan.field.amount',
  card: 'receipts.scan.field.card',
};

/** "store, date and amount": no Oxford comma, because it is read aloud. */
function listWords(fields: ScanField[]): string {
  const words = fields.map((field) => t(FIELD_WORDS[field]));
  if (words.length <= 1) return words[0] ?? '';
  return t('receipts.scan.and', {
    first: words.slice(0, -1).join(', '),
    last: words[words.length - 1],
  });
}

/** The pages of one receipt: the amount keypad it starts on, the final page, and one per field. */
type Page = 'amount' | 'review' | 'amountEdit' | 'note' | 'date';

type Initial = {
  store: BrandSelection | null;
  date: Date;
  amount: string;
  /** '' is Skip, picked on purpose; null is not answered yet. A saved receipt has answered. */
  sourceId: string | null;
  note: string;
  captureSource: CaptureSource;
};

/** Read when a form opens, not when the app starts, so "today" is today. */
const blank = (): Initial => ({
  store: null,
  date: new Date(),
  amount: '',
  sourceId: null,
  note: '',
  captureSource: 'manual',
});

const ALL_FIELDS = ['store', 'date', 'amount', 'card'] as const;

type ScanParams = {
  scannedStore?: string;
  scannedBrandId?: string;
  scannedDomain?: string;
  /** The logo chosen on the voice review page, so this form does not ask again. */
  scannedLogoDomain?: string;
  scannedLogoHidden?: string;
  scannedCategory?: string;
  scannedAmount?: string;
  scannedDate?: string;
  scannedSource?: string;
  /** Typed on the voice review page. */
  scannedNote?: string;
  scannedRead?: string;
  /** 'voice' when the voice review page handed this over ("More options"). */
  scannedVia?: string;
  /** 'voice' sends a saved receipt back to Home rather than to the review page. */
  from?: string;
};

/**
 * A reading that arrives as route params (a scan, or what the voice review page heard). Every param
 * goes through the strict readers, so a bad amount, date or id opens blank rather than wrong.
 */
function fromScanParams(params: ScanParams): { initial: Initial; result: ScanResult | null } {
  const voice = params.scannedVia === 'voice';
  const read = (params.scannedRead ?? '')
    .split(',')
    .filter((field): field is ScanField => (ALL_FIELDS as readonly string[]).includes(field));

  if (!voice && read.length === 0 && !params.scannedStore && !params.scannedAmount) {
    return { initial: blank(), result: null };
  }

  const store = readMerchantParams({
    name: params.scannedStore,
    brandId: params.scannedBrandId,
    domain: params.scannedDomain,
    categoryId: params.scannedCategory,
    logoDomain: params.scannedLogoDomain,
    logoHidden: params.scannedLogoHidden,
  });

  return {
    initial: {
      store: store ? { ...store, categoryId: store.categoryId || 'other' } : null,
      date: readDayParam(params.scannedDate) ?? new Date(),
      amount: readAmountParam(params.scannedAmount),
      sourceId: readSourceParam(params.scannedSource) || null,
      note: readNoteParam(params.scannedNote),
      captureSource: voice ? 'voice' : 'scan',
    },
    // The report is camera wording ("Read the store, date and amount"); a voice hand-off has none.
    result: voice ? null : { read, missed: ALL_FIELDS.filter((field) => !read.includes(field)) },
  };
}

/** Keyed on the id so the form remounts once the row lands, seeding state without an effect. */
export default function AddReceiptScreen() {
  const params = useLocalSearchParams<{ id?: string } & ScanParams>();
  const { id } = params;
  // Only a new receipt can have come from the voice review page.
  const fromVoice = !id && params.from === 'voice';
  const artwork = useArtwork();
  const receipt = useReceipt(id);
  const existing = receipt.data ?? null;

  if (id && !existing) {
    // A failed read is neither a gone receipt nor a new one: dropping the id files a second copy.
    if (receipt.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={() => {
              void receipt.refetch();
            }}
            secondaryLabel={t('receipts.add.goBack')}
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    // Skeletons, never a $0 figure for a receipt still loading.
    if (!receipt.isFetched) {
      return (
        <StepFlow
          title={t('receipts.add.titleEdit')}
          closePrompt={t('receipts.add.closeEdit')}
          steps={1}
          current={0}
          onBack={() => router.back()}
          primaryLabel={t('common.continue')}
          primaryDisabled
          onPrimary={() => {}}
        >
          <View className="w-full gap-6">
            <Skeleton className="h-14 w-full rounded-[12px]" />
            <Skeleton className="h-10 w-2/3 rounded-full" />
            <Skeleton className="h-24 w-full rounded-[12px]" />
          </View>
        </StepFlow>
      );
    }

    // The lookup came back empty (deleted elsewhere, or a stale link). An update on an id that
    // matches nothing reports success and writes nothing.
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('receipts.add.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const scanned = fromScanParams(params);

  const initial: Initial = existing
    ? {
        // No logo choice carried over, so saving the edit leaves the row's own logo alone.
        store: {
          brandId: existing.brand_id,
          name: existing.merchant,
          domain: logoDomainOf(existing),
          categoryId: existing.category_id,
        },
        date: new Date(`${existing.purchased_on}T00:00:00`),
        amount: String(existing.amount),
        sourceId: existing.card_id ?? existing.bank_account_id ?? '',
        note: existing.note ?? '',
        captureSource: existing.source,
      }
    : scanned.initial;

  return (
    <ReceiptForm
      key={existing?.id ?? 'new'}
      id={id}
      initial={initial}
      saved={existing}
      initialScan={existing ? null : scanned.result}
      // Anything that arrives with a receipt already filled in (an edit, a scan, a voice hand-off)
      // opens on the final page; only a blank one starts at the amount.
      initialView={existing || scanned.result || fromVoice ? 'review' : 'amount'}
      fromVoice={fromVoice}
    />
  );
}

function ReceiptForm({
  id,
  initial,
  saved = null,
  initialScan,
  initialView,
  fromVoice = false,
}: {
  id?: string;
  initial: Initial;
  /** The row being edited, for the logo it already has. */
  saved?: LogoFields | null;
  initialScan: ScanResult | null;
  initialView: 'amount' | 'review';
  /** Saved from a voice hand-off: back to Home, never onto the review page again. */
  fromVoice?: boolean;
}) {
  const colors = useColors();
  const editing = Boolean(id);

  const [picked, setPicked] = useState<BrandSelection | null>(initial.store);
  // Receipts have no page of their own, so Change logo opens from here. Until another store is
  // picked, the row's own store is the one shown: re-read, it carries a logo changed there.
  const [storeChanged, setStoreChanged] = useState(false);
  const store = editing && !storeChanged ? initial.store : picked;
  const setStore = (next: BrandSelection | null) => {
    setStoreChanged(true);
    setPicked(next);
  };
  const [date, setDate] = useState<Date>(initial.date);
  const [amount, setAmount] = useState(initial.amount);
  const [sourceId, setSourceId] = useState<string | null>(initial.sourceId);
  // Typed but not picked from the list: it names the store all the same.
  const [typedStore, setTypedStore] = useState('');
  const [note, setNote] = useState(initial.note);
  const [captureSource, setCaptureSource] = useState(initial.captureSource);

  // Pages over one piece of state, never routes, so Back keeps everything filled in. The final
  // page is `review`; each line of it opens a page for that one thing and returns here.
  const [view, setView] = useState<Page>(initialView);
  // Outlives the review page while a row's own page is open, so coming back lands where it was.
  const [reviewY, setReviewY] = useState(0);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(initialScan);
  const { todayDate } = useToday();

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  const { data: directory = [] } = useBrandDirectory();

  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const confirm = useConfirm();
  const ask = useDialog();
  const { pro } = usePro();
  const allowance = useCaptureAllowance();

  // A hand edit retires the scan report: telling someone to check an amount they just corrected is
  // worse than silence. It retires a failed save's line too, which was about the page as it was.
  const edited =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      setScanResult(null);
      setError(null);
      set(value);
    };

  /** Turns recognised text into filled fields, leaving anything unsure alone. */
  const applyScan = (parsed: ParsedReceipt, from: 'scan' | 'upload') => {
    const found: ScanField[] = [];
    let nextStore = store;
    let nextAmount = amount;

    if (parsed.merchant) {
      const brand = matchBrand(parsed.merchant, directory);
      nextStore = brand
        ? {
            brandId: brand.id,
            name: brand.name,
            domain: brand.domain,
            categoryId: brand.category_id,
          }
        : {
            brandId: null,
            name: parsed.merchant,
            domain: null,
            categoryId: guessCategory(parsed.merchant),
          };
      setStore(nextStore);
      found.push('store');
    }
    if (parsed.total !== undefined) {
      nextAmount = String(parsed.total);
      setAmount(nextAmount);
      found.push('amount');
    }
    // The parser allows any day up to 31, and "02/30" would save as March or not at all; an
    // impossible day is dropped and the date stays as it was.
    const day = readDayParam(parsed.date);
    if (day) {
      setDate(day);
      found.push('date');
    }
    if (parsed.last4) {
      const digits = parsed.last4;
      const matched = sources.find((source) => source.label.endsWith(digits));
      if (matched) {
        setSourceId(matched.id);
        found.push('card');
      }
    }

    setCaptureSource(from);
    setError(null);
    setScanResult(
      found.length === 0
        ? { read: [], missed: ['store', 'date', 'amount'] }
        : {
            read: found,
            missed: (['store', 'date', 'amount', 'card'] as const).filter(
              (field) => !found.includes(field),
            ),
          },
    );
    // Whatever was read lands on the final page, with a gap where the reading missed.
    if (found.length > 0) setView('review');
  };

  const handleScan = async () => {
    // Until the allowance is known a tap does nothing, so nobody with scans left (or Pro) is ever
    // sent to the explainer.
    if (!allowance.ready) return;
    setError(null);
    setScanResult(null);

    if (!allowance.scan.allowed) {
      router.push({ pathname: '/pro-feature', params: { id: 'scan' } });
      return;
    }

    // Scanning needs real hardware; say so rather than leave a button that silently does nothing.
    if (!isCaptureAvailable() && !isScanningAvailable()) {
      await ask({
        title: t('receipts.scan.noCameraTitle'),
        message: t('receipts.scan.noCameraMessage'),
        cancelLabel: null,
      });
      return;
    }

    try {
      setReading(true);
      const result = await captureReceipt();
      // Prefer the positioned reading; a build without it still returns text.
      if (result) {
        const options = receiptParseOptions(directory);
        applyScan(
          result.lines?.length
            ? parseReceiptFromLines(result.lines, options)
            : parseReceipt(result.text, options),
          'scan',
        );
      }
    } catch (thrown) {
      setError(failureMessage(thrown));
    } finally {
      setReading(false);
    }
  };

  const readFrom = async (uri: string) => {
    try {
      setReading(true);
      const lines = await recognizeReceipt(uri);
      const options = receiptParseOptions(directory);
      // The flat text is only for an older native build; an empty list from a current one means
      // there is no text to find, and reading the file again would find none.
      applyScan(
        lines.length || hasLayoutRecognition()
          ? parseReceiptFromLines(lines, options)
          : parseReceipt(await recognizeText(uri), options),
        'upload',
      );
    } catch (thrown) {
      setError(failureMessage(thrown));
    } finally {
      setReading(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('receipts.scan.photoAccess'));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!picked.canceled && picked.assets[0]) await readFrom(picked.assets[0].uri);
  };

  const pickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!picked.canceled && picked.assets[0]) await readFrom(picked.assets[0].uri);
  };

  /** Photos and files are separate pickers on iOS, so ask which one. */
  const handleUpload = async () => {
    if (!allowance.ready) return;
    setError(null);
    if (!allowance.upload.allowed) {
      router.push({ pathname: '/pro-feature', params: { id: 'scan' } });
      return;
    }
    const where = await ask({
      title: t('receipts.scan.whereTitle'),
      actions: [
        { id: 'photos', label: t('receipts.scan.photoLibrary') },
        { id: 'files', label: t('receipts.scan.files') },
      ],
    });

    if (where === 'photos') await pickPhoto();
    else if (where === 'files') await pickFile();
  };

  const total = Number(amount);
  const amountReady = Number.isFinite(total) && total > 0;

  const fail = (message: string) => {
    warn();
    setError(message);
    setView('review');
  };

  const leave = () => {
    if (!fromVoice) {
      router.back();
      return;
    }
    router.dismissTo('/home');
    // Saved, so the person's words do not stay in memory for the next session.
    clearVoiceDraft();
  };

  const handleSave = async () => {
    setError(null);
    const typed = typedStore.trim();
    const chosen: BrandSelection | null =
      store ??
      (typed
        ? // Keyword guess, as the box's own "Add" row files a new store. No logo: one replaced by
          // typing must not keep the old one's.
          {
            brandId: null,
            name: typed,
            domain: null,
            categoryId: guessCategory(typed),
            logoDomain: null,
            logoHidden: false,
          }
        : null);
    const missing = [
      !amountReady && t('receipts.field.amount'),
      !chosen && t('receipts.field.store'),
      sourceId === null && t('receipts.field.paidWith'),
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0 || sourceId === null) {
      fail(t('receipts.add.missing', { fields: missing.join(', ') }));
      return;
    }

    const built = buildReceiptValues(
      { store: chosen, amount, date, sourceId, note, captureSource },
      sources,
    );
    if (!built.ok) {
      fail(built.message);
      return;
    }
    const values = { ...built.values, ...logoColumns(chosen, saved) };

    try {
      if (editing && id) {
        await updateReceipt.mutateAsync({ id, values });
      } else {
        await createReceipt.mutateAsync(values);
      }
      success();
      leave();
    } catch (thrown) {
      // The database's Pro wall is an answer for someone the app also thinks is free: show what Pro
      // adds, pushed so Back returns to the filled-in form. For someone the app thinks has Pro it is
      // a disagreement between the two, so it is reported like any failure.
      if (refusedForPro(thrown) && !pro) {
        // Another phone, or a month already turned where the account lives: the count catches up.
        if (captureSource === 'scan' || captureSource === 'upload') allowance.recount();
        router.push({
          pathname: '/pro-feature',
          params: { id: captureSource === 'voice' ? 'voice' : 'scan' },
        });
        return;
      }
      warn();
      setError(failureMessage(thrown));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: t('receipts.add.deleteTitle'),
      message: t('receipts.add.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteReceipt.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError(failureMessage(thrown));
    }
  };

  const busy = createReceipt.isPending || updateReceipt.isPending;
  // The page this form opened on. Anywhere else the edge swipe is off, and Back steps back.
  const isRoot = view === initialView;

  const title = editing ? t('receipts.add.titleEdit') : t('receipts.add.titleNew');
  const closePrompt = editing ? t('receipts.add.closeEdit') : t('receipts.add.closeNew');
  const toReview = () => setView('review');
  // A line that came from Save names what was wrong with the page as it was: once something there
  // is kept, it no longer applies.
  const settle = () => {
    setError(null);
    toReview();
  };

  // What a scan read, and what still wants a look. A hand edit retires it.
  const scanReport = scanResult ? (
    <View className="w-full rounded-[16px] bg-ink/5 px-4 py-3">
      {scanResult.read.length > 0 ? (
        <Text className="font-app text-[13px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {t('receipts.scan.read', { fields: listWords(scanResult.read) })}
        </Text>
      ) : (
        <Text className="font-app text-[13px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {failureText()}
        </Text>
      )}
      {scanResult.missed.length > 0 ? (
        <Text className="mt-1 font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {t('receipts.scan.check', { fields: listWords(scanResult.missed) })}
        </Text>
      ) : null}
    </View>
  ) : null;

  if (view === 'amountEdit') {
    return (
      <AmountEditPage
        title={t('receipts.field.amount')}
        question={t('receipts.add.askAmount')}
        value={amount}
        onBack={toReview}
        onDone={(next) => {
          edited(setAmount)(next);
          settle();
        }}
      />
    );
  }

  if (view === 'note') {
    return (
      <NoteEditPage
        title={t('receipts.field.note')}
        label={t('receipts.field.note')}
        placeholder={t('receipts.add.notePlaceholder')}
        value={note}
        onBack={toReview}
        onDone={(next) => {
          setNote(next);
          settle();
        }}
      />
    );
  }

  if (view === 'date') {
    return (
      <DateEditPage
        title={t('receipts.field.date')}
        question={t('receipts.add.askDate')}
        value={date}
        onBack={toReview}
        onDone={(day) => {
          if (day) edited(setDate)(day);
          settle();
        }}
      />
    );
  }

  if (view === 'amount') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={1}
        current={0}
        onBack={() => router.back()}
        question={t('receipts.add.askAmount')}
        // Capture sits above the question: a paper receipt fills amount, store and date at once.
        headerSlot={
          <View className="w-full gap-2">
            {isRecognitionAvailable() ? (
              <View className="w-full flex-row gap-3">
                <CaptureButton
                  icon={ScanLine}
                  label={t('receipts.scan.scan')}
                  hint={t('receipts.scan.scanHint')}
                  onPress={handleScan}
                  disabled={reading || !allowance.ready}
                  proBadge={allowance.ready && !allowance.scan.allowed}
                />
                <CaptureButton
                  icon={ImageUp}
                  label={t('receipts.scan.upload')}
                  hint={t('receipts.scan.uploadHint')}
                  onPress={handleUpload}
                  disabled={reading || !allowance.ready}
                  proBadge={allowance.ready && !allowance.upload.allowed}
                />
              </View>
            ) : null}

            {isRecognitionAvailable() &&
            allowance.ready &&
            allowance.scan.left !== null &&
            allowance.upload.left !== null ? (
              <Text
                className="w-full text-center font-app text-[12px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {t('receipts.scan.allowance', {
                  scans: t('receipts.scan.scansCount', { count: allowance.scan.left }),
                  uploads: t('receipts.scan.uploadsCount', { count: allowance.upload.left }),
                })}
              </Text>
            ) : null}

            {reading ? (
              <View className="mt-2 w-full flex-row items-center justify-center gap-2">
                <ActivityIndicator size="small" color={colors.muted} />
                <Text
                  className="font-app text-[13px] text-muted"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {t('receipts.scan.reading')}
                </Text>
              </View>
            ) : null}

            {scanReport ? <View className="mt-2 w-full">{scanReport}</View> : null}
          </View>
        }
        primaryLabel={t('common.continue')}
        primaryDisabled={!amountReady}
        onPrimary={() => {
          settle();
        }}
        error={error}
      >
        <AmountStep value={amount} onChange={edited(setAmount)} />
      </StepFlow>
    );
  }

  const rows: EntryRowSpec[] = [
    {
      key: 'store',
      field: (
        <>
          <BrandField
            label={t('receipts.field.store')}
            value={store}
            onChange={edited(setStore)}
            placeholder={t('receipts.add.storePlaceholder')}
            // The box is drawn afresh after another page; what was typed comes back with it.
            initialQuery={typedStore}
            onQueryChange={edited(setTypedStore)}
            // Receipts have no page of their own, so Change logo opens from here. Until another
            // store is picked, the row's own store is the one shown.
            onChangeLogo={
              editing && id && !storeChanged && store
                ? () => openChangeLogo('receipt', id, store.name)
                : undefined
            }
          />
          {store ? (
            <Text
              className="mt-3 w-full font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {t('receipts.add.filedUnder', {
                category: receiptCategoryName(
                  store.categoryId,
                  categories.find((category) => category.id === store.categoryId)?.label,
                ),
              })}
            </Text>
          ) : null}
        </>
      ),
    },
    {
      key: 'date',
      label: t('receipts.field.date'),
      value: formatEntryDay(date, todayDate),
      leading: <GlyphWell icon={CalendarDays} />,
      onPress: () => setView('date'),
      below: (
        <DateChips
          value={date}
          today={todayDate}
          onPick={edited(setDate)}
          onOpenCalendar={() => setView('date')}
        />
      ),
    },
    {
      key: 'paidWith',
      field: (
        <View className="w-full">
          <FieldLabel className="mb-2">{t('receipts.field.paidWith')}</FieldLabel>
          <SourceTiles
            sources={sources}
            value={sourceId ?? ''}
            onChange={edited(setSourceId)}
            skip={{
              label: t('receipts.add.skipSource'),
              selected: sourceId === '',
              onPress: () => edited(setSourceId)(''),
            }}
          />
        </View>
      ),
    },
    {
      key: 'note',
      label: t('receipts.field.note'),
      value: note.trim() || null,
      placeholder: t('entry.addNote'),
      leading: <GlyphWell icon={AlignLeft} />,
      onPress: () => setView('note'),
    },
  ];

  return (
    <EntryReview
      scrollPlace={{ y: reviewY, keep: setReviewY }}
      title={title}
      closePrompt={closePrompt}
      root={isRoot}
      onBack={() => {
        if (isRoot) {
          router.back();
          return;
        }
        // A failed save's line belongs to the final page, not the keypad it steps back to.
        setError(null);
        setView('amount');
      }}
      amountLabel={t('receipts.field.amount')}
      amount={amount}
      onEditAmount={() => setView('amountEdit')}
      topSlot={scanReport}
      rows={rows}
      primaryLabel={
        busy
          ? t('receipts.add.saving')
          : editing
            ? t('receipts.add.saveChanges')
            : t('receipts.add.saveReceipt')
      }
      // Never greyed out for a gap: Save says what is still missing.
      primaryDisabled={busy}
      onPrimary={() => void handleSave()}
      error={error}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('receipts.add.deleteLabel')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-app-medium text-[15px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {deleteReceipt.isPending
                ? t('receipts.add.deleting')
                : t('receipts.add.deleteReceipt')}
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}

type CaptureButtonProps = {
  icon: LucideIcon;
  label: string;
  /** Read out as the accessibility hint. */
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  /** The small PRO pill. Passed as `!pro` so a paying account sees no sticker. */
  proBadge?: boolean;
};

function CaptureButton({
  icon: Icon,
  label,
  hint,
  onPress,
  disabled,
  proBadge,
}: CaptureButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={proBadge ? t('receipts.scan.proHint', { hint }) : hint}
      accessibilityState={{ disabled }}
      onPress={withTap(onPress)}
      disabled={disabled}
      style={disabled ? { opacity: 0.5 } : undefined}
      className="min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-[10px] bg-ink/5 active:bg-ink/10"
    >
      <Icon size={20} color={colors.ink} strokeWidth={1.8} />
      <Text className="font-app-medium text-[15px] text-ink" maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      {proBadge ? (
        <View className="rounded-full bg-accent/15 px-2 py-0.5">
          <Text
            className="font-app-semibold text-[10px] tracking-widest"
            style={{ color: colors.accentInk }}
            maxFontSizeMultiplier={1.2}
          >
            PRO
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
