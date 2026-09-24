import {
  AlertDialog,
  Button,
  Card,
  Column,
  DropdownMenu,
  DropdownMenuItem,
  ElevatedCard,
  Icon,
  IconButton,
  LazyColumn,
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
import { useState } from "react";

import { Icons } from "@/components/compose/icons";
import { ItemEntrySheet } from "@/components/compose/item-entry-sheet";
import { QuantityStepper } from "@/components/compose/quantity-stepper";
import {
  ComposeScreen,
  ScreenHeader,
  SectionLabel,
} from "@/components/compose/screen";
import { ShoppingRecordSheet } from "@/components/compose/shopping-record-sheet";
import { useAppMaterialColors } from "@/components/compose/theme";
import { useShoppingDetails } from "@/hooks/use-shopping-details";
import { useShoppingRecordForm } from "@/hooks/use-shopping-record-form";
import { formatCentavos } from "@/utils/money";
import {
  budgetWarning,
  formatShoppingDateTime,
  itemTotal,
  type ShoppingItem,
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

          <SectionLabel>Items</SectionLabel>
        </Column>

        {/* Only the items scroll. */}
        <LazyColumn
          modifiers={[fillMaxWidth(), weight(1)]}
          contentPadding={{ start: 16, end: 16, top: 0, bottom: 16 }}
          verticalArrangement={{ spacedBy: 12 }}
        >
          {record.items.length === 0 ? (
            <Text
              color={colors.onSurfaceVariant}
              style={{ typography: "bodyMedium", textAlign: "center" }}
              modifiers={[fillMaxWidth(), padding(0, 16, 0, 16)]}
            >
              No items yet. Add what you bought and the total is calculated for
              you.
            </Text>
          ) : null}
          {record.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onEdit={() => details.openEditItem(item)}
              onDelete={() => details.requestDeleteItem(item.id)}
              onQuantityChange={(quantity) =>
                details.setItemQuantity(item.id, quantity)
              }
            />
          ))}
        </LazyColumn>

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

type ItemRowProps = {
  item: ShoppingItem;
  onEdit: () => void;
  onDelete: () => void;
  onQuantityChange: (quantity: number) => void;
};

/** Product name and unit price; item total over a −/+ quantity stepper; and a "⋮" menu for edit / delete. */
function ItemRow({ item, onEdit, onDelete, onQuantityChange }: ItemRowProps) {
  const colors = useAppMaterialColors();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const runAndClose = (action: () => void) => () => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <Card modifiers={[fillMaxWidth()]}>
      <Row
        modifiers={[fillMaxWidth(), padding(16, 8, 0, 8)]}
        verticalAlignment="center"
      >
        <Column modifiers={[weight(1)]} verticalArrangement={{ spacedBy: 2 }}>
          <Text
            maxLines={2}
            overflow="ellipsis"
            style={{ typography: "titleMedium" }}
          >
            {item.name}
          </Text>
          <Text
            color={colors.onSurfaceVariant}
            style={{ typography: "bodyMedium" }}
          >
            {`${formatCentavos(item.priceCentavos)} each`}
          </Text>
        </Column>

        <Column horizontalAlignment="end">
          <Text
            style={{ typography: "titleMedium", fontWeight: "700" }}
            modifiers={[padding(0, 0, 8, 0)]}
          >
            {formatCentavos(itemTotal(item))}
          </Text>
          <QuantityStepper
            value={item.quantity}
            onChange={onQuantityChange}
            itemName={item.name}
          />
        </Column>

        <DropdownMenu
          expanded={isMenuOpen}
          onDismissRequest={() => setIsMenuOpen(false)}
        >
          <DropdownMenu.Trigger>
            <IconButton onClick={() => setIsMenuOpen(true)}>
              <Icon
                source={Icons.moreVert}
                contentDescription={`More actions for ${item.name}`}
              />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            <DropdownMenuItem onClick={runAndClose(onEdit)}>
              <DropdownMenuItem.LeadingIcon>
                <Icon source={Icons.edit} />
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text>Edit</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={runAndClose(onDelete)}
              elementColors={{
                textColor: colors.error,
                leadingIconColor: colors.error,
              }}
            >
              <DropdownMenuItem.LeadingIcon>
                <Icon source={Icons.delete} tint={colors.error} />
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text color={colors.error}>Delete</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          </DropdownMenu.Items>
        </DropdownMenu>
      </Row>
    </Card>
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
