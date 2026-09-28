import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { router } from 'expo-router';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ConfirmDialog } from '@/components/dialog';
import { FormInput } from '@/components/form-input';
import { ItemEntryDialog } from '@/components/item-entry-dialog';
import { PreviousProductsDialog } from '@/components/previous-products-dialog';
import { RowActionButton } from '@/components/row-action-button';
import { ShoppingItemList } from '@/components/shopping-item-list';
import { ShoppingRecordDialog } from '@/components/shopping-record-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { usePreviousProducts } from '@/hooks/use-previous-products';
import { useShoppingDetails } from '@/hooks/use-shopping-details';
import { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';
import { useTheme } from '@/hooks/use-theme';
import { formatCentavos } from '@/utils/money';
import {
  budgetWarning,
  cartProgressLabel,
  formatShoppingDateTime,
} from '@/utils/shopping';

/** The app's blue accent, as on its primary buttons. */
const ACCENT = '#3c87f7';
/** Floating buttons: 56 is the standard FAB size, well above the 48 touch minimum. */
const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;
/** Space between the stacked buttons, and between the stack and the screen edges. */
const FAB_GAP = Spacing.three;
/** Height of the whole stack of three buttons. */
const FAB_STACK_HEIGHT = FAB_SIZE * 3 + FAB_GAP * 2;

export type ShoppingDetailsScreenProps = {
  recordId: string;
  /** Just created: offer Previously purchased products straight away. */
  isNew?: boolean;
};

export function ShoppingDetailsScreen({ recordId, isNew = false }: ShoppingDetailsScreenProps) {
  const details = useShoppingDetails(recordId);
  const previous = usePreviousProducts(recordId, isNew);
  const recordForm = useShoppingRecordForm();
  const theme = useTheme();
  const { record, total, status } = details;

  if (!record) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.content]}>
          <BackButton />
          {!details.isLoading ? (
            <>
              <ThemedText type="subtitle">Shopping record not found</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                It may have been deleted. Go back to the Shopping Calculator.
              </ThemedText>
            </>
          ) : null}
        </SafeAreaView>
      </ThemedView>
    );
  }

  const warning = budgetWarning(status);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Fixed top: header, totals and any budget warning stay in view while
            the items scroll. A tap on its background counts as "outside" the
            search field: on phones that doesn't take focus away by itself. */}
        <Pressable onPress={Keyboard.dismiss} accessible={false} style={styles.pinnedTop}>
          <BackButton />
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <ThemedText type="subtitle">{record.location}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatShoppingDateTime(new Date(record.dateTime))}
              </ThemedText>
            </View>
            <RowActionButton
              icon="edit-2"
              tooltip="Edit"
              accessibilityLabel="Edit shopping details"
              onPress={() => recordForm.open(record)}
            />
            <RowActionButton
              icon="trash-2"
              tooltip="Delete"
              tone="danger"
              accessibilityLabel="Delete shopping record"
              onPress={details.requestDeleteRecord}
            />
          </View>

          {/* One compact row: Total items | Total expenses | Budget left, each
              centered in its cell. Cells are top-aligned so labels and values share
              a line; the budget's "of ₱…" caption hangs below its own cell. The
              budget is edited via Edit above. */}
          <ThemedView type="backgroundElement" style={styles.summary}>
            <Stat
              label="Total items"
              value={String(details.itemCount)}
              style={styles.statItems}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
            <Stat
              label="Total expenses"
              value={formatCentavos(total)}
              prominent
              style={styles.statMoney}
            />
            <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
            <Stat
              label={status.kind === 'over' ? 'Over budget' : 'Budget left'}
              value={
                status.kind === 'none'
                  ? 'Not set'
                  : formatCentavos(status.kind === 'over' ? status.over : status.left)
              }
              valueColor={status.kind === 'none' || status.kind === 'under' ? 'text' : 'danger'}
              caption={status.kind === 'none' ? undefined : `of ${formatCentavos(status.budget)}`}
              prominent
              style={styles.statMoney}
            />
          </ThemedView>

          {warning ? (
            <View
              style={[styles.warning, { borderColor: theme.danger }]}
              accessibilityRole="alert">
              <Feather name="alert-triangle" size={18} color={theme.danger} />
              <ThemedText type="smallBold" themeColor="danger" style={styles.warningText}>
                {warning}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.itemsHeader}>
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              numberOfLines={1}
              style={styles.itemsTitle}>
              Items
              {record.items.length > 1 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {'  ·  Hold to move'}
                </ThemedText>
              ) : null}
            </ThemedText>
            {details.cart.total > 0 ? (
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                themeColor={details.cart.inCart === details.cart.total ? 'success' : 'textSecondary'}>
                {cartProgressLabel(details.cart)}
              </ThemedText>
            ) : null}
          </View>

          {details.isSearchOpen ? (
            <View style={styles.searchRow}>
              <View style={styles.flex}>
                {details.isSearchEditing ? (
                  <FormInput
                    value={details.searchQuery}
                    onChangeText={details.setSearchQuery}
                    placeholder="Search items"
                    autoFocus
                    autoCorrect={false}
                    returnKeyType="search"
                    onBlur={details.endSearchEditing}
                  />
                ) : (
                  // Filtering without the field: tap to change the search.
                  <Pressable
                    onPress={details.openSearch}
                    accessibilityRole="button"
                    accessibilityLabel={`Search results ${details.searchSummary}, tap to change`}
                    style={({ pressed }) => [
                      styles.searchSummary,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <Feather name="search" size={16} color={theme.textSecondary} />
                    <ThemedText type="small" numberOfLines={1} style={styles.flex}>
                      {details.searchSummary}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <RowActionButton
                icon="x"
                tooltip="Close search"
                accessibilityLabel="Close search and show all items"
                onPress={details.closeSearch}
              />
            </View>
          ) : null}
        </Pressable>

        {/* Only the items scroll; press and hold one to drag it to a new position.
            Extra bottom padding lets the last item scroll clear of the buttons. */}
        <ShoppingItemList details={details} contentContainerStyle={styles.itemsList} />

        {/* Floating actions stacked in the bottom-right corner, top to bottom:
            Search, Previous items, Add an item (the primary action, nearest the thumb). */}
        <View style={styles.fabs}>
          {/* Opens the field (or brings it back to change the search); ✕ or a
              tap elsewhere closes it. */}
          <Fab
            icon="search"
            label="Search items"
            variant="secondary"
            onPress={details.openSearch}
            active={details.isSearchOpen}
          />
          <Fab
            icon="rotate-ccw"
            label="Previously purchased items"
            variant="secondary"
            onPress={previous.open}
          />
          <Fab icon="plus" label="Add an item" onPress={details.openAddItem} />
        </View>
      </SafeAreaView>

      <ItemEntryDialog details={details} subtitle={record.location} />

      <PreviousProductsDialog picker={previous} subtitle={record.location} />

      <ConfirmDialog
        visible={details.pendingDeleteItem !== null}
        title="Delete item?"
        message={
          details.pendingDeleteItem
            ? `"${details.pendingDeleteItem.name}" will be removed from this shopping record.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={details.confirmDeleteItem}
        onCancel={details.cancelDeleteItem}
      />

      <ConfirmDialog
        visible={details.isDeleteRecordOpen}
        title="Delete shopping record?"
        message={`"${record.location}" and all its items will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          // Leave first so this screen doesn't flash "not found".
          router.back();
          details.confirmDeleteRecord();
        }}
        onCancel={details.cancelDeleteRecord}
      />

      <ShoppingRecordDialog form={recordForm} />
    </ThemedView>
  );
}

type FabProps = {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
  /** Primary is the app's blue; secondary is a neutral fill, so the main action stands out. */
  variant?: 'primary' | 'secondary';
  /** Highlighted, e.g. Search while the search field is showing. */
  active?: boolean;
};

/** Round, icon-only floating button; the label is read out by screen readers. */
function Fab({ icon, label, onPress, variant = 'primary', active = false }: FabProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.fab,
        isPrimary
          ? styles.fabPrimary
          : {
              backgroundColor: theme.backgroundElement,
              borderColor: active ? ACCENT : theme.backgroundSelected,
            },
        pressed && styles.fabPressed,
      ]}>
      <Feather
        name={icon}
        size={FAB_ICON_SIZE}
        color={isPrimary ? '#ffffff' : active ? ACCENT : theme.text}
      />
    </Pressable>
  );
}

type StatProps = {
  label: string;
  value: string;
  valueColor?: ThemeColor;
  /** Larger value text, for the money figures. */
  prominent?: boolean;
  /** Small secondary line under the value, e.g. "of ₱5,000.00". */
  caption?: string;
  style?: object;
};

/** One labeled figure in the summary row, centered in its cell. */
function Stat({ label, value, valueColor = 'text', prominent = false, caption, style }: StatProps) {
  return (
    <View style={[styles.stat, style]}>
      <ThemedText themeColor="textSecondary" style={styles.statLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText
        themeColor={valueColor}
        style={[styles.statValue, prominent && styles.statValueProminent]}
        numberOfLines={1}>
        {value}
      </ThemedText>
      {caption ? (
        <ThemedText themeColor="textSecondary" style={styles.statLabel} numberOfLines={1}>
          {caption}
        </ThemedText>
      ) : null}
    </View>
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
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  pinnedTop: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  itemsList: {
    paddingHorizontal: Spacing.four,
    // Room for the floating button stack below the last item, so scrolling to
    // the end always brings every item clear of the buttons.
    paddingBottom: FAB_STACK_HEIGHT + FAB_GAP * 2,
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    // Same height as the field it stands in for, so nothing jumps.
    minHeight: 42,
  },
  pressed: {
    opacity: 0.7,
  },
  fabs: {
    position: 'absolute',
    right: Spacing.four,
    bottom: FAB_GAP,
    alignItems: 'center',
    // Far enough apart that a thumb can't catch two at once.
    gap: FAB_GAP,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 4,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 4, color: 'rgba(0, 0, 0, 0.25)' }],
  },
  fabPrimary: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  fabPressed: {
    opacity: 0.85,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  titleText: {
    flex: 1,
    gap: Spacing.half,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    gap: Spacing.two + Spacing.one,
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 0,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    // Spans a cell's label + gap + value (16 + 4 + 26).
    height: 46,
  },
  statItems: {
    flex: 0.8,
  },
  statMoney: {
    flex: 1.1,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    // Same for every value, whatever its size, so values share one line.
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  statValueProminent: {
    fontSize: 20,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  warningText: {
    flex: 1,
  },
  itemsTitle: {
    flexShrink: 1,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
