import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, ImageUp, ScanLine, Trash2, Wallet } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { guessCategory, matchBrand, useBrandDirectory, useSpendCategories } from '@/api/brands';
import { useCreateReceipt, useDeleteReceipt, useUpdateReceipt } from '@/api/mutations';
import { usePaymentSources, useReceipt } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { useDialog, useConfirm } from '@/providers/dialog-provider';
import { SelectField } from '@/components/ui/select-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { parseReceipt, parseReceiptFromLines, type ParsedReceipt } from '@/lib/receipt-parser';
import { colors } from '@/theme/colors';
import {
  isRecognitionAvailable,
  isScanningAvailable,
  recognizeReceipt,
  recognizeText,
  scanDocument,
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

/**
 * Loads the row being edited, then hands it to the form as initial state.
 *
 * The form is keyed on the id so it remounts once the row lands, which is how
 * state gets seeded from data without an effect that writes state during
 * render and fights the user's own edits afterwards.
 */
export default function AddReceiptScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing, isLoading } = useReceipt(id);

  if (id && isLoading && !existing) {
    return (
      <Screen showBack>
        <Title className="mt-2">Edit receipt</Title>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

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
    : BLANK;

  return <ReceiptForm key={existing?.id ?? 'new'} id={id} initial={initial} />;
}

function ReceiptForm({ id, initial }: { id?: string; initial: Initial }) {
  const editing = Boolean(id);

  const [store, setStore] = useState<BrandSelection | null>(initial.store);
  const [date, setDate] = useState<Date>(initial.date);
  const [amount, setAmount] = useState(initial.amount);
  const [sourceId, setSourceId] = useState(initial.sourceId);
  const [note, setNote] = useState(initial.note);
  const [captureSource, setCaptureSource] = useState(initial.captureSource);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [amountPadOpen, setAmountPadOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  const { data: directory = [] } = useBrandDirectory();

  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const confirm = useConfirm();
  const ask = useDialog();

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

  const handleScan = async () => {
    setError(null);
    setScanResult(null);

    // Scanning only exists on real hardware. Saying so beats a button that
    // silently does nothing, and beats hiding it so the feature looks unbuilt.
    if (!isScanningAvailable()) {
      await ask({
        title: 'Scanning needs a camera',
        message:
          'The Simulator has none, so scanning is unavailable here. Upload reads a photo or a PDF and works everywhere.',
        cancelLabel: null,
      });
      return;
    }

    // A word before the camera opens. The scan is only as good as the shot,
    // and the two things that ruin one are shadow and a cropped total.
    const go = await confirm({
      title: 'Scanning a receipt',
      message:
        'Lay it flat in good light and fit the whole receipt in frame — the total is usually at the bottom. Skip reads the store, date, total and card, and you can fix anything it gets wrong.',
      confirmLabel: 'Open scanner',
      cancelLabel: 'Not now',
    });
    if (!go) return;

    try {
      setReading(true);
      const result = await scanDocument();
      // Prefer the positioned reading; a build without it still returns text.
      if (result) {
        applyScan(
          result.lines?.length ? parseReceiptFromLines(result.lines) : parseReceipt(result.text),
          'scan',
        );
      }
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not open the scanner.');
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
      setError((thrown as Error).message ?? 'Could not read that file.');
    } finally {
      setReading(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access in Settings to read a receipt from your library.');
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

  const handleSave = async () => {
    setError(null);

    if (!store) {
      setError('Pick a store first.');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter how much you spent.');
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
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save that receipt.');
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
      setError((thrown as Error).message ?? 'Could not delete that receipt.');
    }
  };

  const busy = createReceipt.isPending || updateReceipt.isPending;

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">{editing ? 'Edit receipt' : 'Add receipt'}</Title>

      {/* Capture comes first: reading a paper receipt is the fast path, and
          burying it under the fields makes typing look like the only option.
          Hidden while editing — a saved receipt is corrected, not re-read. */}
      {!editing && isRecognitionAvailable() ? (
        <View className="mt-6 w-full gap-2">
          <View className="w-full flex-row gap-3">
            <CaptureButton
              icon={<ScanLine size={18} color={colors.ink} strokeWidth={1.9} />}
              label="Scan"
              onPress={handleScan}
              disabled={reading}
            />
            <CaptureButton
              icon={<ImageUp size={18} color={colors.ink} strokeWidth={1.9} />}
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
        </View>
      ) : null}

      {reading ? (
        <View className="mt-4 w-full flex-row items-center justify-center gap-2">
          <ActivityIndicator size="small" color={colors.muted} />
          <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            Reading the receipt…
          </Text>
        </View>
      ) : null}

      <View className="mt-8 w-full gap-6">
        <BrandField label="Store" value={store} onChange={edited(setStore)} />

        <SelectField
          label="Date"
          value={formatFullDate(date)}
          icon={Calendar}
          onPress={() => setDatePickerOpen(true)}
        />

        <SelectField
          label="Amount"
          value={amount ? formatCurrency(Number(amount)) : ''}
          placeholder="Enter an amount"
          icon={Wallet}
          onPress={() => setAmountPadOpen(true)}
        />

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

        {scanResult ? (
          <View className="w-full rounded-[10px] border border-line px-4 py-3">
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

        {categoryLabel ? (
          <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
            Filed under {categoryLabel}
          </Text>
        ) : null}

        {error ? (
          <Text className="font-poppins text-[13px] text-red-600" maxFontSizeMultiplier={1.4}>
            {error}
          </Text>
        ) : null}
      </View>

      <View className="mt-auto w-full gap-3 pt-10">
        <Button
          label={busy ? 'Saving…' : editing ? 'Save changes' : 'Save receipt'}
          onPress={handleSave}
        />
        {editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this receipt"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] active:bg-black/5"
          >
            <Trash2 size={17} color="#DC2626" strokeWidth={1.9} />
            <Text
              className="font-poppins-medium text-[15px] text-red-600"
              maxFontSizeMultiplier={1.4}
            >
              {deleteReceipt.isPending ? 'Deleting…' : 'Delete receipt'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {datePickerOpen ? (
        <DatePicker
          value={date}
          onCancel={() => setDatePickerOpen(false)}
          onConfirm={(next) => {
            edited(setDate)(next);
            setDatePickerOpen(false);
          }}
        />
      ) : null}

      {amountPadOpen ? (
        <AmountPad
          title="Amount"
          caption={store ? store.name : 'Receipt total'}
          value={amount}
          onCancel={() => setAmountPadOpen(false)}
          onConfirm={(next) => {
            edited(setAmount)(next);
            setAmountPadOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

function CaptureButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[10px] border border-line active:bg-black/5"
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {icon}
      <Text className="font-poppins-medium text-[15px] text-ink" maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}
