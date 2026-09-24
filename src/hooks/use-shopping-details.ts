import { useState } from 'react';

import { useShopping } from '@/hooks/use-shopping';
import { applyKey, type KeypadKey } from '@/utils/keypad';
import { centavosToInput, moneyErrorMessage, parseMoneyInput } from '@/utils/money';
import {
  budgetStatus,
  itemTotal,
  recordItemCount,
  recordTotal,
  type ShoppingItem,
} from '@/utils/shopping';

type ItemFieldErrors = Partial<Record<'name' | 'price' | 'quantity', string>>;

/** Field the Add Item dialog is editing: price and quantity use the number pad, the name uses the keyboard. */
export type ItemField = 'price' | 'quantity' | 'name';

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
 * totals and budget status, plus the item dialogs. Totals are recomputed from
 * the items on every render, so adding, editing or deleting an item updates
 * Total Expenses, Budget Left and the warning together. The budget itself is
 * edited with the rest of the record (see useShoppingRecordForm).
 */
export function useShoppingDetails(recordId: string) {
  const { records, isLoading, addItem, updateItem, removeItem, removeRecord } = useShopping();
  const record = records.find((candidate) => candidate.id === recordId) ?? null;

  const total = record ? recordTotal(record) : 0;
  const itemCount = record ? recordItemCount(record) : 0;
  const status = budgetStatus(record?.budgetCentavos ?? null, total);

  // Item dialog
  const [itemDialog, setItemDialog] = useState<{ mode: 'add' } | { mode: 'edit'; itemId: string } | null>(
    null
  );
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [itemErrors, setItemErrors] = useState<ItemFieldErrors>({});
  const [activeField, setActiveField] = useState<ItemField>('price');

  // Other dialogs
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);
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
    // Price first: people often read the price tag before naming the item.
    setActiveField('price');
    setItemDialog({ mode: 'add' });
  };

  const openEditItem = (item: ShoppingItem) => {
    setName(item.name);
    setPrice(centavosToInput(item.priceCentavos));
    setQuantity(String(item.quantity));
    setItemErrors({});
    setActiveField('price');
    setItemDialog({ mode: 'edit', itemId: item.id });
  };

  const closeItemDialog = () => setItemDialog(null);

  /**
   * Number pad key: types into the quantity when it's active, otherwise into
   * the price (a key pressed while the name is focused goes back to the price).
   */
  const pressKey = (key: KeypadKey) => {
    if (activeField === 'quantity') {
      setQuantity((prev) => applyKey('quantity', prev, key));
      clearItemError('quantity');
      return;
    }
    if (activeField === 'name') setActiveField('price');
    setPrice((prev) => applyKey('price', prev, key));
    clearItemError('price');
  };

  /** The dialog's −/+ buttons; never below 1. */
  const stepQuantity = (delta: number) => {
    setQuantity((prev) => {
      const current = /^\d+$/.test(prev) ? Number(prev) : 0;
      return String(Math.max(1, current + delta));
    });
    clearItemError('quantity');
  };

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

  /** Adjusts just the quantity of an item, e.g. from the row's +/- stepper. */
  const setItemQuantity = (itemId: string, quantity: number) => {
    if (!record) return;
    const item = record.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    updateItem(record.id, itemId, {
      name: item.name,
      priceCentavos: item.priceCentavos,
      quantity,
    });
  };

  const pendingDeleteItem = record?.items.find((item) => item.id === pendingDeleteItemId) ?? null;

  const confirmDeleteItem = () => {
    if (record && pendingDeleteItemId) removeItem(record.id, pendingDeleteItemId);
    setPendingDeleteItemId(null);
  };

  const confirmDeleteRecord = () => {
    if (record) removeRecord(record.id);
    setIsDeleteRecordOpen(false);
  };

  return {
    record,
    isLoading,
    total,
    itemCount,
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
    activeField,
    setActiveField,
    pressKey,
    stepQuantity,
    openAddItem,
    openEditItem,
    closeItemDialog,
    saveItem,
    setItemQuantity,

    pendingDeleteItem,
    requestDeleteItem: (itemId: string) => setPendingDeleteItemId(itemId),
    cancelDeleteItem: () => setPendingDeleteItemId(null),
    confirmDeleteItem,


    isDeleteRecordOpen,
    requestDeleteRecord: () => setIsDeleteRecordOpen(true),
    cancelDeleteRecord: () => setIsDeleteRecordOpen(false),
    confirmDeleteRecord,
  };
}
