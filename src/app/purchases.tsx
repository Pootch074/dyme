import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/date-time-field';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { usePurchases } from '@/hooks/use-purchases';
import { useTheme } from '@/hooks/use-theme';

export default function PurchasesScreen() {
  const { purchases, isLoading, addPurchase, removePurchase } = usePurchases();

  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const today = new Date();

  const updateField = (setter: (value: string) => void) => (text: string) => {
    setter(text);
    if (error) setError(null);
  };

  const handleAdd = () => {
    const trimmedName = productName.trim();
    if (!trimmedName) {
      setError('Enter a product name.');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError('Quantity must be a whole number of at least 1.');
      return;
    }

    if (purchaseDate.getTime() > today.getTime()) {
      setError("Purchase date can't be in the future.");
      return;
    }

    addPurchase({
      productName: trimmedName,
      brand: brand.trim(),
      model: model.trim(),
      quantity: parsedQuantity,
      purchaseDate,
    });

    setProductName('');
    setBrand('');
    setModel('');
    setQuantity('1');
    setPurchaseDate(new Date());
    setError(null);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <FlatList
            data={purchases}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PurchaseRow purchase={item} onRemove={removePurchase} />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <ThemedText type="subtitle">Purchases</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
                  Track how long ago you bought something.
                </ThemedText>

                <ThemedView type="backgroundElement" style={styles.form}>
                  <FormInput
                    value={productName}
                    onChangeText={updateField(setProductName)}
                    placeholder="Product name"
                  />
                  <FormInput value={brand} onChangeText={updateField(setBrand)} placeholder="Brand" />
                  <FormInput value={model} onChangeText={updateField(setModel)} placeholder="Model" />
                  <FormInput
                    value={quantity}
                    onChangeText={updateField(setQuantity)}
                    placeholder="Quantity"
                    keyboardType="numeric"
                  />

                  <DateTimeField value={purchaseDate} onChange={setPurchaseDate} maximumDate={today} />

                  {error && (
                    <ThemedText type="small" themeColor="danger">
                      {error}
                    </ThemedText>
                  )}

                  <Pressable
                    onPress={handleAdd}
                    style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.addButtonText}>
                      Add purchase
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </>
            }
            ListEmptyComponent={
              !isLoading ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  No purchases tracked yet. Add your first one above.
                </ThemedText>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

type FormInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
};

function FormInput({ value, onChangeText, placeholder, keyboardType }: FormInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      keyboardType={keyboardType}
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.four,
  },
  form: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  addButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
