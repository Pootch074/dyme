import {
  Box,
  Button,
  Column,
  FilledTonalIconButton,
  Icon,
  IconButton,
  ModalBottomSheet,
  Row,
  Shape,
  Spacer,
  Surface,
  Text,
  type TextFieldRef,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  height,
  imePadding,
  padding,
  size,
  verticalScroll,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { useRef } from 'react';

import { Icons } from './icons';
import { NumberPad } from './number-pad';
import { ControlledTextField } from './text-field';
import { useAppMaterialColors } from './theme';

import type { useShoppingDetails } from '@/hooks/use-shopping-details';
import { formatTypedPrice } from '@/utils/keypad';
import { formatCentavos } from '@/utils/money';

type ItemEntrySheetProps = {
  details: ReturnType<typeof useShoppingDetails>;
};

const FIELD_SHAPE = Shape.RoundedCorner({
  cornerRadii: { topStart: 12, topEnd: 12, bottomStart: 12, bottomEnd: 12 },
});

/**
 * Add / Edit Item: price first on an on-screen number pad, quantity with −/+,
 * then the product name and Save. The number pad types into whichever of
 * price or quantity is highlighted.
 */
export function ItemEntrySheet({ details }: ItemEntrySheetProps) {
  const colors = useAppMaterialColors();
  const nameRef = useRef<TextFieldRef>(null);
  const { activeField } = details;
  const quantityNumber = /^\d+$/.test(details.quantity) ? Number(details.quantity) : 0;

  // Tapping price or quantity takes focus back from the name field, so the
  // system keyboard closes and the number pad takes over.
  const activate = (field: 'price' | 'quantity') => {
    void nameRef.current?.blur();
    details.setActiveField(field);
  };

  const outline = (active: boolean, error?: string) => ({
    width: 2,
    color: error ? colors.error : active ? colors.primary : colors.outlineVariant,
  });

  return (
    // Only Save, the close button or Back dismiss it: a stray tap or drag while
    // using the number pad shouldn't throw away what was entered.
    <ModalBottomSheet
      onDismissRequest={details.closeItemDialog}
      skipPartiallyExpanded
      sheetGesturesEnabled={false}
      showDragHandle={false}
      properties={{ shouldDismissOnClickOutside: false }}>
      <Column
        modifiers={[fillMaxWidth(), verticalScroll(), imePadding(), padding(20, 16, 20, 20)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
          {/* Balances the close button so the title sits in the true center. */}
          <Spacer modifiers={[width(48)]} />
          <Text style={{ typography: 'headlineSmall', textAlign: 'center' }} modifiers={[weight(1)]}>
            {details.itemDialogTitle}
          </Text>
          <IconButton onClick={details.closeItemDialog}>
            <Icon source={Icons.close} contentDescription="Close" />
          </IconButton>
        </Row>

        <Column
          modifiers={[fillMaxWidth()]}
          horizontalAlignment="center"
          verticalArrangement={{ spacedBy: 8 }}>
          <Text color={colors.onSurfaceVariant} style={{ typography: 'labelLarge' }}>
            Quantity
          </Text>
          <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 16 }}>
            <FilledTonalIconButton
              onClick={() => details.stepQuantity(-1)}
              enabled={quantityNumber > details.minQuantity}
              modifiers={[size(48, 48)]}>
              <Icon source={Icons.remove} contentDescription="Decrease quantity" />
            </FilledTonalIconButton>
            <Surface
              onClick={() => activate('quantity')}
              shape={FIELD_SHAPE}
              border={outline(activeField === 'quantity', details.itemErrors.quantity)}
              modifiers={[width(80), height(48)]}>
              <Box contentAlignment="center" modifiers={[width(80), height(48)]}>
                <Text style={{ typography: 'titleLarge', fontWeight: '700' }}>
                  {details.quantity || ' '}
                </Text>
              </Box>
            </Surface>
            <FilledTonalIconButton
              onClick={() => details.stepQuantity(1)}
              modifiers={[size(48, 48)]}>
              <Icon source={Icons.add} contentDescription="Increase quantity" />
            </FilledTonalIconButton>
          </Row>
          {details.itemErrors.quantity ? (
            <Text color={colors.error} style={{ typography: 'bodySmall' }}>
              {details.itemErrors.quantity}
            </Text>
          ) : null}
        </Column>

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 4 }}>
          <Surface
            onClick={() => activate('price')}
            shape={FIELD_SHAPE}
            border={outline(activeField === 'price', details.itemErrors.price)}
            modifiers={[fillMaxWidth()]}>
            <Row
              modifiers={[fillMaxWidth(), padding(16, 8, 16, 8)]}
              horizontalArrangement="end"
              verticalAlignment="center">
              <Text color={colors.onSurfaceVariant} style={{ typography: 'headlineSmall' }}>
                ₱
              </Text>
              <Text
                color={details.price ? colors.onSurface : colors.onSurfaceVariant}
                maxLines={1}
                style={{ typography: 'displaySmall', fontWeight: '700' }}
                modifiers={[padding(8, 0, 0, 0)]}>
                {formatTypedPrice(details.price)}
              </Text>
            </Row>
          </Surface>
          <Row modifiers={[fillMaxWidth()]}>
            <Text
              color={colors.error}
              style={{ typography: 'bodySmall' }}
              modifiers={[weight(1)]}>
              {details.itemErrors.price ?? ''}
            </Text>
            {details.liveItemTotal !== null && quantityNumber > 1 ? (
              <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
                {`Item total ${formatCentavos(details.liveItemTotal)}`}
              </Text>
            ) : null}
          </Row>
        </Column>

        <Row
          modifiers={[fillMaxWidth()]}
          horizontalArrangement={{ spacedBy: 8 }}
          verticalAlignment="center">
          <ControlledTextField
            fieldRef={nameRef}
            value={details.name}
            onChangeText={details.setName}
            onFocusChange={(focused) => {
              if (focused) details.setActiveField('name');
            }}
            label="Product name"
            isError={Boolean(details.itemErrors.name)}
            supportingText={details.itemErrors.name}
            modifiers={[weight(1)]}
          />
          <Button onClick={details.saveItem} modifiers={[height(56)]}>
            <Text>Save</Text>
          </Button>
        </Row>

        {/* The system keyboard takes this space while the name is being typed. */}
        {activeField !== 'name' ? (
          <NumberPad
            target={activeField === 'quantity' ? 'quantity' : 'price'}
            onKey={details.pressKey}
          />
        ) : null}
      </Column>
    </ModalBottomSheet>
  );
}
