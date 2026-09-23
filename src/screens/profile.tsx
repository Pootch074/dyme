import { Feather } from '@react-native-vector-icons/feather';
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
import { PROFILE_FIELDS, useProfileEditor } from '@/hooks/use-profile-editor';
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

const KEYBOARD_TYPES: Record<(typeof PROFILE_FIELDS)[number]['kind'], TextInputProps['keyboardType']> = {
  text: 'default',
  email: 'email-address',
  phone: 'phone-pad',
};

// Mounted only once `initialProfile` has loaded from storage, so the editor's
// initial state is seeded correctly without an effect.
function ProfileForm({ initialProfile, onSave }: ProfileFormProps) {
  const theme = useTheme();
  const {
    values,
    isEditing,
    error,
    justSaved,
    changeField,
    startEdit: handleEdit,
    cancelEdit: handleCancel,
    save: handleSave,
    isFieldInvalid,
  } = useProfileEditor(initialProfile, onSave);

  return (
    <ThemedView type="backgroundElement" style={styles.form}>
      {PROFILE_FIELDS.map((field) => (
        <View key={field.key} style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
            {field.label}
          </ThemedText>
          <FormInput
            value={values[field.key]}
            onChangeText={(text) => changeField(field.key, text)}
            placeholder={isEditing ? field.label : 'Not set'}
            accessibilityLabel={field.label}
            keyboardType={KEYBOARD_TYPES[field.kind]}
            editable={isEditing}
            invalid={isFieldInvalid(field.key)}
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
