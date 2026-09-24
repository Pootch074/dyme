import { Feather } from '@react-native-vector-icons/feather';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { FormInput } from '@/components/form-input';
import { RevealToggle } from '@/components/reveal-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSignInForm } from '@/hooks/use-sign-in-form';
import { useTheme } from '@/hooks/use-theme';

/** The only screen available while signed out. */
export default function SignInScreen() {
  const theme = useTheme();
  const form = useSignInForm();
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={styles.badge}>
              <Feather name="lock" size={24} color="#3c87f7" />
            </View>
            <ThemedText type="subtitle">Welcome back</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              Sign in to continue.
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Username
              </ThemedText>
              <FormInput
                value={form.username}
                onChangeText={form.setUsername}
                placeholder="Username"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                invalid={Boolean(form.error)}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Password
              </ThemedText>
              <View>
                <FormInput
                  ref={passwordRef}
                  value={form.password}
                  onChangeText={form.setPassword}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  returnKeyType="go"
                  onSubmitEditing={form.submit}
                  trailingInset={44}
                  invalid={Boolean(form.error)}
                />
                <View style={styles.revealSlot}>
                  <RevealToggle
                    revealed={showPassword}
                    onToggle={() => setShowPassword((shown) => !shown)}
                    label="password"
                  />
                </View>
              </View>
            </View>

            {form.error ? (
              <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Feather name="alert-circle" size={16} color={theme.danger} />
                <ThemedText type="small" themeColor="danger" style={styles.flex}>
                  {form.error}
                </ThemedText>
              </View>
            ) : null}

            <Button
              label={form.isSubmitting ? 'Signing in…' : 'Sign in'}
              icon="log-in"
              onPress={form.submit}
              disabled={form.isSubmitting}
              style={styles.submit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    maxWidth: 420,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60, 135, 247, 0.15)',
    marginBottom: Spacing.two,
  },
  subtitle: {
    marginTop: -Spacing.two,
    marginBottom: Spacing.two,
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
  submit: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
  },
});
