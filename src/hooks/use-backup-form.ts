import { useState } from 'react';

import { type SyncStatus, useSync } from '@/hooks/use-sync';

export const MIN_PASSPHRASE_LENGTH = 8;

/** State and submit for the Online backup screen's passphrase form, shared by the iOS/web and Android versions. */
export function useBackupForm() {
  const { status, setUpBackup, unlock } = useSync();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const clearError = () => {
    if (error) setError(null);
  };

  const submit = async () => {
    if (isBusy) return;

    if (status === 'needs-setup') {
      if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
        setError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`);
        return;
      }
      if (passphrase !== confirmation) {
        setError("The two passphrases don't match.");
        return;
      }
      setIsBusy(true);
      setError(null);
      const result = await setUpBackup(passphrase);
      setIsBusy(false);
      if (result === 'ok') {
        setPassphrase('');
        setConfirmation('');
      } else if (result === 'already-set-up') {
        setPassphrase('');
        setConfirmation('');
        setError('Backup was already set up on another device. Enter that passphrase instead.');
      } else {
        setError("Couldn't turn on backup. Check your connection and try again.");
      }
      return;
    }

    if (status === 'locked') {
      if (!passphrase) {
        setError('Enter your backup passphrase.');
        return;
      }
      setIsBusy(true);
      setError(null);
      const result = await unlock(passphrase);
      setIsBusy(false);
      if (result === 'ok') {
        setPassphrase('');
      } else if (result === 'wrong-passphrase') {
        setPassphrase('');
        setError('That passphrase is not correct.');
      } else if (result === 'not-set-up') {
        setPassphrase('');
        setError('Backup is not set up yet. Choose a passphrase to turn it on.');
      } else {
        setError("Couldn't unlock backup. Check your connection and try again.");
      }
    }
  };

  return {
    passphrase,
    confirmation,
    error,
    isBusy,
    setPassphrase: (text: string) => {
      setPassphrase(text);
      clearError();
    },
    setConfirmation: (text: string) => {
      setConfirmation(text);
      clearError();
    },
    submit,
  };
}

/** "Just now", "5 minutes ago", or the date for anything older. */
export function describeLastSync(date: Date | null): string {
  if (!date) return 'Not yet in this session';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  return date.toLocaleString();
}

/** One line for the Settings row: where online backup stands. */
export function backupDescription(status: SyncStatus, error: string | null): string {
  switch (status) {
    case 'ready':
      return error ? 'On, waiting to sync' : 'On, keeping your data online';
    case 'needs-setup':
      return 'Turn on to keep your data online';
    case 'locked':
      return 'Enter your passphrase to unlock';
    default:
      return 'Checking…';
  }
}
