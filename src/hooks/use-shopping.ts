import { createPersistentStore, generateId, readStoredArray } from '@/utils/persistent-store';
import type { ShoppingItem, ShoppingRecord } from '@/utils/shopping';

/** Every saved shopping record, brought up to date (also used by Data Export). */
export async function loadShoppingRecords(): Promise<ShoppingRecord[]> {
  return ((await readStoredArray<ShoppingRecord>('shopping-records')) ?? []).map((record) => ({
    ...record,
    // Items saved before cart tracking existed start out of the cart.
    items: record.items.map((item) => ({ ...item, inCart: item.inCart ?? false })),
  }));
}

const store = createPersistentStore<ShoppingRecord>({
  storageKey: 'shopping-records',
  load: loadShoppingRecords,
  label: 'shopping records',
});

export type ShoppingRecordInput = {
  location: string;
  dateTime: string;
  /** Budget in centavos, or null for no budget. */
  budgetCentavos: number | null;
};
/** An item's details. Cart status isn't one of them: only setItemInCart changes it. */
export type ShoppingItemInput = Omit<ShoppingItem, 'id' | 'inCart'>;

function updateRecordById(id: string, change: (record: ShoppingRecord) => ShoppingRecord) {
  store.update((prev) => prev.map((record) => (record.id === id ? change(record) : record)));
}

/** Creates a shopping session and returns its id. */
function addRecord(input: ShoppingRecordInput): string {
  const record: ShoppingRecord = {
    id: generateId(),
    location: input.location,
    dateTime: input.dateTime,
    budgetCentavos: input.budgetCentavos,
    items: [],
    createdAt: new Date().toISOString(),
  };
  store.update((prev) => [...prev, record]);
  return record.id;
}

function updateRecord(id: string, input: ShoppingRecordInput) {
  updateRecordById(id, (record) => ({ ...record, ...input }));
}

function removeRecord(id: string) {
  store.update((prev) => prev.filter((record) => record.id !== id));
}

function addItem(recordId: string, input: ShoppingItemInput) {
  updateRecordById(recordId, (record) => ({
    ...record,
    items: [...record.items, { id: generateId(), ...input, inCart: false }],
  }));
}

function updateItem(recordId: string, itemId: string, input: ShoppingItemInput) {
  updateRecordById(recordId, (record) => ({
    ...record,
    items: record.items.map((item) => (item.id === itemId ? { ...item, ...input } : item)),
  }));
}

/** Changes only the item's cart status; a no-op when it already has that status. */
function setItemInCart(recordId: string, itemId: string, inCart: boolean) {
  const record = store.getItems().find((candidate) => candidate.id === recordId);
  const item = record?.items.find((candidate) => candidate.id === itemId);
  if (!item || item.inCart === inCart) return;
  updateRecordById(recordId, (current) => ({
    ...current,
    items: current.items.map((candidate) =>
      candidate.id === itemId ? { ...candidate, inCart } : candidate
    ),
  }));
}

/** Moves an item to a new position in its record's list; the order is what the list shows and is saved. */
function moveItem(recordId: string, fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return;
  updateRecordById(recordId, (record) => {
    if (fromIndex < 0 || fromIndex >= record.items.length) return record;
    const items = [...record.items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(Math.min(Math.max(toIndex, 0), items.length), 0, moved);
    return { ...record, items };
  });
}

function removeItem(recordId: string, itemId: string) {
  updateRecordById(recordId, (record) => ({
    ...record,
    items: record.items.filter((item) => item.id !== itemId),
  }));
}

/** All shopping records and their items, persisted in AsyncStorage and shared by every screen. */
export function useShopping() {
  const { items: records, isLoading } = store.useStore();
  return {
    records,
    isLoading,
    addRecord,
    updateRecord,
    removeRecord,
    addItem,
    updateItem,
    setItemInCart,
    moveItem,
    removeItem,
  };
}
