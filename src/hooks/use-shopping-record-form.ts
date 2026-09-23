import { useState } from 'react';

import { useShopping } from '@/hooks/use-shopping';
import { nowInPHT } from '@/utils/date';
import { centavosToInput, moneyErrorMessage, parseMoneyInput } from '@/utils/money';
import type { ShoppingRecord } from '@/utils/shopping';

/** Validates the optional budget: empty means no budget; zero isn't a usable budget. */
function parseBudget(
  input: string
): { ok: true; centavos: number | null } | { ok: false; error: string } {
  if (!input.trim()) return { ok: true, centavos: null };
  const parsed = parseMoneyInput(input);
  if (!parsed.ok) return { ok: false, error: moneyErrorMessage('Budget', parsed.error) };
  if (parsed.centavos === 0) {
    return {
      ok: false,
      error: 'Budget must be more than ₱0.00. Leave it empty for no budget.',
    };
  }
  return { ok: true, centavos: parsed.centavos };
}

/**
 * State for the "New shopping" / "Edit shopping" dialog: location, when the
 * shopping happens (defaults to now, PHT), and an optional budget. Shared by
 * the platform screens.
 */
export function useShoppingRecordForm(onSaved?: (recordId: string) => void) {
  const { addRecord, updateRecord } = useShopping();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [location, setLocationState] = useState('');
  const [dateTime, setDateTime] = useState(() => nowInPHT().toISOString());
  const [budget, setBudgetState] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const open = (record?: ShoppingRecord) => {
    setEditingId(record?.id ?? null);
    setLocationState(record?.location ?? '');
    setDateTime(record?.dateTime ?? nowInPHT().toISOString());
    setBudgetState(record?.budgetCentavos != null ? centavosToInput(record.budgetCentavos) : '');
    setLocationError(null);
    setBudgetError(null);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const setLocation = (text: string) => {
    setLocationState(text);
    if (locationError && text.trim()) setLocationError(null);
  };

  const setBudget = (text: string) => {
    setBudgetState(text);
    if (budgetError) setBudgetError(null);
  };

  const submit = () => {
    const trimmed = location.trim();
    const parsedBudget = parseBudget(budget);
    setLocationError(trimmed ? null : 'Location is required.');
    setBudgetError(parsedBudget.ok ? null : parsedBudget.error);
    if (!trimmed || !parsedBudget.ok) return;

    const input = { location: trimmed, dateTime, budgetCentavos: parsedBudget.centavos };
    if (editingId) {
      updateRecord(editingId, input);
      setIsOpen(false);
      onSaved?.(editingId);
    } else {
      const id = addRecord(input);
      setIsOpen(false);
      onSaved?.(id);
    }
  };

  return {
    isOpen,
    isEditing: editingId !== null,
    title: editingId ? 'Edit shopping' : 'New shopping',
    location,
    dateTime,
    budget,
    locationError,
    budgetError,
    open,
    close,
    setLocation,
    setDateTime,
    setBudget,
    submit,
  };
}
