import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Banknote,
  CreditCard,
  ImageUp,
  ScanLine,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { guessCategory, matchBrand, useBrandDirectory, useSpendCategories } from '@/api/brands';
import { usePro } from '@/api/pro';
import { buildReceiptValues } from '@/api/entry-values';
import {
  useCreateReceipt,
  useDeleteReceipt,
  useUpdateReceipt,
  type CaptureSource,
} from '@/api/mutations';
import { usePaymentSources, useReceipt } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { BrandMark } from '@/components/brands/brand-mark';
import { openChangeLogo } from '@/components/brands/change-logo-button';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialog, useConfirm } from '@/providers/dialog-provider';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { GlyphWell, ReviewRow } from '@/components/voice/review-row';
import { t, type MessageKey } from '@/i18n';
import { MESSAGES } from '@/i18n/messages';
import { success, warn } from '@/lib/haptics';
import { withTap } from '@/lib/press';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { logoColumns, selectionLogo } from '@/lib/logo-columns';
import { logoDomainOf, type LogoFields } from '@/lib/logo-domain';
import { refusedForPro } from '@/lib/pro-refusal';
import { parseReceipt, parseReceiptFromLines, type ParsedReceipt } from '@/lib/receipt-parser';
import {
  clearVoiceDraft,
  readAmountParam,
  readDayParam,
  readMerchantParams,
  readSourceParam,
} from '@/lib/voice-draft';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import {
  captureReceipt,
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

/** A shop category's name by its stored id; an id the app has no words for keeps its stored label. */
function categoryName(id: string, stored: string | undefined): string {
  const key = `receipts.category.${id}`;
  if (key in MESSAGES) return t(key as MessageKey);
  return stored ?? t('receipts.category.other');
}

/**
 * Where a reading lands: the review and Save when it holds what Save needs, else the first step
 * still missing it, so nobody arrives on a Save that cannot save.
 */
function landingStep(amount: string, store: BrandSelection | null): number {
  const value = Number(amount);
  if (!(Number.isFinite(value) && value > 0)) return 0;
  return store ? 2 : 1;
}

type Initial = {
  store: BrandSelection | null;
  date: Date;
  amount: string;
  sourceId: string;
  note: string;
  captureSource: CaptureSource;
};

const BLANK: Initial = {
  store: null,
  date: new Date(),
  amount: '',
  sourceId: '',
  note: '',
  captureSource: 'manual',
};

const ALL_FIELDS = ['store', 'date', 'amount', 'card'] as const;

type ScanParams = {
  scannedStore?: string;
  scannedBrandId?: string;
  scannedDomain?: string;
  scannedCategory?: string;
  scannedAmount?: string;
  scannedDate?: string;
  scannedSource?: string;
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
    return { initial: BLANK, result: null };
  }

  const store = readMerchantParams({
    name: params.scannedStore,
    brandId: params.scannedBrandId,
    domain: params.scannedDomain,
    categoryId: params.scannedCategory,
  });

  return {
    initial: {
      store: store ? { ...store, categoryId: store.categoryId || 'other' } : null,
      date: readDayParam(params.scannedDate) ?? new Date(),
      amount: readAmountParam(params.scannedAmount),
      sourceId: readSourceParam(params.scannedSource),
      note: '',
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
          steps={3}
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
      // Only a scan opens past the amount; a voice hand-off and an edit start at the beginning.
      initialStep={
        !existing && scanned.result ? landingStep(scanned.initial.amount, scanned.initial.store) : 0
      }
      fromVoice={fromVoice}
    />
  );
}

function ReceiptForm({
  id,
  initial,
  saved = null,
  initialScan,
  initialStep = 0,
  fromVoice = false,
}: {
  id?: string;
  initial: Initial;
  /** The row being edited, for the logo it already has. */
  saved?: LogoFields | null;
  initialScan: ScanResult | null;
  initialStep?: number;
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
  const [sourceId, setSourceId] = useState(initial.sourceId);
  const [note, setNote] = useState(initial.note);
  const [captureSource, setCaptureSource] = useState(initial.captureSource);

  const [step, setStep] = useState(initialStep);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(initialScan);

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  const { data: directory = [] } = useBrandDirectory();

  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const confirm = useConfirm();
  const ask = useDialog();
  const { pro, ready } = usePro();

  // A hand edit retires the scan report: telling someone to check an amount they just corrected is
  // worse than silence.
  const edited =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      setScanResult(null);
      set(value);
    };

  const categoryLabel = store
    ? categoryName(
        store.categoryId,
        categories.find((category) => category.id === store.categoryId)?.label,
      )
    : null;

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
    if (found.length > 0) setStep(landingStep(nextAmount, nextStore));
  };

  const handleScan = async () => {
    // Until Pro is known a tap does nothing, so someone who paid is never sent to the explainer.
    if (!ready) return;
    setError(null);
    setScanResult(null);

    if (!pro) {
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
        applyScan(
          result.lines?.length ? parseReceiptFromLines(result.lines) : parseReceipt(result.text),
          'scan',
        );
      }
    } catch (thrown) {
      setError({ message: failureMessage(thrown), step: 0 });
    } finally {
      setReading(false);
    }
  };

  const readFrom = async (uri: string) => {
    try {
      setReading(true);
      const lines = await recognizeReceipt(uri);
      applyScan(
        lines.length ? parseReceiptFromLines(lines) : parseReceipt(await recognizeText(uri)),
        'upload',
      );
    } catch (thrown) {
      setError({ message: failureMessage(thrown), step: 0 });
    } finally {
      setReading(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError({
        message: t('receipts.scan.photoAccess'),
        step: 0,
      });
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
    if (!ready) return;
    setError(null);
    if (!pro) {
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

  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
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

    const built = buildReceiptValues(
      { store, amount, date, sourceId, note, captureSource },
      sources,
    );
    if (!built.ok) {
      fail(built.message, built.field === 'store' ? 1 : 0);
      return;
    }
    const values = { ...built.values, ...logoColumns(store, saved) };

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
        router.push({
          pathname: '/pro-feature',
          params: { id: captureSource === 'voice' ? 'voice' : 'scan' },
        });
        return;
      }
      warn();
      setError({ message: failureMessage(thrown), step: 2 });
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
      setError({ message: failureMessage(thrown), step });
    }
  };

  const busy = createReceipt.isPending || updateReceipt.isPending;

  const total = Number(amount);
  const amountReady = Number.isFinite(total) && total > 0;
  const stepValid = step === 0 ? amountReady : step === 1 ? Boolean(store) : !busy;

  const question =
    step === 0 ? t('receipts.add.askAmount') : step === 2 ? t('receipts.add.askDate') : undefined;
  const primaryLabel =
    step < 2
      ? t('common.continue')
      : busy
        ? t('receipts.add.saving')
        : editing
          ? t('receipts.add.saveChanges')
          : t('receipts.add.saveReceipt');
  const stepError = error && error.step === step ? error.message : null;
  // A new scanned receipt shows what was read above the date, so the last step is a review.
  const reviewing =
    step === 2 && !editing && (captureSource === 'scan' || captureSource === 'upload');
  const sourceLabel = sources.find((source) => source.id === sourceId)?.label ?? null;

  return (
    <StepFlow
      title={editing ? t('receipts.add.titleEdit') : t('receipts.add.titleNew')}
      closePrompt={editing ? t('receipts.add.closeEdit') : t('receipts.add.closeNew')}
      steps={3}
      current={step}
      onBack={() => {
        setError(null);
        if (step === 0) router.back();
        else setStep((current) => current - 1);
      }}
      question={question}
      // Capture sits above the question: a paper receipt fills amount, store and date at once.
      headerSlot={
        step === 0 || scanResult || reviewing ? (
          <View className="w-full gap-2">
            {step === 0 && !editing && isRecognitionAvailable() ? (
              <View className="w-full flex-row gap-3">
                <CaptureButton
                  icon={ScanLine}
                  label={t('receipts.scan.scan')}
                  hint={t('receipts.scan.scanHint')}
                  onPress={handleScan}
                  disabled={reading || !ready}
                  proBadge={ready && !pro}
                />
                <CaptureButton
                  icon={ImageUp}
                  label={t('receipts.scan.upload')}
                  hint={t('receipts.scan.uploadHint')}
                  onPress={handleUpload}
                  disabled={reading || !ready}
                  proBadge={ready && !pro}
                />
              </View>
            ) : null}

            {step === 0 && reading ? (
              <View className="mt-2 w-full flex-row items-center justify-center gap-2">
                <ActivityIndicator size="small" color={colors.muted} />
                <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
                  {t('receipts.scan.reading')}
                </Text>
              </View>
            ) : null}

            {scanResult ? (
              <View className="mt-2 w-full rounded-[16px] bg-ink/5 px-4 py-3">
                {scanResult.read.length > 0 ? (
                  <Text className="font-app text-[13px] text-ink" maxFontSizeMultiplier={1.4}>
                    {t('receipts.scan.read', { fields: listWords(scanResult.read) })}
                  </Text>
                ) : (
                  <Text className="font-app text-[13px] text-ink" maxFontSizeMultiplier={1.4}>
                    {failureText()}
                  </Text>
                )}
                {scanResult.missed.length > 0 ? (
                  <Text
                    className="mt-1 font-app text-[13px] text-muted"
                    maxFontSizeMultiplier={1.4}
                  >
                    {t('receipts.scan.check', { fields: listWords(scanResult.missed) })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {reviewing ? (
              <View className="mt-2 w-full overflow-hidden rounded-[16px] border border-line bg-card py-1">
                <ReviewRow
                  label={t('receipts.field.amount')}
                  value={amountReady ? formatCurrency(total) : null}
                  required
                  leading={<GlyphWell icon={Banknote} />}
                  onPress={() => setStep(0)}
                />
                <View className="ml-[52px] h-px bg-line/60" />
                <ReviewRow
                  label={t('receipts.field.store')}
                  value={store?.name ?? null}
                  required
                  leading={
                    store ? (
                      <BrandMark
                        name={store.name}
                        domain={selectionLogo(store)}
                        hidden={store.logoHidden}
                        size={40}
                      />
                    ) : null
                  }
                  onPress={() => setStep(1)}
                />
                <View className="ml-[52px] h-px bg-line/60" />
                <ReviewRow
                  label={t('receipts.field.paidWith')}
                  value={sourceLabel}
                  required={false}
                  leading={<GlyphWell icon={CreditCard} />}
                  onPress={() => setStep(1)}
                />
              </View>
            ) : null}
          </View>
        ) : null
      }
      primaryLabel={primaryLabel}
      primaryDisabled={!stepValid}
      onPrimary={() => {
        if (step < 2) {
          setError(null);
          setStep((current) => current + 1);
          return;
        }
        void handleSave();
      }}
      error={step === 1 ? null : stepError}
      avoidKeyboard={step === 1}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('receipts.add.deleteLabel')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text className="font-app-medium text-[15px] text-danger" maxFontSizeMultiplier={1.4}>
              {deleteReceipt.isPending
                ? t('receipts.add.deleting')
                : t('receipts.add.deleteReceipt')}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={amount} onChange={edited(setAmount)} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
          <BrandField
            label={t('receipts.field.store')}
            value={store}
            onChange={edited(setStore)}
            onChangeLogo={
              editing && id && !storeChanged && store
                ? () => openChangeLogo('receipt', id, store.name)
                : undefined
            }
          />

          {sources.length > 0 ? (
            <View className="w-full">
              <FieldLabel className="mb-3">{t('receipts.field.paidWith')}</FieldLabel>
              <SourceTiles sources={sources} value={sourceId} onChange={edited(setSourceId)} />
            </View>
          ) : null}

          <TextField
            label={t('receipts.field.note')}
            optional
            value={note}
            onChangeText={setNote}
            placeholder={t('receipts.add.notePlaceholder')}
            multiline
            maxLength={200}
            autoCapitalize="sentences"
          />

          {categoryLabel ? (
            <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
              {t('receipts.add.filedUnder', { category: categoryLabel })}
            </Text>
          ) : null}

          {stepError ? (
            <Text className="w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? <InlineCalendar value={date} onChange={edited(setDate)} /> : null}
    </StepFlow>
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
