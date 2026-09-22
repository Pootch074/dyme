import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormInput } from '@/components/form-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { type Profile, useProfile } from '@/hooks/use-profile';

export default function ProfileScreen() {
  const { profile, isLoading, updateProfile } = useProfile();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Profile</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
              Your personal details.
            </ThemedText>

            {!isLoading && <ProfileForm initialProfile={profile} onSave={updateProfile} />}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

type ProfileFormProps = {
  initialProfile: Profile;
  onSave: (profile: Profile) => void;
};

// Mounted only once `initialProfile` has loaded from storage, so the lazy
// initializers below seed the fields correctly without an effect.
function ProfileForm({ initialProfile, onSave }: ProfileFormProps) {
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const updateField = (setter: (value: string) => void) => (text: string) => {
    setter(text);
    if (error) setError(null);
    if (justSaved) setJustSaved(false);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter your name.');
      return;
    }

    onSave({ name: trimmedName, email: email.trim(), phone: phone.trim() });
    setJustSaved(true);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.form}>
      <FormInput value={name} onChangeText={updateField(setName)} placeholder="Full name" />
      <FormInput
        value={email}
        onChangeText={updateField(setEmail)}
        placeholder="Email"
        keyboardType="email-address"
      />
      <FormInput
        value={phone}
        onChangeText={updateField(setPhone)}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}

      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.saveButtonText}>
          Save changes
        </ThemedText>
      </Pressable>

      {justSaved && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.savedText}>
          Saved.
        </ThemedText>
      )}
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
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.four,
  },
  form: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  saveButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
  },
  savedText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
