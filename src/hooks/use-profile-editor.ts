import { useState } from 'react';

import type { Profile } from '@/hooks/use-profile';

export type ProfileFieldKey = keyof Profile;

export const PROFILE_FIELDS: {
  key: ProfileFieldKey;
  label: string;
  kind: 'text' | 'email' | 'phone';
  required?: boolean;
}[] = [
  { key: 'firstName', label: 'First name', kind: 'text', required: true },
  { key: 'lastName', label: 'Last name', kind: 'text', required: true },
  { key: 'email', label: 'Email', kind: 'email' },
  { key: 'phone', label: 'Phone number', kind: 'phone' },
];

/**
 * View / edit state for the profile form, shared by the platform-specific
 * screens. Seed it only once the stored profile has loaded.
 */
export function useProfileEditor(initialProfile: Profile, onSave: (profile: Profile) => void) {
  // `saved` is what's persisted; `draft` is what the fields show while editing.
  const [saved, setSaved] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const values = isEditing ? draft : saved;

  const changeField = (key: ProfileFieldKey, text: string) => {
    setDraft((prev) => ({ ...prev, [key]: text }));
    if (error) setError(null);
  };

  const startEdit = () => {
    setDraft(saved);
    setError(null);
    setJustSaved(false);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(saved);
    setError(null);
    setIsEditing(false);
  };

  const save = () => {
    const next: Profile = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    };
    if (!next.firstName || !next.lastName) {
      setError('Enter your first and last name.');
      return;
    }

    onSave(next);
    setSaved(next);
    setIsEditing(false);
    setJustSaved(true);
  };

  /** Whether a required field is currently shown as missing. */
  const isFieldInvalid = (key: ProfileFieldKey) =>
    error !== null &&
    PROFILE_FIELDS.some((field) => field.key === key && field.required) &&
    !draft[key].trim();

  return {
    values,
    isEditing,
    error,
    justSaved,
    changeField,
    startEdit,
    cancelEdit,
    save,
    isFieldInvalid,
  };
}
