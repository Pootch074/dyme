import {
  AlertDialog,
  Box,
  Button,
  Column,
  ElevatedCard,
  Icon,
  IconButton,
  RNHostView,
  Row,
  Spacer,
  Surface,
  Text,
  TextButton,
  VerticalDivider,
} from "@expo/ui/jetpack-compose";
import {
  clip,
  fillMaxSize,
  fillMaxWidth,
  height,
  type ModifierConfig,
  padding,
  paddingAll,
  Shapes,
  weight,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Icons } from "@/components/compose/icons";
import { ItemEntrySheet } from "@/components/compose/item-entry-sheet";
import {
  ComposeScreen,
  ScreenHeader,
  SectionLabel,
} from "@/components/compose/screen";
import { ShoppingRecordSheet } from "@/components/compose/shopping-record-sheet";
import {
  useAppMaterialColors,
  useSuccessColors,
} from "@/components/compose/theme";
import { ShoppingItemList } from "@/components/shopping-item-list";
import { useShoppingDetails } from "@/hooks/use-shopping-details";
import { useShoppingRecordForm } from "@/hooks/use-shopping-record-form";
import { formatCentavos } from "@/utils/money";
import {
  budgetWarning,
  cartProgressLabel,
  formatShoppingDateTime,
} from "@/utils/shopping";

export type ShoppingDetailsScreenProps = {
  recordId: string;
};

export function ShoppingDetailsScreen({
  recordId,
}: ShoppingDetailsScreenProps) {
  const details = useShoppingDetails(recordId);
  const recordForm = useShoppingRecordForm();
  const colors = useAppMaterialColors();
  const success = useSuccessColors();
  const { record, total, status } = details;

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
        {/* Fixed top: header, totals and any budget warning stay in view while the items scroll. */}
        <Column
          modifiers={[fillMaxWidth(), padding(16, 16, 16, 8)]}
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
        </Column>

        {/* Only the items scroll. They're React Native views hosted in Compose,
            because dragging an item to reorder needs gestures Compose here
            can't track; press and hold one to move it. The Box takes the space
            between the header and the Add button: RNHostView always fills its
            parent and ignores a weight, so on its own it hid the button. */}
        <Box modifiers={[fillMaxWidth(), weight(1)]}>
          <RNHostView>
            <View style={styles.fill}>
              <ShoppingItemList
                details={details}
                contentContainerStyle={styles.itemsList}
              />
            </View>
          </RNHostView>
        </Box>

        {/* Fixed bottom: always reachable, whatever the scroll position. */}
        <Surface color={colors.surfaceContainer} modifiers={[fillMaxWidth()]}>
          <Button onClick={details.openAddItem} modifiers={[fillMaxWidth(), padding(16, 12, 16, 12)]}>
            <Icon source={Icons.add} size={18} />
            <Spacer modifiers={[width(8)]} />
            <Text>Add an item</Text>
          </Button>
        </Surface>
      </Column>

      {details.itemDialog ? <ItemEntrySheet details={details} /> : null}

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
    paddingBottom: 16,
  },
});
