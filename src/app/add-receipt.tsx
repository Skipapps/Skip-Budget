import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { ImageUp, ScanLine, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { guessCategory, matchBrand, useBrandDirectory, useSpendCategories } from '@/api/brands';
import { usePro } from '@/api/pro';
import { useCreateReceipt, useDeleteReceipt, useUpdateReceipt } from '@/api/mutations';
import { usePaymentSources, useReceipt } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import { ActionPill } from '@/components/ui/action-pill';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialog, useConfirm } from '@/providers/dialog-provider';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { toIsoDate } from '@/lib/date';
import { success, warn } from '@/lib/haptics';
import { saveErrorMessage } from '@/lib/save-error';
import { parseReceipt, parseReceiptFromLines, type ParsedReceipt } from '@/lib/receipt-parser';
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

const FIELD_WORDS: Record<ScanField, string> = {
  store: 'store',
  date: 'date',
  amount: 'amount',
  card: 'card',
};

/** "store, date and amount" — an Oxford-free list, because it is read aloud. */
function listWords(fields: ScanField[]): string {
  const words = fields.map((field) => FIELD_WORDS[field]);
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

type Initial = {
  store: BrandSelection | null;
  date: Date;
  amount: string;
  sourceId: string;
  note: string;
  captureSource: 'manual' | 'scan' | 'upload';
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
};

/**
 * A scan that could not be filed on its own, arriving as route params.
 *
 * The receipts page files anything with both a store and a total without ever
 * opening this screen. What lands here is the remainder — a reading that is
 * missing one of them — so the fields it did get are already in place and only
 * the gap needs typing.
 */
function fromScanParams(params: ScanParams): { initial: Initial; result: ScanResult | null } {
  const read = (params.scannedRead ?? '')
    .split(',')
    .filter((field): field is ScanField => (ALL_FIELDS as readonly string[]).includes(field));

  if (read.length === 0 && !params.scannedStore && !params.scannedAmount) {
    return { initial: BLANK, result: null };
  }

  return {
    initial: {
      store: params.scannedStore
        ? {
            brandId: params.scannedBrandId || null,
            name: params.scannedStore,
            domain: params.scannedDomain || null,
            categoryId: params.scannedCategory || 'other',
          }
        : null,
      date: params.scannedDate ? new Date(`${params.scannedDate}T00:00:00`) : new Date(),
      amount: params.scannedAmount ?? '',
      sourceId: params.scannedSource ?? '',
      note: '',
      captureSource: 'scan',
    },
    result: { read, missed: ALL_FIELDS.filter((field) => !read.includes(field)) },
  };
}

/**
 * Loads the row being edited, then hands it to the form as initial state.
 *
 * The form is keyed on the id so it remounts once the row lands, which is how
 * state gets seeded from data without an effect that writes state during
 * render and fights the user's own edits afterwards.
 */
export default function AddReceiptScreen() {
  const params = useLocalSearchParams<{ id?: string } & ScanParams>();
  const { id } = params;
  const artwork = useArtwork();
  const receipt = useReceipt(id);
  const existing = receipt.data ?? null;

  if (id && !existing) {
    // A read that failed is not a receipt that is gone, and it is certainly
    // not a new one: silently dropping the id would file a second copy of a
    // receipt that already exists. So the screen says so and offers the retry.
    if (receipt.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title="Could not open this receipt"
            message="Check your connection and try again. Nothing about it has changed."
            actionLabel="Try again"
            onAction={() => {
              void receipt.refetch();
            }}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    // The shell with the fields greyed out, never a $0 figure: a placeholder
    // amount on a receipt that is still loading is a wrong number on screen.
    if (!receipt.isFetched) {
      return (
        <StepFlow
          title="Edit receipt"
          steps={3}
          current={1}
          onBack={() => router.back()}
          primaryLabel="Continue"
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

    // The lookup ran and came back empty — deleted from another screen, or a
    // stale link. An update filtered on an id that matches nothing reports
    // success and writes nothing, so an edit would animate, return to the list
    // and lose everything typed.
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title="That receipt is not here"
          message="It may have been deleted. Nothing has been changed."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const scanned = fromScanParams(params);

  const initial: Initial = existing
    ? {
        store: {
          brandId: existing.brand_id,
          name: existing.merchant,
          domain: existing.brands?.domain ?? null,
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
      initialScan={existing ? null : scanned.result}
    />
  );
}

function ReceiptForm({
  id,
  initial,
  initialScan,
}: {
  id?: string;
  initial: Initial;
  initialScan: ScanResult | null;
}) {
  const colors = useColors();
  const editing = Boolean(id);

  const [store, setStore] = useState<BrandSelection | null>(initial.store);
  const [date, setDate] = useState<Date>(initial.date);
  const [amount, setAmount] = useState(initial.amount);
  const [sourceId, setSourceId] = useState(initial.sourceId);
  const [note, setNote] = useState(initial.note);
  const [captureSource, setCaptureSource] = useState(initial.captureSource);

  // Editing opens on the details: a saved receipt is corrected, not re-typed.
  const [step, setStep] = useState(editing ? 1 : 0);
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
  const { pro } = usePro();

  /**
   * Any hand edit retires the scan report. Telling someone to check the amount
   * after they have just corrected it is worse than saying nothing.
   */
  const edited =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      setScanResult(null);
      set(value);
    };

  const categoryLabel = store
    ? (categories.find((category) => category.id === store.categoryId)?.label ?? 'Other')
    : null;

  /** Turns recognised text into filled fields, leaving anything unsure alone. */
  const applyScan = (parsed: ParsedReceipt, from: 'scan' | 'upload') => {
    const found: ScanField[] = [];
    let filled = 0;

    if (parsed.merchant) {
      const brand = matchBrand(parsed.merchant, directory);
      setStore(
        brand
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
            },
      );
      found.push('store');
      filled += 1;
    }
    if (parsed.total !== undefined) {
      setAmount(String(parsed.total));
      found.push('amount');
      filled += 1;
    }
    if (parsed.date) {
      setDate(new Date(`${parsed.date}T00:00:00`));
      found.push('date');
      filled += 1;
    }
    if (parsed.last4) {
      const digits = parsed.last4;
      const matched = sources.find((source) => source.label.endsWith(digits));
      if (matched) {
        setSourceId(matched.id);
        found.push('card');
        filled += 1;
      }
    }

    setCaptureSource(from);
    setError(null);
    // Naming what was and was not read is the difference between trusting the
    // scan and re-checking every field by hand.
    setScanResult(
      filled === 0
        ? { read: [], missed: ['store', 'date', 'amount'] }
        : {
            read: found,
            missed: (['store', 'date', 'amount', 'card'] as const).filter(
              (field) => !found.includes(field),
            ),
          },
    );
  };

  /**
   * Straight to the camera.
   *
   * There used to be a dialog here explaining how to hold a receipt. It was a
   * tap in front of the one thing this button exists to do, and it appeared
   * every single time — advice you have read once is noise the second time.
   * The framing hint now lives under the viewfinder, where it is useful while
   * the shot is being lined up rather than before the camera is even open.
   */
  const handleScan = async () => {
    setError(null);
    setScanResult(null);

    if (!pro) {
      router.push({ pathname: '/pro-feature', params: { id: 'scan' } });
      return;
    }

    // Scanning only exists on real hardware. Saying so beats a button that
    // silently does nothing, and beats hiding it so the feature looks unbuilt.
    if (!isCaptureAvailable() && !isScanningAvailable()) {
      await ask({
        title: 'Scanning needs a camera',
        message:
          'The Simulator has none, so scanning is unavailable here. Upload reads a photo or a PDF and works everywhere.',
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
      setError({ message: (thrown as Error).message ?? 'Could not open the camera.', step: 0 });
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
      setError({ message: (thrown as Error).message ?? 'Could not read that file.', step: 0 });
    } finally {
      setReading(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError({
        message: 'Allow photo access in Settings to read a receipt from your library.',
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
    setError(null);
    if (!pro) {
      router.push({ pathname: '/pro-feature', params: { id: 'scan' } });
      return;
    }
    const where = await ask({
      title: 'Where is the receipt?',
      actions: [
        { id: 'photos', label: 'Photo library' },
        { id: 'files', label: 'Files' },
      ],
    });

    if (where === 'photos') await pickPhoto();
    else if (where === 'files') await pickFile();
  };

  /** A check for a field on an earlier step sends you back to that step. */
  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);

    if (!store) {
      fail('Pick a store first.', 1);
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      fail('Enter how much you spent.', 0);
      return;
    }

    const chosen = sources.find((source) => source.id === sourceId);
    const values = {
      brand_id: store.brandId,
      merchant: store.name,
      amount: value,
      purchased_on: toIsoDate(date),
      category_id: store.categoryId || 'other',
      card_id: chosen?.kind === 'card' ? chosen.id : null,
      bank_account_id: chosen?.kind === 'account' ? chosen.id : null,
      note: note.trim() || null,
      source: captureSource,
      image_path: null,
    };

    try {
      if (editing && id) {
        await updateReceipt.mutateAsync({ id, values });
      } else {
        await createReceipt.mutateAsync(values);
      }
      success();
      router.back();
    } catch (thrown) {
      warn();
      setError({ message: saveErrorMessage(thrown, 'Could not save that receipt.'), step: 2 });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this receipt?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteReceipt.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError({ message: saveErrorMessage(thrown, 'Could not delete that receipt.'), step });
    }
  };

  const busy = createReceipt.isPending || updateReceipt.isPending;

  const total = Number(amount);
  const amountReady = Number.isFinite(total) && total > 0;
  const stepValid = step === 0 ? amountReady : step === 1 ? Boolean(store) : !busy;

  const question = step === 0 ? 'How much did you spend?' : step === 2 ? 'When was it?' : undefined;
  const primaryLabel =
    step < 2 ? 'Continue' : busy ? 'Saving…' : editing ? 'Save changes' : 'Save receipt';
  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? 'Edit receipt' : 'Add a receipt'}
      steps={3}
      current={step}
      onBack={() => {
        setError(null);
        if (step === 0) router.back();
        else setStep((current) => current - 1);
      }}
      question={question}
      // Capture sits above the question, not below the fields: reading a paper
      // receipt fills the amount, the store and the date at once, so it belongs
      // before the first of them is asked for.
      headerSlot={
        step === 0 ? (
          <View className="w-full gap-2">
            {!editing && isRecognitionAvailable() ? (
              <>
                <View className="w-full flex-row justify-center gap-3">
                  <ActionPill
                    icon={ScanLine}
                    label="Scan"
                    onPress={handleScan}
                    disabled={reading}
                  />
                  <ActionPill
                    icon={ImageUp}
                    label="Upload"
                    onPress={handleUpload}
                    disabled={reading}
                  />
                </View>
                <Text
                  className="w-full text-center font-poppins text-[12px] text-muted"
                  maxFontSizeMultiplier={1.3}
                >
                  Point the camera at a paper receipt, or upload a photo or PDF
                </Text>
              </>
            ) : null}

            {reading ? (
              <View className="mt-2 w-full flex-row items-center justify-center gap-2">
                <ActivityIndicator size="small" color={colors.muted} />
                <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
                  Reading the receipt…
                </Text>
              </View>
            ) : null}

            {scanResult ? (
              <View className="mt-2 w-full rounded-[16px] bg-ink/5 px-4 py-3">
                {scanResult.read.length > 0 ? (
                  <Text className="font-poppins text-[13px] text-ink" maxFontSizeMultiplier={1.4}>
                    Read the {listWords(scanResult.read)}.
                  </Text>
                ) : (
                  <Text className="font-poppins text-[13px] text-ink" maxFontSizeMultiplier={1.4}>
                    Could not read that one.
                  </Text>
                )}
                {scanResult.missed.length > 0 ? (
                  <Text
                    className="mt-1 font-poppins text-[13px] text-muted"
                    maxFontSizeMultiplier={1.4}
                  >
                    Check the {listWords(scanResult.missed)} below — it will save either way.
                  </Text>
                ) : null}
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
            accessibilityLabel="Delete this receipt"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-poppins-medium text-[15px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {deleteReceipt.isPending ? 'Deleting…' : 'Delete receipt'}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={amount} onChange={edited(setAmount)} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
          <BrandField label="Store" value={store} onChange={edited(setStore)} />

          {sources.length > 0 ? (
            <View className="w-full">
              <FieldLabel className="mb-3">Paid with</FieldLabel>
              <SourceTiles sources={sources} value={sourceId} onChange={edited(setSourceId)} />
            </View>
          ) : null}

          <TextField
            label="Note"
            optional
            value={note}
            onChangeText={setNote}
            placeholder="Anything worth remembering"
            multiline
            maxLength={200}
            autoCapitalize="sentences"
          />

          {categoryLabel ? (
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
              Filed under {categoryLabel}
            </Text>
          ) : null}

          {stepError ? (
            <Text
              className="w-full font-poppins text-[13px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? <InlineCalendar value={date} onChange={edited(setDate)} /> : null}
    </StepFlow>
  );
}
