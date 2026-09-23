import { Feather } from '@react-native-vector-icons/feather';
import { Image } from 'expo-image';
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
import { ImagePickerField } from '@/components/image-picker-field';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type Purchase, usePurchases } from '@/hooks/use-purchases';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDateHeading,
  formatDisplayDate,
  formatRelativeTime,
  formatTimeOnly,
  nowInPHT,
  toDateOnlyString,
} from '@/utils/date';
import { resolveImageUri, savePickedImage } from '@/utils/purchase-image';

type PurchaseSection = {
  title: string;
  data: Purchase[];
};

/** Which face the purchase dialog is showing; null when it's closed. */
type DialogMode = 'add' | 'details' | 'edit' | null;

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

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(nowInPHT);
  // What the photo field previews. `imageChanged` tells a kept image (already
  // saved) apart from a freshly picked one that still needs saving.
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = nowInPHT();
  const sections = useMemo(() => groupByCreatedDate(purchases), [purchases]);
  const selectedPurchase = purchases.find((item) => item.id === selectedId) ?? null;
  const pendingDeletePurchase = purchases.find((item) => item.id === pendingDeleteId) ?? null;

  const updateField = (setter: (value: string) => void) => (text: string) => {
    setter(text);
    if (error) setError(null);
  };

  const handleProductNameChange = (text: string) => {
    updateField(setProductName)(text);
    if (nameError && text.trim()) setNameError(null);
  };

  const handleImageChange = (uri: string | null) => {
    setImageUri(uri);
    setImageChanged(true);
    if (error) setError(null);
  };

  const resetForm = () => {
    setProductName('');
    setBrand('');
    setModel('');
    setQuantity('1');
    setPurchaseDate(nowInPHT());
    setImageUri(null);
    setImageChanged(false);
    setNameError(null);
    setError(null);
  };

  const handleAddNew = () => {
    setSelectedId(null);
    resetForm();
    setDialogMode('add');
  };

  const handleOpen = (id: string) => {
    setSelectedId(id);
    setDialogMode('details');
  };

  const handleStartEdit = () => {
    if (!selectedPurchase) return;

    setProductName(selectedPurchase.productName);
    setBrand(selectedPurchase.brand);
    setModel(selectedPurchase.model);
    setQuantity(String(selectedPurchase.quantity));
    setPurchaseDate(new Date(selectedPurchase.purchaseDate));
    setImageUri(selectedPurchase.imageRef ? resolveImageUri(selectedPurchase.imageRef) : null);
    setImageChanged(false);
    setNameError(null);
    setError(null);
    setDialogMode('edit');
  };

  // Cancelling an edit discards the draft and goes back to the saved details.
  const handleCancelEdit = () => {
    resetForm();
    setDialogMode('details');
  };

  const handleCloseDialog = () => {
    if (isSaving) return;
    setDialogMode(null);
    setSelectedId(null);
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

  const handleSubmit = async () => {
    if (isSaving) return;

    const trimmedName = productName.trim();
    if (!trimmedName) {
      setNameError('Product name is required.');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError('Quantity must be a whole number of at least 1.');
      return;
    }

    if (purchaseDate.getTime() > nowInPHT().getTime()) {
      setError("Purchase date can't be in the future.");
      return;
    }

    const isEditing = dialogMode === 'edit' && selectedPurchase !== null;
    let imageRef: string | null = isEditing ? (selectedPurchase.imageRef ?? null) : null;
    if (imageChanged) {
      if (imageUri) {
        setIsSaving(true);
        try {
          imageRef = await savePickedImage(imageUri);
        } catch (caught) {
          console.warn('Failed to save purchase photo', caught);
          setError("Couldn't save the photo. Try another one.");
          return;
        } finally {
          setIsSaving(false);
        }
      } else {
        imageRef = null;
      }
    }

    const input = {
      productName: trimmedName,
      brand: brand.trim(),
      model: model.trim(),
      quantity: parsedQuantity,
      purchaseDate,
      imageRef,
    };

    if (isEditing) {
      updatePurchase(selectedPurchase.id, input);
      resetForm();
      setDialogMode('details');
    } else {
      addPurchase(input);
      setDialogMode(null);
      resetForm();
    }
  };

  const isFormMode = dialogMode === 'add' || dialogMode === 'edit';
  const dialogTitle =
    dialogMode === 'add'
      ? 'Add purchase'
      : dialogMode === 'edit'
        ? 'Edit purchase'
        : (selectedPurchase?.productName ?? '');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PurchaseRow purchase={item} onOpen={handleOpen} onRemove={handleRequestRemove} />
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
        visible={dialogMode !== null}
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
                {dialogTitle}
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

            {dialogMode === 'details' && selectedPurchase && (
              <PurchaseDetails purchase={selectedPurchase} onEdit={handleStartEdit} />
            )}

            {isFormMode && (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.dialogForm}>
                <ImagePickerField value={imageUri} onChange={handleImageChange} />

                <View style={styles.fieldGroup}>
                  <FormInput
                    value={productName}
                    onChangeText={handleProductNameChange}
                    placeholder="Product name *"
                    accessibilityLabel="Product name, required"
                    invalid={nameError !== null}
                  />
                  {nameError && (
                    <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                      {nameError}
                    </ThemedText>
                  )}
                </View>
                <FormInput value={brand} onChangeText={updateField(setBrand)} placeholder="Brand" />
                <FormInput value={model} onChangeText={updateField(setModel)} placeholder="Model" />
                <FormInput
                  value={quantity}
                  onChangeText={updateField(setQuantity)}
                  placeholder="Quantity"
                  keyboardType="numeric"
                />

                <DateTimeField
                  value={purchaseDate}
                  onChange={setPurchaseDate}
                  maximumDate={today}
                />

                {error && (
                  <ThemedText type="small" themeColor="danger">
                    {error}
                  </ThemedText>
                )}

                <View style={styles.formActions}>
                  {dialogMode === 'edit' && (
                    <Pressable
                      onPress={handleCancelEdit}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        { backgroundColor: theme.backgroundSelected },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold">Cancel</ThemedText>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.addButton,
                      (pressed || isSaving) && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.addButtonText}>
                      {isSaving
                        ? 'Saving…'
                        : dialogMode === 'edit'
                          ? 'Save changes'
                          : 'Add purchase'}
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            )}
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

type PurchaseDetailsProps = {
  purchase: Purchase;
  onEdit: () => void;
};

/** Read-only view of every saved field of a purchase, with a way into edit mode. */
function PurchaseDetails({ purchase, onEdit }: PurchaseDetailsProps) {
  const purchaseDate = new Date(purchase.purchaseDate);
  const details: { label: string; value: string }[] = [
    { label: 'Brand', value: purchase.brand || '—' },
    { label: 'Model', value: purchase.model || '—' },
    { label: 'Quantity', value: String(purchase.quantity) },
    {
      label: 'Purchased',
      value: `${formatDisplayDate(purchaseDate)}, ${formatTimeOnly(purchaseDate)}`,
    },
    { label: 'Bought', value: formatRelativeTime(purchaseDate) },
    { label: 'Added', value: formatDisplayDate(new Date(purchase.createdAt)) },
  ];

  return (
    <ScrollView contentContainerStyle={styles.dialogForm}>
      {purchase.imageRef ? (
        <Image
          source={{ uri: resolveImageUri(purchase.imageRef) }}
          style={styles.detailImage}
          contentFit="cover"
          accessibilityLabel={`Photo of ${purchase.productName}`}
        />
      ) : null}

      <View style={styles.detailList}>
        {details.map((detail) => (
          <View key={detail.label} style={styles.detailRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {detail.label}
            </ThemedText>
            <ThemedText type="small" style={styles.detailValue}>
              {detail.value}
            </ThemedText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.addButton, styles.editButton, pressed && styles.pressed]}>
        <Feather name="edit-2" size={16} color="#ffffff" />
        <ThemedText type="smallBold" style={styles.addButtonText}>
          Edit
        </ThemedText>
      </Pressable>
    </ScrollView>
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
    flex: 1,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editButton: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  detailImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.two,
  },
  detailList: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
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
  fieldGroup: {
    gap: Spacing.one,
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
