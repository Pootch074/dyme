import { useState } from 'react';

import { useShopping } from '@/hooks/use-shopping';
import { nowInPHT } from '@/utils/date';
import type { ShoppingRecord } from '@/utils/shopping';

/**
 * State for the "New shopping" / "Edit shopping" dialog: location and when the
 * shopping happens (defaults to now, PHT). Shared by the platform screens.
 */
export function useShoppingRecordForm(onSaved?: (recordId: string) => void) {
  const { addRecord, updateRecord } = useShopping();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [location, setLocationState] = useState('');
  const [dateTime, setDateTime] = useState(() => nowInPHT().toISOString());
  const [locationError, setLocationError] = useState<string | null>(null);

  const open = (record?: ShoppingRecord) => {
    setEditingId(record?.id ?? null);
    setLocationState(record?.location ?? '');
    setDateTime(record?.dateTime ?? nowInPHT().toISOString());
    setLocationError(null);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const setLocation = (text: string) => {
    setLocationState(text);
    if (locationError && text.trim()) setLocationError(null);
  };

  const submit = () => {
    const trimmed = location.trim();
    if (!trimmed) {
      setLocationError('Location is required.');
      return;
    }

    const input = { location: trimmed, dateTime };
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
    locationError,
    open,
    close,
    setLocation,
    setDateTime,
    submit,
  };
}
