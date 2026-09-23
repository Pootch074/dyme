import { Feather } from '@react-native-vector-icons/feather';
import { Image } from 'expo-image';
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
import { ImagePickerField } from '@/components/image-picker-field';
import { RecordFieldInput } from '@/components/record-field-input';
import { RecordRow } from '@/components/record-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { RecordCategory } from '@/constants/record-categories';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { entryTitle, useEntryEditor } from '@/hooks/use-entry-editor';
import type { RecordEntry } from '@/hooks/use-records';
import { useTheme } from '@/hooks/use-theme';
import { buildEntryDetails } from '@/utils/record-format';
import { resolveImageUri } from '@/utils/record-image';

export type RecordCategoryScreenProps = {
  category: RecordCategory;
};

/** A category's entries, with the add / details / edit dialog. */
export function RecordCategoryScreen({ category }: RecordCategoryScreenProps) {
  const {
    isLoading,
    sections,
    selectedEntry,
    pendingDeleteEntry,
    dialogMode,
    dialogTitle,
    isFormMode,
    values,
    imageUri,
    isSaving,
    fieldErrors,
    error,
    changeField,
    changeImage: handleImageChange,
    startAdd: handleAddNew,
    openEntry: handleOpen,
    startEdit: handleStartEdit,
    cancelEdit: handleCancelEdit,
    closeDialog: handleCloseDialog,
    requestRemove: handleRequestRemove,
    cancelRemove: handleCancelDelete,
    confirmRemove: handleConfirmDelete,
    submit: handleSubmit,
  } = useEntryEditor(category);
  const theme = useTheme();

  const handleFieldChange = (key: string) => (value: string) => changeField(key, value);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordRow
              id={item.id}
              title={entryTitle(category, item)}
              onOpen={handleOpen}
              onRemove={handleRequestRemove}
            />
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
              <ThemedText type="subtitle">
                {category.emoji} {category.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
                {category.description}
              </ThemedText>
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No entries yet. Tap + to add your first one.
              </ThemedText>
            ) : null
          }
        />

        <Pressable
          onPress={handleAddNew}
          accessibilityRole="button"
          accessibilityLabel={`Add ${category.label} entry`}
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
              <View style={styles.dialogTitle}>
                <ThemedText type="subtitle" numberOfLines={1}>
                  {dialogTitle}
                </ThemedText>
                {isFormMode && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {category.emoji} {category.label}
                  </ThemedText>
                )}
              </View>
              <Pressable
                onPress={handleCloseDialog}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {dialogMode === 'details' && selectedEntry && (
              <EntryDetails category={category} entry={selectedEntry} onEdit={handleStartEdit} />
            )}

            {isFormMode && (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.dialogForm}>
                <ImagePickerField value={imageUri} onChange={handleImageChange} />

                {category.fields.map((field) => (
                  <RecordFieldInput
                    key={field.key}
                    field={field}
                    value={values[field.key] ?? ''}
                    onChange={handleFieldChange(field.key)}
                    error={fieldErrors[field.key]}
                  />
                ))}

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
                      styles.primaryButton,
                      (pressed || isSaving) && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      {isSaving
                        ? 'Saving…'
                        : dialogMode === 'edit'
                          ? 'Save changes'
                          : 'Add entry'}
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={pendingDeleteEntry !== null}
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
              Remove entry?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.confirmMessage}>
              {pendingDeleteEntry
                ? `"${entryTitle(category, pendingDeleteEntry)}" will be permanently removed.`
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

type EntryDetailsProps = {
  category: RecordCategory;
  entry: RecordEntry;
  onEdit: () => void;
};

/** Read-only view of every field of an entry, with a way into edit mode. */
function EntryDetails({ category, entry, onEdit }: EntryDetailsProps) {
  const details = buildEntryDetails(category, entry);

  return (
    <ScrollView contentContainerStyle={styles.dialogForm}>
      {entry.imageRef ? (
        <Image
          source={{ uri: resolveImageUri(entry.imageRef) }}
          style={styles.detailImage}
          contentFit="cover"
          accessibilityLabel={`Photo of ${entryTitle(category, entry)}`}
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
        style={({ pressed }) => [
          styles.primaryButton,
          styles.editButton,
          pressed && styles.pressed,
        ]}>
        <Feather name="edit-2" size={16} color="#ffffff" />
        <ThemedText type="smallBold" style={styles.primaryButtonText}>
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
  primaryButton: {
    flex: 1,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
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
