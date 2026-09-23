import { BasicTextField, Icon, IconButton, Row, useNativeState } from '@expo/ui/jetpack-compose';
import { size, width } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useRef } from 'react';

import { Icons } from './icons';
import { useAppMaterialColors } from './theme';

type QuantityStepperProps = {
  value: number;
  onChange: (quantity: number) => void;
  itemName: string;
  min?: number;
};

/** Compact −/+ quantity control with a directly-editable count in between. */
export function QuantityStepper({ value, onChange, itemName, min = 1 }: QuantityStepperProps) {
  const colors = useAppMaterialColors();
  const text = useNativeState(String(value));
  // What the user has typed since focusing the field; null while they aren't
  // editing, so a +/- tap or outside change can overwrite the shown count.
  const draft = useRef<string | null>(null);
  const atMin = value <= min;

  useEffect(() => {
    if (draft.current === null) text.set(String(value));
  }, [value, text]);

  const commit = () => {
    if (draft.current === null) return;
    const trimmed = draft.current.trim();
    draft.current = null;
    const parsed = Number(trimmed);
    const next = /^\d+$/.test(trimmed) && parsed >= min ? parsed : value;
    // Normalizes e.g. "03" or an invalid entry back to a clean count.
    text.set(String(next));
    if (next !== value) onChange(next);
  };

  const step = (delta: number) => {
    draft.current = null;
    onChange(Math.max(min, value + delta));
  };

  return (
    <Row verticalAlignment="center">
      <IconButton onClick={() => step(-1)} enabled={!atMin} modifiers={[size(36, 36)]}>
        <Icon
          source={Icons.remove}
          size={18}
          contentDescription={`Decrease quantity of ${itemName}`}
        />
      </IconButton>
      <BasicTextField
        value={text}
        onValueChange={(next) => {
          draft.current = next;
        }}
        onFocusChanged={(focused) => {
          if (!focused) commit();
        }}
        keyboardOptions={{ keyboardType: 'number', imeAction: 'done' }}
        keyboardActions={{ onDone: commit }}
        singleLine
        maxLength={4}
        cursorColor={colors.primary}
        textStyle={{
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '700',
          color: colors.onSurface,
        }}
        modifiers={[width(36)]}
      />
      <IconButton onClick={() => step(1)} modifiers={[size(36, 36)]}>
        <Icon source={Icons.add} size={18} contentDescription={`Increase quantity of ${itemName}`} />
      </IconButton>
    </Row>
  );
}
