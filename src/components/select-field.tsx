import { Feather } from '@react-native-vector-icons/feather';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, type TextInput, View } from 'react-native';

import { FormInput } from './form-input';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#3c87f7';
const OTHER_LABEL = 'Other (type it in)';

type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  /** Field name, for the placeholder and screen readers, e.g. "ID/Document type". */
  label: string;
  invalid?: boolean;
};

/**
 * A dropdown of `options` that isn't limited to them: "Other" reveals a text
 * field for any value. The list opens inline, below the field, so it works
 * inside a dialog. Tapping the selected option again clears it.
 */
export function SelectField({ value, onChange, options, label, invalid }: SelectFieldProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  // A saved value that isn't one of the options is a custom one.
  const [isCustom, setIsCustom] = useState(() => value !== '' && !options.includes(value));
  const customRef = useRef<TextInput>(null);

  const choose = (option: string) => {
    setIsOpen(false);
    setIsCustom(false);
    onChange(option === value ? '' : option);
  };

  const chooseOther = () => {
    setIsOpen(false);
    if (!isCustom) {
      setIsCustom(true);
      onChange('');
    }
    setTimeout(() => customRef.current?.focus(), 0);
  };

  const shown = isCustom ? 'Other' : value;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown || 'not set'}`}
        accessibilityHint="Opens the list of choices"
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [
          styles.anchor,
          {
            backgroundColor: theme.backgroundSelected,
            borderColor: invalid ? theme.danger : isOpen ? ACCENT : 'transparent',
          },
          pressed && styles.pressed,
        ]}>
        <ThemedText
          numberOfLines={1}
          themeColor={shown ? 'text' : 'textSecondary'}
          style={styles.anchorText}>
          {shown || `Select ${label.toLowerCase()}`}
        </ThemedText>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
      </Pressable>

      {isOpen ? (
        <View style={[styles.menu, { borderColor: theme.backgroundSelected }]}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <MenuRow
                key={option}
                label={option}
                selected={!isCustom && option === value}
                onPress={() => choose(option)}
              />
            ))}
            <MenuRow label={OTHER_LABEL} selected={isCustom} onPress={chooseOther} />
          </ScrollView>
        </View>
      ) : null}

      {isCustom ? (
        <FormInput
          ref={customRef}
          value={value}
          onChangeText={onChange}
          placeholder={`Type the ${label.toLowerCase()}`}
          accessibilityLabel={`${label}, custom`}
          invalid={invalid}
        />
      ) : null}
    </View>
  );
}

type MenuRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function MenuRow({ label, selected, onPress }: MenuRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.menuRow,
        (pressed || selected) && { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText type="small" style={styles.menuRowText}>
        {label}
      </ThemedText>
      {selected ? <Feather name="check" size={16} color={ACCENT} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  anchor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  anchorText: {
    flex: 1,
    fontSize: 16,
  },
  menu: {
    maxHeight: 280,
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
  },
  menuRowText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
