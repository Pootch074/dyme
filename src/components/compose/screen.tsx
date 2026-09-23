import { Column, Host, Icon, IconButton, Surface, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize, fillMaxWidth, offset } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icons } from './icons';
import { MATERIAL_SEED_COLOR, useAppMaterialColors } from './theme';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Full-screen Jetpack Compose root: a themed Compose host inside the safe area,
 * with a Material surface so text and icons get the right content colors.
 */
export function ComposeScreen({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = useAppMaterialColors();

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <Host style={styles.fill} colorScheme={colorScheme} seedColor={MATERIAL_SEED_COLOR}>
        <Surface color={colors.background} modifiers={[fillMaxSize()]}>
          {children}
        </Surface>
      </Host>
    </SafeAreaView>
  );
}

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
};

/** Screen title block, with an optional back arrow above it. */
export function ScreenHeader({ title, subtitle, onBack }: ScreenHeaderProps) {
  const colors = useAppMaterialColors();

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 4 }}>
      {onBack ? (
        // Pulled left so the arrow's glyph lines up with the title text.
        <IconButton onClick={onBack} modifiers={[offset(-12, 0)]}>
          <Icon source={Icons.arrowBack} contentDescription="Go back" />
        </IconButton>
      ) : null}
      <Text style={{ typography: 'headlineMedium' }}>{title}</Text>
      {subtitle ? (
        <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
          {subtitle}
        </Text>
      ) : null}
    </Column>
  );
}

/** Small label above a group of controls, e.g. "Appearance". */
export function SectionLabel({ children }: { children: string }) {
  const colors = useAppMaterialColors();
  return (
    <Text color={colors.primary} style={{ typography: 'labelLarge' }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
