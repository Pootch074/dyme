import {
  AlertDialog,
  Box,
  Column,
  ElevatedCard,
  FilledIconButton,
  FilledTonalIconButton,
  Icon,
  IconButton,
  RNHostView,
  Row,
  Shape,
  Surface,
  Text,
  TextButton,
  type TextFieldRef,
  VerticalDivider,
} from "@expo/ui/jetpack-compose";
import {
  align,
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  height,
  type ModifierConfig,
  padding,
  paddingAll,
  Shapes,
  size,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";

import { Icons } from "@/components/compose/icons";
import { ItemEntrySheet } from "@/components/compose/item-entry-sheet";
import { PreviousProductsSheet } from "@/components/compose/previous-products-sheet";
import {
  ComposeScreen,
  ScreenHeader,
  SectionLabel,
} from "@/components/compose/screen";
import { ShoppingRecordSheet } from "@/components/compose/shopping-record-sheet";
import { ControlledTextField } from "@/components/compose/text-field";
import {
  useAppMaterialColors,
  useSuccessColors,
} from "@/components/compose/theme";
import { ShoppingItemList } from "@/components/shopping-item-list";
import { usePreviousProducts } from "@/hooks/use-previous-products";
import { useShoppingDetails } from "@/hooks/use-shopping-details";
import { useShoppingRecordForm } from "@/hooks/use-shopping-record-form";
import { formatCentavos } from "@/utils/money";
import {
  budgetWarning,
  cartProgressLabel,
  formatShoppingDateTime,
} from "@/utils/shopping";

/** Floating buttons: 56 is the standard FAB size, well above the 48 touch minimum. */
const FAB_SIZE = 56;
/** Space between the stacked buttons, and between the stack and the screen edges. */
const FAB_GAP = 16;
/** Height of the whole stack of three buttons. */
const FAB_STACK_HEIGHT = FAB_SIZE * 3 + FAB_GAP * 2;

export type ShoppingDetailsScreenProps = {
  recordId: string;
  /** Just created: offer Previously purchased products straight away. */
  isNew?: boolean;
};

export function ShoppingDetailsScreen({
  recordId,
  isNew = false,
}: ShoppingDetailsScreenProps) {
  const details = useShoppingDetails(recordId);
  const previous = usePreviousProducts(recordId, isNew);
  const recordForm = useShoppingRecordForm();
  const colors = useAppMaterialColors();
  const success = useSuccessColors();
  const { record, total, status } = details;

  // Tapping outside the search field doesn't take focus from it in Compose,
  // so each outside area blurs it; losing focus then ends editing.
  const searchFieldRef = useRef<TextFieldRef>(null);
  const searchHadFocus = useRef(false);
  const { isSearchEditing } = details;
  // Handlers only ask; the effect blurs (refs aren't touched while rendering).
  const [blurRequests, setBlurRequests] = useState(0);
  const blurSearch = () => {
    if (isSearchEditing) setBlurRequests((count) => count + 1);
  };
  useEffect(() => {
    if (blurRequests > 0) void searchFieldRef.current?.blur();
  }, [blurRequests]);

  // Closing the keyboard (e.g. Back) counts as leaving the field too.
  useEffect(() => {
    if (!isSearchEditing) return;
    const subscription = Keyboard.addListener("keyboardDidHide", () => {
      void searchFieldRef.current?.blur();
    });
    return () => {
      subscription.remove();
      // Editing ended (maybe by ✕, with the field gone before reporting its
      // blur): the next field starts fresh.
      searchHadFocus.current = false;
    };
  }, [isSearchEditing]);

  if (!record) {
    return (
      <ComposeScreen>
        <Column modifiers={[fillMaxWidth(), paddingAll(16)]}>
          {!details.isLoading ? (
            <ScreenHeader
              title="Shopping record not found"
              subtitle="It may have been deleted. Go back to the Shopping Calculator."
              onBack={() => router.back()}
            />
          ) : null}
        </Column>
      </ComposeScreen>
    );
  }

  const warning = budgetWarning(status);

  return (
    <ComposeScreen>
      <Column modifiers={[fillMaxSize()]}>
        {/* Fixed top: header, totals and any budget warning stay in view while
            the items scroll. A tap on its background counts as "outside" the
            search field (buttons inside still get their own taps). */}
        <Column
          modifiers={[
            fillMaxWidth(),
            clickable(blurSearch, { indication: false }),
            padding(16, 16, 16, 8),
          ]}
          verticalArrangement={{ spacedBy: 12 }}
        >
          <Row modifiers={[fillMaxWidth()]}>
            <Column modifiers={[weight(1)]}>
              <ScreenHeader
                title={record.location}
                subtitle={formatShoppingDateTime(new Date(record.dateTime))}
                onBack={() => router.back()}
              />
            </Column>
            <IconButton onClick={() => recordForm.open(record)}>
              <Icon
                source={Icons.edit}
                contentDescription="Edit shopping details"
              />
            </IconButton>
            <IconButton onClick={details.requestDeleteRecord}>
              <Icon
                source={Icons.delete}
                contentDescription="Delete shopping record"
              />
            </IconButton>
          </Row>

          {/* One compact row: Total items | Total expenses | Budget left, each
              centered in its cell. Cells are top-aligned so labels and values share
              a line; the budget's "of ₱…" caption hangs below its own cell. The
              budget is edited via Edit above. */}
          <ElevatedCard modifiers={[fillMaxWidth()]}>
            <Row
              modifiers={[fillMaxWidth(), padding(12, 14, 12, 14)]}
              horizontalArrangement={{ spacedBy: 12 }}
              verticalAlignment="top"
            >
              <Stat
                label="Total items"
                value={String(details.itemCount)}
                modifiers={[weight(0.8)]}
              />
              <StatDivider />
              <Stat
                label="Total expenses"
                value={formatCentavos(total)}
                valueColor={colors.primary}
                prominent
                modifiers={[weight(1.1)]}
              />
              <StatDivider />
              <Stat
                label={status.kind === "over" ? "Over budget" : "Budget left"}
                value={
                  status.kind === "none"
                    ? "Not set"
                    : formatCentavos(
                        status.kind === "over" ? status.over : status.left,
                      )
                }
                valueColor={
                  status.kind === "none" || status.kind === "under"
                    ? undefined
                    : colors.error
                }
                caption={
                  status.kind === "none"
                    ? undefined
                    : `of ${formatCentavos(status.budget)}`
                }
                prominent
                modifiers={[weight(1.1)]}
              />
            </Row>
          </ElevatedCard>

          {warning ? (
            <Surface
              color={colors.errorContainer}
              contentColor={colors.onErrorContainer}
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(12))]}
            >
              <Row
                modifiers={[fillMaxWidth(), paddingAll(16)]}
                horizontalArrangement={{ spacedBy: 12 }}
                verticalAlignment="center"
              >
                <Icon source={Icons.warning} tint={colors.onErrorContainer} />
                <Text
                  style={{ typography: "titleSmall" }}
                  modifiers={[weight(1)]}
                >
                  {warning}
                </Text>
              </Row>
            </Surface>
          ) : null}

          <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
            <Row
              modifiers={[weight(1)]}
              verticalAlignment="center"
              horizontalArrangement={{ spacedBy: 8 }}
            >
              <SectionLabel>Items</SectionLabel>
              {record.items.length > 1 ? (
                <Text
                  color={colors.onSurfaceVariant}
                  style={{ typography: "labelMedium" }}
                  maxLines={1}
                >
                  · Hold to move
                </Text>
              ) : null}
            </Row>
            {details.cart.total > 0 ? (
              <Text
                color={
                  details.cart.inCart === details.cart.total
                    ? success.accent
                    : colors.onSurfaceVariant
                }
                style={{ typography: "labelLarge" }}
              >
                {cartProgressLabel(details.cart)}
              </Text>
            ) : null}
          </Row>

          {details.isSearchOpen && details.isSearchEditing ? (
            <ControlledTextField
              fieldRef={searchFieldRef}
              value={details.searchQuery}
              onChangeText={details.setSearchQuery}
              onFocusChange={(focused) => {
                // Compose also reports "not focused" before the field first
                // takes focus; only losing focus it had ends editing.
                if (focused) searchHadFocus.current = true;
                else if (searchHadFocus.current) {
                  searchHadFocus.current = false;
                  details.endSearchEditing();
                }
              }}
              label="Search items"
              autoFocus
              exact
              trailing={
                <IconButton onClick={details.closeSearch}>
                  <Icon
                    source={Icons.close}
                    contentDescription="Close search and show all items"
                  />
                </IconButton>
              }
            />
          ) : null}
          {details.isSearchOpen && !details.isSearchEditing ? (
            // Filtering without the field: tap to change the search.
            <Surface
              onClick={details.openSearch}
              color={colors.surfaceContainerHigh}
              shape={Shape.RoundedCorner({
                cornerRadii: {
                  topStart: 12,
                  topEnd: 12,
                  bottomStart: 12,
                  bottomEnd: 12,
                },
              })}
              modifiers={[fillMaxWidth()]}
            >
              <Row
                modifiers={[fillMaxWidth(), padding(16, 4, 4, 4)]}
                verticalAlignment="center"
                horizontalArrangement={{ spacedBy: 12 }}
              >
                <Icon
                  source={Icons.search}
                  size={20}
                  tint={colors.onSurfaceVariant}
                />
                <Text
                  maxLines={1}
                  overflow="ellipsis"
                  style={{ typography: "bodyLarge" }}
                  modifiers={[weight(1)]}
                >
                  {details.searchSummary}
                </Text>
                <IconButton onClick={details.closeSearch}>
                  <Icon
                    source={Icons.close}
                    contentDescription="Close search and show all items"
                  />
                </IconButton>
              </Row>
            </Surface>
          ) : null}
        </Column>

        {/* Only the items scroll. They're React Native views hosted in Compose,
            because dragging an item to reorder needs gestures Compose here
            can't track; press and hold one to move it. The Box takes the space
            below the header: RNHostView always fills its parent and ignores a
            weight. The floating buttons sit over its bottom-right corner; the
            list's bottom padding lets the last item scroll clear of them. */}
        <Box modifiers={[fillMaxWidth(), weight(1)]}>
          <RNHostView>
            {/* Any touch in the list (a scroll, a +, a row) is outside the
                search field. Watching in the capture phase and returning false
                leaves the touch to the list. */}
            <View
              style={styles.fill}
              onStartShouldSetResponderCapture={() => {
                blurSearch();
                return false;
              }}
            >
              <ShoppingItemList
                details={details}
                contentContainerStyle={styles.itemsList}
              />
            </View>
          </RNHostView>

          {/* Stacked top to bottom: Search, Previous items, Add an item (the
              primary action, nearest the thumb). */}
          <Column
            modifiers={[align("bottomEnd"), paddingAll(FAB_GAP)]}
            verticalArrangement={{ spacedBy: FAB_GAP }}
            horizontalAlignment="center"
          >
            {/* Opens the field (or brings it back to change the search);
                highlighted while searching. ✕ or a tap elsewhere closes it. */}
            <FilledTonalIconButton
              onClick={details.openSearch}
              // Always an object: switching `colors` to undefined makes the
              // native view throw "Cannot set prop 'colors'".
              colors={
                details.isSearchOpen
                  ? {
                      containerColor: colors.primaryContainer,
                      contentColor: colors.onPrimaryContainer,
                    }
                  : {
                      containerColor: colors.secondaryContainer,
                      contentColor: colors.onSecondaryContainer,
                    }
              }
              modifiers={[size(FAB_SIZE, FAB_SIZE)]}
            >
              <Icon source={Icons.search} contentDescription="Search items" />
            </FilledTonalIconButton>
            <FilledTonalIconButton
              onClick={() => {
                blurSearch();
                previous.open();
              }}
              modifiers={[size(FAB_SIZE, FAB_SIZE)]}
            >
              <Icon
                source={Icons.schedule}
                contentDescription="Previously purchased items"
              />
            </FilledTonalIconButton>
            <FilledIconButton
              onClick={() => {
                blurSearch();
                details.openAddItem();
              }}
              colors={{
                containerColor: colors.primary,
                contentColor: colors.onPrimary,
              }}
              modifiers={[size(FAB_SIZE, FAB_SIZE)]}
            >
              <Icon source={Icons.add} contentDescription="Add an item" />
            </FilledIconButton>
          </Column>
        </Box>
      </Column>

      {details.itemDialog ? <ItemEntrySheet details={details} /> : null}
      {previous.isOpen ? <PreviousProductsSheet picker={previous} /> : null}

      {details.pendingDeleteItem ? (
        <ConfirmDelete
          title="Delete item?"
          message={`"${details.pendingDeleteItem.name}" will be removed from this shopping record.`}
          onConfirm={details.confirmDeleteItem}
          onCancel={details.cancelDeleteItem}
        />
      ) : null}
      {details.isDeleteRecordOpen ? (
        <ConfirmDelete
          title="Delete shopping record?"
          message={`"${record.location}" and all its items will be permanently removed.`}
          onConfirm={() => {
            // Leave first so this screen doesn't flash "not found".
            router.back();
            details.confirmDeleteRecord();
          }}
          onCancel={details.cancelDeleteRecord}
        />
      ) : null}

      {recordForm.isOpen ? <ShoppingRecordSheet form={recordForm} /> : null}
    </ComposeScreen>
  );
}

type StatProps = {
  label: string;
  value: string;
  valueColor?: string;
  /** Larger value text, for the money figures. */
  prominent?: boolean;
  /** Small secondary line under the value, e.g. "of ₱5,000.00". */
  caption?: string;
  modifiers?: ModifierConfig[];
};

/**
 * Every value gets the same line height whatever its font size, so values stay
 * on one line across the row; the divider spans label + gap + value.
 */
const STAT_VALUE_LINE_HEIGHT = 28;
const STAT_BLOCK_HEIGHT = 16 + 4 + STAT_VALUE_LINE_HEIGHT;

/** One labeled figure in the summary row, centered in its cell. */
function Stat({
  label,
  value,
  valueColor,
  prominent = false,
  caption,
  modifiers,
}: StatProps) {
  const colors = useAppMaterialColors();
  return (
    <Column
      modifiers={modifiers}
      horizontalAlignment="center"
      verticalArrangement={{ spacedBy: 4 }}
    >
      <Text
        color={colors.onSurfaceVariant}
        style={{ typography: "labelMedium", textAlign: "center" }}
        maxLines={1}
        overflow="ellipsis"
      >
        {label}
      </Text>
      <Text
        color={valueColor}
        style={{
          typography: "titleMedium",
          fontSize: prominent ? 20 : 16,
          lineHeight: STAT_VALUE_LINE_HEIGHT,
          fontWeight: "700",
          textAlign: "center",
        }}
        maxLines={1}
        overflow="ellipsis"
      >
        {value}
      </Text>
      {caption ? (
        <Text
          color={colors.onSurfaceVariant}
          style={{ typography: "bodySmall", textAlign: "center" }}
          maxLines={1}
          overflow="ellipsis"
        >
          {caption}
        </Text>
      ) : null}
    </Column>
  );
}

/**
 * Thin rule between summary cells, as tall as a cell's label + value. (A Row
 * in a LazyColumn has no bounded height for fillMaxHeight to stretch to.)
 */
function StatDivider() {
  const colors = useAppMaterialColors();
  return (
    <VerticalDivider
      color={colors.outlineVariant}
      modifiers={[height(STAT_BLOCK_HEIGHT)]}
    />
  );
}

type ConfirmDeleteProps = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDelete({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  const colors = useAppMaterialColors();
  return (
    <AlertDialog onDismissRequest={onCancel}>
      <AlertDialog.Icon>
        <Icon source={Icons.delete} />
      </AlertDialog.Icon>
      <AlertDialog.Title>
        <Text>{title}</Text>
      </AlertDialog.Title>
      <AlertDialog.Text>
        <Text>{message}</Text>
      </AlertDialog.Text>
      <AlertDialog.ConfirmButton>
        <TextButton onClick={onConfirm} colors={{ contentColor: colors.error }}>
          <Text>Delete</Text>
        </TextButton>
      </AlertDialog.ConfirmButton>
      <AlertDialog.DismissButton>
        <TextButton onClick={onCancel}>
          <Text>Cancel</Text>
        </TextButton>
      </AlertDialog.DismissButton>
    </AlertDialog>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  itemsList: {
    paddingHorizontal: 16,
    // Room for the floating button stack below the last item, so scrolling to
    // the end always brings every item clear of the buttons.
    paddingBottom: FAB_STACK_HEIGHT + FAB_GAP * 2,
  },
});
