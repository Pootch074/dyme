import { useState } from 'react';

import { useShopping } from '@/hooks/use-shopping';
import { centavosToInput, moneyErrorMessage, parseMoneyInput } from '@/utils/money';
import { budgetStatus, itemTotal, recordTotal, type ShoppingItem } from '@/utils/shopping';

type ItemFieldErrors = Partial<Record<'name' | 'price' | 'quantity', string>>;

/** Validates a quantity: required, a whole number, at least 1. */
function parseQuantity(input: string): { ok: true; quantity: number } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Quantity is required.' };
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: 'Quantity must be a whole number.' };
  const quantity = Number(trimmed);
  if (quantity < 1) return { ok: false, error: 'Quantity must be at least 1.' };
  return { ok: true, quantity };
}

/**
 * Everything the Shopping Details screens need for one record: its derived
 * totals and budget status, plus the item and budget dialogs. Totals are
 * recomputed from the items on every render, so adding, editing or deleting
 * an item updates Total Expenses, Budget Left and the warning together.
 */
export function useShoppingDetails(recordId: string) {
  const { records, isLoading, addItem, updateItem, removeItem, setBudget, removeRecord } =
    useShopping();
  const record = records.find((candidate) => candidate.id === recordId) ?? null;

  const total = record ? recordTotal(record) : 0;
  const status = budgetStatus(record?.budgetCentavos ?? null, total);

  // Item dialog
  const [itemDialog, setItemDialog] = useState<{ mode: 'add' } | { mode: 'edit'; itemId: string } | null>(
    null
  );
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [itemErrors, setItemErrors] = useState<ItemFieldErrors>({});

  // Other dialogs
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInputState] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [isDeleteRecordOpen, setIsDeleteRecordOpen] = useState(false);

  const parsedPrice = parseMoneyInput(price);
  const parsedQuantity = parseQuantity(quantity);
  /** Item Total shown live in the dialog; null until price and quantity are valid. */
  const liveItemTotal =
    parsedPrice.ok && parsedQuantity.ok
      ? itemTotal({ priceCentavos: parsedPrice.centavos, quantity: parsedQuantity.quantity })
      : null;

  const clearItemError = (field: keyof ItemFieldErrors) => {
    if (itemErrors[field]) setItemErrors(({ [field]: _cleared, ...rest }) => rest);
  };

  const openAddItem = () => {
    setName('');
    setPrice('');
    setQuantity('1');
    setItemErrors({});
    setItemDialog({ mode: 'add' });
  };

  const openEditItem = (item: ShoppingItem) => {
    setName(item.name);
    setPrice(centavosToInput(item.priceCentavos));
    setQuantity(String(item.quantity));
    setItemErrors({});
    setItemDialog({ mode: 'edit', itemId: item.id });
  };

  const closeItemDialog = () => setItemDialog(null);

  const saveItem = () => {
    if (!record || !itemDialog) return;

    const errors: ItemFieldErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) errors.name = 'Product name is required.';
    if (!parsedPrice.ok) errors.price = moneyErrorMessage('Price', parsedPrice.error);
    if (!parsedQuantity.ok) errors.quantity = parsedQuantity.error;
    if (!parsedPrice.ok || !parsedQuantity.ok || errors.name) {
      setItemErrors(errors);
      return;
    }

    const input = {
      name: trimmedName,
      priceCentavos: parsedPrice.centavos,
      quantity: parsedQuantity.quantity,
    };
    if (itemDialog.mode === 'add') addItem(record.id, input);
    else updateItem(record.id, itemDialog.itemId, input);
    setItemDialog(null);
  };

  const pendingDeleteItem = record?.items.find((item) => item.id === pendingDeleteItemId) ?? null;

  const confirmDeleteItem = () => {
    if (record && pendingDeleteItemId) removeItem(record.id, pendingDeleteItemId);
    setPendingDeleteItemId(null);
  };

  const openBudget = () => {
    setBudgetInputState(
      record?.budgetCentavos != null ? centavosToInput(record.budgetCentavos) : ''
    );
    setBudgetError(null);
    setIsBudgetOpen(true);
  };

  const setBudgetInput = (text: string) => {
    setBudgetInputState(text);
    if (budgetError) setBudgetError(null);
  };

  /** Saves the budget; an empty field removes it. Zero isn't a usable budget, so it's rejected. */
  const saveBudget = () => {
    if (!record) return;
    if (!budgetInput.trim()) {
      setBudget(record.id, null);
      setIsBudgetOpen(false);
      return;
    }

    const parsed = parseMoneyInput(budgetInput);
    if (!parsed.ok) {
      setBudgetError(moneyErrorMessage('Budget', parsed.error));
      return;
    }
    if (parsed.centavos === 0) {
      setBudgetError('Budget must be more than ₱0.00. Leave it empty to remove the budget.');
      return;
    }
    setBudget(record.id, parsed.centavos);
    setIsBudgetOpen(false);
  };

  const confirmDeleteRecord = () => {
    if (record) removeRecord(record.id);
    setIsDeleteRecordOpen(false);
  };

  return {
    record,
    isLoading,
    total,
    status,

    itemDialog,
    itemDialogTitle: itemDialog?.mode === 'edit' ? 'Edit item' : 'Add an item',
    name,
    price,
    quantity,
    itemErrors,
    liveItemTotal,
    setName: (text: string) => {
      setName(text);
      clearItemError('name');
    },
    setPrice: (text: string) => {
      setPrice(text);
      clearItemError('price');
    },
    setQuantity: (text: string) => {
      setQuantity(text);
      clearItemError('quantity');
    },
    openAddItem,
    openEditItem,
    closeItemDialog,
    saveItem,

    pendingDeleteItem,
    requestDeleteItem: (itemId: string) => setPendingDeleteItemId(itemId),
    cancelDeleteItem: () => setPendingDeleteItemId(null),
    confirmDeleteItem,

    isBudgetOpen,
    budgetInput,
    budgetError,
    openBudget,
    closeBudget: () => setIsBudgetOpen(false),
    setBudgetInput,
    saveBudget,

    isDeleteRecordOpen,
    requestDeleteRecord: () => setIsDeleteRecordOpen(true),
    cancelDeleteRecord: () => setIsDeleteRecordOpen(false),
    confirmDeleteRecord,
  };
}
