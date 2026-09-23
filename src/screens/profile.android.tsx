import {
  Button,
  Card,
  Column,
  Icon,
  ListItem,
  OutlinedButton,
  Row,
  Spacer,
  Text,
  type TextFieldKeyboardType,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  imePadding,
  paddingAll,
  verticalScroll,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { ControlledTextField } from '@/components/compose/text-field';
import { useAppMaterialColors } from '@/components/compose/theme';
import { type Profile, useProfile } from '@/hooks/use-profile';
import { PROFILE_FIELDS, useProfileEditor } from '@/hooks/use-profile-editor';

const KEYBOARD_TYPES: Record<(typeof PROFILE_FIELDS)[number]['kind'], TextFieldKeyboardType> = {
  text: 'text',
  email: 'email',
  phone: 'phone',
};

export default function ProfileScreen() {
  const { profile, isLoading, updateProfile } = useProfile();

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), imePadding(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader
          title="Profile"
          subtitle="Your personal details."
          onBack={() => router.back()}
        />
        {!isLoading && <ProfileForm initialProfile={profile} onSave={updateProfile} />}
      </Column>
    </ComposeScreen>
  );
}

type ProfileFormProps = {
  initialProfile: Profile;
  onSave: (profile: Profile) => void;
};

// Mounted only once `initialProfile` has loaded from storage, so the editor's
// initial state is seeded correctly without an effect.
function ProfileForm({ initialProfile, onSave }: ProfileFormProps) {
  const colors = useAppMaterialColors();
  const {
    values,
    isEditing,
    error,
    justSaved,
    changeField,
    startEdit,
    cancelEdit,
    save,
    isFieldInvalid,
  } = useProfileEditor(initialProfile, onSave);

  if (!isEditing) {
    return (
      <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 16 }}>
        <Card modifiers={[fillMaxWidth()]}>
          {PROFILE_FIELDS.map((field) => (
            <ListItem key={field.key} colors={{ containerColor: '#00000000' }}>
              <ListItem.OverlineContent>
                <Text>{field.label}</Text>
              </ListItem.OverlineContent>
              <ListItem.HeadlineContent>
                {values[field.key] ? (
                  <Text>{values[field.key]}</Text>
                ) : (
                  <Text color={colors.onSurfaceVariant}>Not set</Text>
                )}
              </ListItem.HeadlineContent>
            </ListItem>
          ))}
        </Card>

        <Button onClick={startEdit} modifiers={[fillMaxWidth()]}>
          <Icon source={Icons.edit} size={18} />
          <Spacer modifiers={[width(8)]} />
          <Text>Edit</Text>
        </Button>

        {justSaved ? (
          <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
            Saved.
          </Text>
        ) : null}
      </Column>
    );
  }

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 12 }}>
      {PROFILE_FIELDS.map((field) => (
        <ControlledTextField
          key={field.key}
          value={values[field.key]}
          onChangeText={(text) => changeField(field.key, text)}
          label={field.required ? `${field.label} *` : field.label}
          keyboardType={KEYBOARD_TYPES[field.kind]}
          isError={isFieldInvalid(field.key)}
          supportingText={isFieldInvalid(field.key) ? `${field.label} is required.` : null}
        />
      ))}
      {error ? (
        <Text color={colors.error} style={{ typography: 'bodySmall' }}>
          {error}
        </Text>
      ) : null}

      <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
        <OutlinedButton onClick={cancelEdit} modifiers={[weight(1)]}>
          <Text>Cancel</Text>
        </OutlinedButton>
        <Button onClick={save} modifiers={[weight(1)]}>
          <Text>Save changes</Text>
        </Button>
      </Row>
    </Column>
  );
}
