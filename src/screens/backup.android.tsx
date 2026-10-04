import { Button, Card, Column, Icon, IconButton, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  imePadding,
  paddingAll,
  verticalScroll,
  height,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { useState } from 'react';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { ControlledTextField } from '@/components/compose/text-field';
import { useAppMaterialColors } from '@/components/compose/theme';
import { describeLastSync, MIN_PASSPHRASE_LENGTH, useBackupForm } from '@/hooks/use-backup-form';
import { useSync } from '@/hooks/use-sync';

export default function BackupScreen() {
  const { status } = useSync();

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), imePadding(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader
          title="Online backup"
          subtitle="Keeps your data safe online and in step across devices."
          onBack={() => router.back()}
        />
        {status === 'ready' ? (
          <ReadyCard />
        ) : status === 'needs-setup' || status === 'locked' ? (
          <PassphraseCard mode={status} />
        ) : (
          <CheckingCard />
        )}
      </Column>
    </ComposeScreen>
  );
}

function CheckingCard() {
  const colors = useAppMaterialColors();
  const { status, error, syncNow } = useSync();

  return (
    <Card modifiers={[fillMaxWidth()]}>
      <Column modifiers={[fillMaxWidth(), paddingAll(16)]} verticalArrangement={{ spacedBy: 12 }}>
        <Text color={colors.onSurfaceVariant}>
          {status === 'off' ? 'Sign in to use online backup.' : (error ?? 'Checking backup…')}
        </Text>
        {error ? (
          <Button onClick={syncNow} modifiers={[fillMaxWidth()]}>
            <Text>Try again</Text>
          </Button>
        ) : null}
      </Column>
    </Card>
  );
}

function ReadyCard() {
  const colors = useAppMaterialColors();
  const { isSyncing, lastSyncedAt, error, syncNow } = useSync();

  return (
    <Card modifiers={[fillMaxWidth()]}>
      <Column modifiers={[fillMaxWidth(), paddingAll(16)]} verticalArrangement={{ spacedBy: 12 }}>
        <Text style={{ typography: 'titleMedium' }}>Backup is on</Text>
        <Text color={colors.onSurfaceVariant}>
          Last synced: {isSyncing ? 'syncing…' : describeLastSync(lastSyncedAt)}
        </Text>
        {error ? <Text color={colors.error}>{error}</Text> : null}
        <Button onClick={syncNow} enabled={!isSyncing} modifiers={[fillMaxWidth()]}>
          <Text>{isSyncing ? 'Syncing…' : 'Sync now'}</Text>
        </Button>
        <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
          Account and card numbers, passwords, ID numbers and photos are encrypted on your phone
          before they are uploaded, so only you can read them.
        </Text>
      </Column>
    </Card>
  );
}

function PassphraseCard({ mode }: { mode: 'needs-setup' | 'locked' }) {
  const colors = useAppMaterialColors();
  const form = useBackupForm();
  const [showPassphrase, setShowPassphrase] = useState(false);
  const isSetup = mode === 'needs-setup';

  return (
    <Card modifiers={[fillMaxWidth()]}>
      <Column modifiers={[fillMaxWidth(), paddingAll(16)]} verticalArrangement={{ spacedBy: 12 }}>
        <Text color={colors.onSurfaceVariant}>
          {isSetup
            ? 'Choose a backup passphrase. It encrypts your account and card numbers, passwords, ID numbers and photos before they leave this phone.'
            : 'Backup is already set up. Enter your backup passphrase to unlock it on this phone.'}
        </Text>
        {isSetup ? (
          <Text color={colors.error} style={{ typography: 'titleSmall' }}>
            Write it down. If you forget it, that data cannot be recovered, by anyone.
          </Text>
        ) : null}

        <ControlledTextField
          value={form.passphrase}
          onChangeText={form.setPassphrase}
          label={isSetup ? `Passphrase (at least ${MIN_PASSPHRASE_LENGTH} characters)` : 'Passphrase'}
          keyboardType="password"
          exact
          masked={!showPassphrase}
          isError={Boolean(form.error)}
          trailing={
            <IconButton onClick={() => setShowPassphrase((shown) => !shown)}>
              <Icon
                source={showPassphrase ? Icons.visibilityOff : Icons.visibility}
                contentDescription={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
              />
            </IconButton>
          }
        />
        {isSetup ? (
          <ControlledTextField
            value={form.confirmation}
            onChangeText={form.setConfirmation}
            label="Confirm passphrase"
            keyboardType="password"
            exact
            masked={!showPassphrase}
            isError={Boolean(form.error)}
            supportingText={form.error}
          />
        ) : null}
        {!isSetup && form.error ? <Text color={colors.error}>{form.error}</Text> : null}

        <Spacer modifiers={[height(4)]} />
        <Button onClick={form.submit} enabled={!form.isBusy} modifiers={[fillMaxWidth()]}>
          <Text>{form.isBusy ? 'Securing…' : isSetup ? 'Turn on backup' : 'Unlock'}</Text>
        </Button>
      </Column>
    </Card>
  );
}
