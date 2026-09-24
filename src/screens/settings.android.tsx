import {
  Card,
  Column,
  Icon,
  ListItem,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  padding,
  paddingAll,
  Shapes,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader, SectionLabel } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';
import { useAuth } from '@/hooks/use-auth';
import { type ThemePreference, useThemePreference } from '@/hooks/use-theme-preference';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const TRANSPARENT = '#00000000';

export default function SettingsScreen() {
  const colors = useAppMaterialColors();
  const { preference, setPreference } = useThemePreference();
  const { username, signOut } = useAuth();

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader title="Settings" subtitle="Manage your profile and preferences." />

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Account</SectionLabel>
          <SettingsRow
            icon={Icons.person}
            label="Profile"
            description="Your personal details"
            onClick={() => router.push('/profile')}
          />
          <SettingsRow
            icon={Icons.logout}
            label="Sign out"
            description={`Signed in as ${username}`}
            onClick={signOut}
          />
        </Column>

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Data</SectionLabel>
          <SettingsRow
            icon={Icons.download}
            label="Export data"
            description="Save your data as an Excel or CSV file"
            onClick={() => router.push('/export')}
          />
        </Column>

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          <SectionLabel>Appearance</SectionLabel>
          <Card modifiers={[fillMaxWidth()]}>
            <ListItem colors={{ containerColor: TRANSPARENT }}>
              <ListItem.LeadingContent>
                <Icon source={Icons.brightnessAuto} tint={colors.primary} />
              </ListItem.LeadingContent>
              <ListItem.HeadlineContent>
                <Text style={{ typography: 'titleMedium' }}>Theme</Text>
              </ListItem.HeadlineContent>
              <ListItem.SupportingContent>
                <Text>System follows your device setting</Text>
              </ListItem.SupportingContent>
            </ListItem>
            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth(), padding(16, 0, 16, 16)]}>
              {THEME_OPTIONS.map((option) => (
                <SegmentedButton
                  key={option.value}
                  selected={option.value === preference}
                  onClick={() => setPreference(option.value)}>
                  <SegmentedButton.Label>
                    <Text>{option.label}</Text>
                  </SegmentedButton.Label>
                </SegmentedButton>
              ))}
            </SingleChoiceSegmentedButtonRow>
          </Card>
        </Column>
      </Column>
    </ComposeScreen>
  );
}

type SettingsRowProps = {
  icon: number;
  label: string;
  description: string;
  onClick: () => void;
};

/** One tappable settings row: icon, label and description, with a chevron. */
function SettingsRow({ icon, label, description, onClick }: SettingsRowProps) {
  const colors = useAppMaterialColors();
  return (
    <Card modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(12)), clickable(onClick)]}>
      <ListItem colors={{ containerColor: TRANSPARENT }}>
        <ListItem.LeadingContent>
          <Icon source={icon} tint={colors.primary} />
        </ListItem.LeadingContent>
        <ListItem.HeadlineContent>
          <Text style={{ typography: 'titleMedium' }}>{label}</Text>
        </ListItem.HeadlineContent>
        <ListItem.SupportingContent>
          <Text>{description}</Text>
        </ListItem.SupportingContent>
        <ListItem.TrailingContent>
          <Icon source={Icons.chevronRight} />
        </ListItem.TrailingContent>
      </ListItem>
    </Card>
  );
}
