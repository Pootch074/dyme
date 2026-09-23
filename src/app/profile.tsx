import { Feather } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { FormInput } from '@/components/form-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { type Profile, useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const { profile, isLoading, updateProfile } = useProfile();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <BackButton />
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

type ProfileFieldKey = keyof Profile;

const FIELDS: {
  key: ProfileFieldKey;
  label: string;
  keyboardType?: TextInputProps['keyboardType'];
}[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', keyboardType: 'email-address' },
  { key: 'phone', label: 'Phone number', keyboardType: 'phone-pad' },
];

// Mounted only once `initialProfile` has loaded from storage, so the lazy
// initializers below seed the fields correctly without an effect.
function ProfileForm({ initialProfile, onSave }: ProfileFormProps) {
  const theme = useTheme();
  // `saved` is what's persisted; `draft` is what the fields show while editing.
  const [saved, setSaved] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const values = isEditing ? draft : saved;

  const updateField = (key: ProfileFieldKey) => (text: string) => {
    setDraft((prev) => ({ ...prev, [key]: text }));
    if (error) setError(null);
  };

  const handleEdit = () => {
    setDraft(saved);
    setError(null);
    setJustSaved(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(saved);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = () => {
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

  return (
    <ThemedView type="backgroundElement" style={styles.form}>
      {FIELDS.map((field) => (
        <View key={field.key} style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
            {field.label}
          </ThemedText>
          <FormInput
            value={values[field.key]}
            onChangeText={updateField(field.key)}
            placeholder={isEditing ? field.label : 'Not set'}
            accessibilityLabel={field.label}
            keyboardType={field.keyboardType}
            editable={isEditing}
            invalid={
              error !== null &&
              (field.key === 'firstName' || field.key === 'lastName') &&
              !draft[field.key].trim()
            }
          />
        </View>
      ))}
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}

      {isEditing ? (
        <View style={styles.actions}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">Cancel</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              Save changes
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={handleEdit}
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            styles.editButton,
            pressed && styles.pressed,
          ]}>
          <Feather name="edit-2" size={16} color="#ffffff" />
          <ThemedText type="smallBold" style={styles.primaryButtonText}>
            Edit
          </ThemedText>
        </Pressable>
      )}

      {justSaved && !isEditing && (
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
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    paddingHorizontal: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3c87f7',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  editButton: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  savedText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
