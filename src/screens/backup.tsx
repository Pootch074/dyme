import { Feather } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { FormInput } from '@/components/form-input';
import { RevealToggle } from '@/components/reveal-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { describeLastSync, MIN_PASSPHRASE_LENGTH, useBackupForm } from '@/hooks/use-backup-form';
import { useSync } from '@/hooks/use-sync';
import { useTheme } from '@/hooks/use-theme';

export default function BackupScreen() {
  const { status } = useSync();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <BackButton />
            <ThemedText type="subtitle">Online backup</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              Keeps your data safe online and in step across devices.
            </ThemedText>

            {status === 'ready' ? (
              <ReadyCard />
            ) : status === 'needs-setup' || status === 'locked' ? (
              <PassphraseCard mode={status} />
            ) : (
              <CheckingCard />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function CheckingCard() {
  const { status, error, syncNow } = useSync();
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        {status === 'off' ? 'Sign in to use online backup.' : (error ?? 'Checking backup…')}
      </ThemedText>
      {error ? <Button label="Try again" icon="refresh-cw" onPress={syncNow} /> : null}
    </ThemedView>
  );
}

function ReadyCard() {
  const theme = useTheme();
  const { isSyncing, lastSyncedAt, error, syncNow } = useSync();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.statusRow}>
        <Feather name="check-circle" size={20} color={theme.text} />
        <ThemedText type="smallBold">Backup is on</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Last synced: {isSyncing ? 'syncing…' : describeLastSync(lastSyncedAt)}
      </ThemedText>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <Button
        label={isSyncing ? 'Syncing…' : 'Sync now'}
        icon="refresh-cw"
        onPress={syncNow}
        disabled={isSyncing}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Account and card numbers, passwords, ID numbers and photos are encrypted on your phone
        before they are uploaded, so only you can read them.
      </ThemedText>
    </ThemedView>
  );
}

function PassphraseCard({ mode }: { mode: 'needs-setup' | 'locked' }) {
  const theme = useTheme();
  const form = useBackupForm();
  const [showPassphrase, setShowPassphrase] = useState(false);
  const isSetup = mode === 'needs-setup';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        {isSetup
          ? 'Choose a backup passphrase. It encrypts your account and card numbers, passwords, ID numbers and photos before they leave this phone.'
          : 'Backup is already set up. Enter your backup passphrase to unlock it on this phone.'}
      </ThemedText>
      {isSetup ? (
        <ThemedText type="smallBold" themeColor="danger">
          Write it down. If you forget it, that data cannot be recovered, by anyone.
        </ThemedText>
      ) : null}

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Passphrase
        </ThemedText>
        <View>
          <FormInput
            value={form.passphrase}
            onChangeText={form.setPassphrase}
            placeholder={isSetup ? `At least ${MIN_PASSPHRASE_LENGTH} characters` : 'Passphrase'}
            secureTextEntry={!showPassphrase}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType={isSetup ? 'next' : 'go'}
            onSubmitEditing={isSetup ? undefined : form.submit}
            trailingInset={44}
            invalid={Boolean(form.error)}
          />
          <View style={styles.revealSlot}>
            <RevealToggle
              revealed={showPassphrase}
              onToggle={() => setShowPassphrase((shown) => !shown)}
              label="passphrase"
            />
          </View>
        </View>
      </View>

      {isSetup ? (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Confirm passphrase
          </ThemedText>
          <FormInput
            value={form.confirmation}
            onChangeText={form.setConfirmation}
            placeholder="Type it again"
            secureTextEntry={!showPassphrase}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            onSubmitEditing={form.submit}
            invalid={Boolean(form.error)}
          />
        </View>
      ) : null}

      {form.error ? (
        <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={16} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.flex}>
            {form.error}
          </ThemedText>
        </View>
      ) : null}

      <Button
        label={form.isBusy ? 'Securing…' : isSetup ? 'Turn on backup' : 'Unlock'}
        icon={isSetup ? 'upload-cloud' : 'unlock'}
        onPress={form.submit}
        disabled={form.isBusy}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
  },
  subtitle: {
    marginTop: Spacing.half,
    marginBottom: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    paddingHorizontal: Spacing.one,
  },
  revealSlot: {
    position: 'absolute',
    right: Spacing.one,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
