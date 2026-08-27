import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, ImageUp, ScanLine, Trash2, Wallet } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { guessCategory, matchBrand, useBrandDirectory, useSpendCategories } from '@/api/brands';
import { useCreateReceipt, useDeleteReceipt, useUpdateReceipt } from '@/api/mutations';
import { usePaymentSources, useReceipt } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { parseReceipt } from '@/lib/receipt-parser';
import { colors } from '@/theme/colors';
import {
  isRecognitionAvailable,
  isScanningAvailable,
  recognizeText,
  scanDocument,
} from '../../modules/receipt-scanner';

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

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  const { data: directory = [] } = useBrandDirectory();

  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();

  const categoryLabel = store
    ? (categories.find((category) => category.id === store.categoryId)?.label ?? 'Other')
    : null;

  /** Turns recognised text into filled fields, leaving anything unsure alone. */
  const applyScan = (text: string, from: 'scan' | 'upload') => {
    const parsed = parseReceipt(text);
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
      filled += 1;
    }
    if (parsed.total !== undefined) {
      setAmount(String(parsed.total));
      filled += 1;
    }
    if (parsed.date) {
      setDate(new Date(`${parsed.date}T00:00:00`));
      filled += 1;
    }
    if (parsed.last4) {
      const digits = parsed.last4;
      const matched = sources.find((source) => source.label.endsWith(digits));
      if (matched) {
        setSourceId(matched.id);
        filled += 1;
      }
    }

    setCaptureSource(from);
    setError(
      filled === 0
        ? 'Could not read that one. Fill it in by hand and it will still be saved.'
        : null,
    );
  };

  const handleScan = async () => {
    setError(null);
    try {
      setReading(true);
      const result = await scanDocument();
      if (result) applyScan(result.text, 'scan');
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not open the scanner.');
    } finally {
      setReading(false);
    }
  };

  const readFrom = async (uri: string) => {
    try {
      setReading(true);
      applyScan(await recognizeText(uri), 'upload');
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
  const handleUpload = () => {
    setError(null);
    Alert.alert('Where is the receipt?', undefined, [
      { text: 'Photo library', onPress: () => void pickPhoto() },
      { text: 'Files', onPress: () => void pickFile() },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete this receipt?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReceipt.mutateAsync(id);
            router.back();
          } catch (thrown) {
            setError((thrown as Error).message ?? 'Could not delete that receipt.');
          }
        },
      },
    ]);
  };

  const busy = createReceipt.isPending || updateReceipt.isPending;

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">{editing ? 'Edit receipt' : 'Add receipt'}</Title>

      {/* Capture comes first: reading a paper receipt is the fast path, and
          burying it under the fields makes typing look like the only option.
          Hidden while editing — a saved receipt is corrected, not re-read. */}
      {!editing && isRecognitionAvailable() ? (
        <View className="mt-6 w-full flex-row gap-3">
          {isScanningAvailable() ? (
            <CaptureButton
              icon={<ScanLine size={18} color={colors.ink} strokeWidth={1.9} />}
              label="Scan"
              onPress={handleScan}
              disabled={reading}
            />
          ) : null}
          <CaptureButton
            icon={<ImageUp size={18} color={colors.ink} strokeWidth={1.9} />}
            label="Upload"
            onPress={handleUpload}
            disabled={reading}
          />
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
        <BrandField label="Store" value={store} onChange={setStore} />

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
            <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
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
            setDate(next);
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
            setAmount(next);
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
