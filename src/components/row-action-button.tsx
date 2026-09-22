import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RowActionButtonProps = {
  icon: FeatherIconName;
  tooltip: string;
  accessibilityLabel: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

/** Icon-only row action: subdued by default, revealed on hover/press with a tooltip. */
export function RowActionButton({
  icon,
  tooltip,
  accessibilityLabel,
  tone = 'default',
  onPress,
}: RowActionButtonProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hovered || pressed;
  const iconColor = active ? (tone === 'danger' ? theme.danger : theme.text) : theme.textSecondary;

  return (
    <View style={styles.actionWrapper}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        delayHoverIn={400}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[styles.actionButton, active && { backgroundColor: theme.backgroundSelected }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </Pressable>

      {hovered ? (
        <View
          style={[styles.tooltip, { backgroundColor: theme.text }]}
          pointerEvents="none"
          aria-hidden>
          <ThemedText style={[styles.tooltipText, { color: theme.background }]}>{tooltip}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionWrapper: {
    position: 'relative',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    alignSelf: 'center',
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
