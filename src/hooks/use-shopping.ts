import { createPersistentStore, generateId, readStoredArray } from '@/utils/persistent-store';
import type { ShoppingItem, ShoppingRecord } from '@/utils/shopping';

const store = createPersistentStore<ShoppingRecord>({
  storageKey: 'shopping-records',
  load: async () => (await readStoredArray<ShoppingRecord>('shopping-records')) ?? [],
  label: 'shopping records',
});

export type ShoppingRecordInput = {
  location: string;
  dateTime: string;
  /** Budget in centavos, or null for no budget. */
  budgetCentavos: number | null;
};
export type ShoppingItemInput = Omit<ShoppingItem, 'id'>;

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
    items: [...record.items, { id: generateId(), ...input }],
  }));
}

function updateItem(recordId: string, itemId: string, input: ShoppingItemInput) {
  updateRecordById(recordId, (record) => ({
    ...record,
    items: record.items.map((item) => (item.id === itemId ? { ...item, ...input } : item)),
  }));
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
    removeItem,
  };
}
