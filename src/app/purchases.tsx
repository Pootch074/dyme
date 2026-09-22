import { Feather } from '@react-native-vector-icons/feather';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { DateTimeField } from '@/components/date-time-field';
import { FormInput } from '@/components/form-input';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type Purchase, usePurchases } from '@/hooks/use-purchases';
import { useTheme } from '@/hooks/use-theme';
import { formatDateHeading, toDateOnlyString } from '@/utils/date';

type PurchaseSection = {
  title: string;
  data: Purchase[];
};

/** Groups purchases into same-day sections, newest creation time first. */
function groupByCreatedDate(purchases: Purchase[]): PurchaseSection[] {
  const sorted = [...purchases].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sections: PurchaseSection[] = [];
  let lastDateKey = '';

  for (const purchase of sorted) {
    const createdAt = new Date(purchase.createdAt);
    const dateKey = toDateOnlyString(createdAt);

    if (dateKey === lastDateKey) {
      sections[sections.length - 1].data.push(purchase);
    } else {
      sections.push({ title: formatDateHeading(createdAt), data: [purchase] });
      lastDateKey = dateKey;
    }
  }

  return sections;
}

export default function PurchasesScreen() {
  const { purchases, isLoading, addPurchase, updatePurchase, removePurchase } = usePurchases();
  const theme = useTheme();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const sections = useMemo(() => groupByCreatedDate(purchases), [purchases]);
  const pendingDeletePurchase = purchases.find((item) => item.id === pendingDeleteId) ?? null;

  const updateField = (setter: (value: string) => void) => (text: string) => {
    setter(text);
    if (error) setError(null);
  };

  const resetForm = () => {
    setProductName('');
    setBrand('');
    setModel('');
    setQuantity('1');
    setPurchaseDate(new Date());
    setError(null);
  };

  const handleAddNew = () => {
    setEditingId(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (id: string) => {
    const purchase = purchases.find((item) => item.id === id);
    if (!purchase) return;

    setEditingId(id);
    setProductName(purchase.productName);
    setBrand(purchase.brand);
    setModel(purchase.model);
    setQuantity(String(purchase.quantity));
    setPurchaseDate(new Date(purchase.purchaseDate));
    setError(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    resetForm();
  };

  const handleRequestRemove = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleCancelDelete = () => {
    setPendingDeleteId(null);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) removePurchase(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const handleSubmit = () => {
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

    if (purchaseDate.getTime() > Date.now()) {
      setError("Purchase date can't be in the future.");
      return;
    }

    const input = {
      productName: trimmedName,
      brand: brand.trim(),
      model: model.trim(),
      quantity: parsedQuantity,
      purchaseDate,
    };

    if (editingId) {
      updatePurchase(editingId, input);
    } else {
      addPurchase(input);
    }

    setIsDialogOpen(false);
    setEditingId(null);
    resetForm();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PurchaseRow purchase={item} onEdit={handleEdit} onRemove={handleRequestRemove} />
          )}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <BackButton />
              <ThemedText type="subtitle">Purchases</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
                Track how long ago you bought something.
              </ThemedText>
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No purchases tracked yet. Tap + to add your first one.
              </ThemedText>
            ) : null
          }
        />

        <Pressable
          onPress={handleAddNew}
          accessibilityRole="button"
          accessibilityLabel="Add purchase"
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <Feather name="plus" size={26} color="#ffffff" />
        </Pressable>
      </SafeAreaView>

      <Modal
        visible={isDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDialog}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={handleCloseDialog}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />

          <ThemedView type="backgroundElement" style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <ThemedText type="subtitle" style={styles.dialogTitle} numberOfLines={1}>
                {editingId ? 'Edit purchase' : 'Add purchase'}
              </ThemedText>
              <Pressable
                onPress={handleCloseDialog}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.dialogForm}>
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
                onPress={handleSubmit}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.addButtonText}>
                  {editingId ? 'Save changes' : 'Add purchase'}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={pendingDeletePurchase !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={handleCancelDelete}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
          />

          <ThemedView type="backgroundElement" style={styles.confirmDialog}>
            <ThemedText type="subtitle" numberOfLines={1}>
              Remove purchase?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.confirmMessage}>
              {pendingDeletePurchase
                ? `"${pendingDeletePurchase.productName}" will be permanently removed.`
                : ''}
            </ThemedText>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={handleCancelDelete}
                style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.confirmButton,
                  { backgroundColor: theme.danger },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.confirmDeleteText}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
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
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.two,
  },
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    marginTop: Spacing.three,
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
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 4, color: 'rgba(0, 0, 0, 0.25)' }],
  },
  fabPressed: {
    opacity: 0.85,
  },
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  dialogTitle: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogForm: {
    padding: Spacing.three,
    paddingTop: 0,
    gap: Spacing.three,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  confirmMessage: {
    marginBottom: Spacing.two,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#ffffff',
  },
});
