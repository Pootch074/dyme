import { Box, Column, Icon, Row, Shape, Spacer, Surface, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, height, weight } from '@expo/ui/jetpack-compose/modifiers';

import { Icons } from './icons';
import { useAppMaterialColors } from './theme';

import { isKeyEnabled, type KeypadKey, type KeypadTarget } from '@/utils/keypad';

// Layout from the spec, with "." added beside 0 so prices like ₱250.50 can be typed.
const ROWS: (KeypadKey | null)[][] = [
  ['1', '2', '3', 'erase'],
  ['4', '5', '6', 'clear'],
  ['7', '8', '9', null],
  ['.99', '0', '.', null],
];

// Erase and Clear show icons; their names stay as the spoken labels.
const ACTION_KEYS: Partial<Record<KeypadKey, { icon: number; label: string }>> = {
  erase: { icon: Icons.backspace, label: 'Erase' },
  clear: { icon: Icons.cancel, label: 'Clear' },
};

const KEY_SHAPE = Shape.RoundedCorner({
  cornerRadii: { topStart: 12, topEnd: 12, bottomStart: 12, bottomEnd: 12 },
});

type NumberPadProps = {
  target: KeypadTarget;
  onKey: (key: KeypadKey) => void;
};

/** On-screen number pad for prices and quantities: 0–9, ".", ".99", Erase and Clear. */
export function NumberPad({ target, onKey }: NumberPadProps) {
  const colors = useAppMaterialColors();

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
      {ROWS.map((row, rowIndex) => (
        <Row key={rowIndex} modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
          {row.map((key, keyIndex) => {
            if (!key) return <Spacer key={`empty-${keyIndex}`} modifiers={[weight(1)]} />;
            const action = ACTION_KEYS[key];
            const isAction = action !== undefined;
            return (
              <Surface
                key={key}
                onClick={() => onKey(key)}
                enabled={isKeyEnabled(target, key)}
                shape={KEY_SHAPE}
                color={isAction ? colors.secondaryContainer : colors.surfaceContainerHigh}
                contentColor={isAction ? colors.onSecondaryContainer : colors.onSurface}
                modifiers={[weight(1), height(56)]}>
                <Box contentAlignment="center" modifiers={[fillMaxWidth(), height(56)]}>
                  {action ? (
                    <Icon source={action.icon} contentDescription={action.label} />
                  ) : (
                    <Text
                      style={{ typography: 'headlineSmall' }}
                      color={isKeyEnabled(target, key) ? undefined : colors.outline}>
                      {key}
                    </Text>
                  )}
                </Box>
              </Surface>
            );
          })}
        </Row>
      ))}
    </Column>
  );
}
