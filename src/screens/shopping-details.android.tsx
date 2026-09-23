import {
  AlertDialog,
  Button,
  Card,
  Column,
  ElevatedCard,
  HorizontalDivider,
  Icon,
  IconButton,
  LazyColumn,
  ListItem,
  ModalBottomSheet,
  OutlinedButton,
  Row,
  Spacer,
  Surface,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  clip,
  fillMaxWidth,
  imePadding,
  padding,
  paddingAll,
  Shapes,
  verticalScroll,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader, SectionLabel } from '@/components/compose/screen';
import { ShoppingRecordSheet } from '@/components/compose/shopping-record-sheet';
import { ControlledTextField } from '@/components/compose/text-field';
import { useAppMaterialColors } from '@/components/compose/theme';
import { useShoppingDetails } from '@/hooks/use-shopping-details';
import { useShoppingRecordForm } from '@/hooks/use-shopping-record-form';
import { formatCentavos } from '@/utils/money';
import {
  budgetWarning,
  formatShoppingDateTime,
  itemTotal,
  type ShoppingItem,
} from '@/utils/shopping';

export type ShoppingDetailsScreenProps = {
  recordId: string;
};

const TRANSPARENT = '#00000000';

export function ShoppingDetailsScreen({ recordId }: ShoppingDetailsScreenProps) {
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
      <LazyColumn
        modifiers={[fillMaxWidth()]}
        contentPadding={{ start: 16, end: 16, top: 16, bottom: 32 }}
        verticalArrangement={{ spacedBy: 12 }}>
        <Row modifiers={[fillMaxWidth()]}>
          <Column modifiers={[weight(1)]}>
            <ScreenHeader
              title={record.location}
              subtitle={formatShoppingDateTime(new Date(record.dateTime))}
              onBack={() => router.back()}
            />
          </Column>
          <IconButton onClick={() => recordForm.open(record)}>
            <Icon source={Icons.edit} contentDescription="Edit shopping details" />
          </IconButton>
          <IconButton onClick={details.requestDeleteRecord}>
            <Icon source={Icons.delete} contentDescription="Delete shopping record" />
          </IconButton>
        </Row>

        {/* Total expenses, with the budget right beneath it in the same card. */}
        <ElevatedCard modifiers={[fillMaxWidth()]}>
          <Column modifiers={[fillMaxWidth(), paddingAll(16)]} verticalArrangement={{ spacedBy: 12 }}>
            <Column verticalArrangement={{ spacedBy: 4 }}>
              <Text color={colors.onSurfaceVariant} style={{ typography: 'labelLarge' }}>
                Total expenses
              </Text>
              <Text color={colors.primary} style={{ typography: 'displaySmall', fontWeight: '700' }}>
                {formatCentavos(total)}
              </Text>
            </Column>
            <HorizontalDivider color={colors.outlineVariant} />
            <SummaryRow
              label="Budget"
              value={status.kind === 'none' ? 'Not set' : formatCentavos(status.budget)}
            />
            {status.kind !== 'none' ? (
              <SummaryRow
                label={status.kind === 'over' ? 'Over budget' : 'Budget left'}
                value={formatCentavos(status.kind === 'over' ? status.over : status.left)}
                valueColor={status.kind === 'under' ? undefined : colors.error}
              />
            ) : null}
            <OutlinedButton onClick={details.openBudget} modifiers={[fillMaxWidth()]}>
              <Icon source={Icons.wallet} size={18} />
              <Spacer modifiers={[width(8)]} />
              <Text>{status.kind === 'none' ? 'Set budget' : 'Edit budget'}</Text>
            </OutlinedButton>
          </Column>
        </ElevatedCard>

        {warning ? (
          <Surface
            color={colors.errorContainer}
            contentColor={colors.onErrorContainer}
            modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(12))]}>
            <Row
              modifiers={[fillMaxWidth(), paddingAll(16)]}
              horizontalArrangement={{ spacedBy: 12 }}
              verticalAlignment="center">
              <Icon source={Icons.warning} tint={colors.onErrorContainer} />
              <Text style={{ typography: 'titleSmall' }} modifiers={[weight(1)]}>
                {warning}
              </Text>
            </Row>
          </Surface>
        ) : null}

        <Button onClick={details.openAddItem} modifiers={[fillMaxWidth()]}>
          <Icon source={Icons.add} size={18} />
          <Spacer modifiers={[width(8)]} />
          <Text>Add an item</Text>
        </Button>

        <SectionLabel>{`Items (${record.items.length})`}</SectionLabel>
        {record.items.length === 0 ? (
          <Text
            color={colors.onSurfaceVariant}
            style={{ typography: 'bodyMedium', textAlign: 'center' }}
            modifiers={[fillMaxWidth(), padding(0, 16, 0, 16)]}>
            No items yet. Add what you bought and the total is calculated for you.
          </Text>
        ) : null}
        {record.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onEdit={() => details.openEditItem(item)}
            onDelete={() => details.requestDeleteItem(item.id)}
          />
        ))}
      </LazyColumn>

      {details.itemDialog ? <ItemSheet details={details} /> : null}
      {details.isBudgetOpen ? <BudgetSheet details={details} /> : null}

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

type SummaryRowProps = {
  label: string;
  value: string;
  valueColor?: string;
};

function SummaryRow({ label, value, valueColor }: SummaryRowProps) {
  const colors = useAppMaterialColors();
  return (
    <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
      <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyLarge' }} modifiers={[weight(1)]}>
        {label}
      </Text>
      <Text color={valueColor} style={{ typography: 'titleMedium' }}>
        {value}
      </Text>
    </Row>
  );
}

type ItemRowProps = {
  item: ShoppingItem;
  onEdit: () => void;
  onDelete: () => void;
};

/** Product name, unit price × quantity, item total, and edit / delete actions. */
function ItemRow({ item, onEdit, onDelete }: ItemRowProps) {
  return (
    <Card modifiers={[fillMaxWidth()]}>
      <ListItem colors={{ containerColor: TRANSPARENT }}>
        <ListItem.HeadlineContent>
          <Text maxLines={2} overflow="ellipsis" style={{ typography: 'titleMedium' }}>
            {item.name}
          </Text>
        </ListItem.HeadlineContent>
        <ListItem.SupportingContent>
          <Text>{`${formatCentavos(item.priceCentavos)} × ${item.quantity}`}</Text>
        </ListItem.SupportingContent>
        <ListItem.TrailingContent>
          <Row verticalAlignment="center">
            <Text style={{ typography: 'titleMedium', fontWeight: '700' }}>
              {formatCentavos(itemTotal(item))}
            </Text>
            <IconButton onClick={onEdit}>
              <Icon source={Icons.edit} contentDescription={`Edit ${item.name}`} />
            </IconButton>
            <IconButton onClick={onDelete}>
              <Icon source={Icons.delete} contentDescription={`Delete ${item.name}`} />
            </IconButton>
          </Row>
        </ListItem.TrailingContent>
      </ListItem>
    </Card>
  );
}

type DetailsProps = {
  details: ReturnType<typeof useShoppingDetails>;
};

/** Add / Edit Item: name, price, quantity, and the live Item Total. */
function ItemSheet({ details }: DetailsProps) {
  const colors = useAppMaterialColors();

  return (
    <ModalBottomSheet onDismissRequest={details.closeItemDialog} skipPartiallyExpanded>
      <Column
        modifiers={[fillMaxWidth(), verticalScroll(), imePadding(), padding(24, 0, 24, 24)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <Text style={{ typography: 'headlineSmall' }}>{details.itemDialogTitle}</Text>
        <ControlledTextField
          value={details.name}
          onChangeText={details.setName}
          label="Product name *"
          isError={Boolean(details.itemErrors.name)}
          supportingText={details.itemErrors.name}
        />
        <ControlledTextField
          value={details.price}
          onChangeText={details.setPrice}
          label="Price *"
          prefix="₱"
          keyboardType="decimal"
          isError={Boolean(details.itemErrors.price)}
          supportingText={details.itemErrors.price}
        />
        <ControlledTextField
          value={details.quantity}
          onChangeText={details.setQuantity}
          label="Quantity *"
          keyboardType="number"
          isError={Boolean(details.itemErrors.quantity)}
          supportingText={details.itemErrors.quantity}
        />
        <Surface
          color={colors.secondaryContainer}
          contentColor={colors.onSecondaryContainer}
          modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(12))]}>
          <Row modifiers={[fillMaxWidth(), paddingAll(16)]} verticalAlignment="center">
            <Text style={{ typography: 'bodyLarge' }} modifiers={[weight(1)]}>
              Item total
            </Text>
            <Text style={{ typography: 'titleLarge', fontWeight: '700' }}>
              {details.liveItemTotal === null ? '—' : formatCentavos(details.liveItemTotal)}
            </Text>
          </Row>
        </Surface>
        <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
          <OutlinedButton onClick={details.closeItemDialog} modifiers={[weight(1)]}>
            <Text>Cancel</Text>
          </OutlinedButton>
          <Button onClick={details.saveItem} modifiers={[weight(1)]}>
            <Text>Save</Text>
          </Button>
        </Row>
      </Column>
    </ModalBottomSheet>
  );
}

function BudgetSheet({ details }: DetailsProps) {
  const colors = useAppMaterialColors();

  return (
    <ModalBottomSheet onDismissRequest={details.closeBudget} skipPartiallyExpanded>
      <Column
        modifiers={[fillMaxWidth(), imePadding(), padding(24, 0, 24, 24)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <Text style={{ typography: 'headlineSmall' }}>Budget</Text>
        <ControlledTextField
          value={details.budgetInput}
          onChangeText={details.setBudgetInput}
          label="Budget"
          prefix="₱"
          keyboardType="decimal"
          isError={Boolean(details.budgetError)}
          supportingText={details.budgetError}
        />
        <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
          Leave empty to remove the budget.
        </Text>
        <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
          <OutlinedButton onClick={details.closeBudget} modifiers={[weight(1)]}>
            <Text>Cancel</Text>
          </OutlinedButton>
          <Button onClick={details.saveBudget} modifiers={[weight(1)]}>
            <Text>Save</Text>
          </Button>
        </Row>
      </Column>
    </ModalBottomSheet>
  );
}

type ConfirmDeleteProps = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDelete({ title, message, onConfirm, onCancel }: ConfirmDeleteProps) {
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
