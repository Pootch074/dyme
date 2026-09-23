import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ThemePreference, useThemePreference } from '@/hooks/use-theme-preference';

type ThemeOption = {
  value: ThemePreference;
  label: string;
  icon: FeatherIconName;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'smartphone' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Settings</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText}>
            Manage your profile and preferences.
          </ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Account
          </ThemedText>
          <Link href="/profile" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.row}>
                <View style={styles.rowIcon}>
                  <Feather name="user" size={20} color={theme.text} />
                </View>
                <View style={styles.rowText}>
                  <ThemedText style={styles.rowLabel}>Profile</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Your personal details
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textSecondary} />
              </ThemedView>
            </Pressable>
          </Link>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
            Appearance
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.rowIcon}>
                <Feather name="droplet" size={20} color={theme.text} />
              </View>
              <View style={styles.rowText}>
                <ThemedText style={styles.rowLabel}>Theme</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  System follows your device setting
                </ThemedText>
              </View>
            </View>

            <View style={styles.segmented} accessibilityRole="radiogroup">
              {THEME_OPTIONS.map((option) => {
                const isSelected = option.value === preference;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPreference(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${option.label} theme`}
                    style={({ pressed }) => [
                      styles.segment,
                      isSelected && styles.segmentSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Feather
                      name={option.icon}
                      size={16}
                      color={isSelected ? '#ffffff' : theme.textSecondary}
                    />
                    <ThemedText
                      type="smallBold"
                      themeColor="textSecondary"
                      style={isSelected && styles.segmentSelectedText}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>
        </ScrollView>
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
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.four,
  },
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.two,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60, 135, 247, 0.15)',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowLabel: {
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  segmentSelected: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  segmentSelectedText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
