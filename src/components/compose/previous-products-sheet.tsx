import {
  Button,
  Checkbox,
  Column,
  Icon,
  IconButton,
  LazyColumn,
  ListItem,
  ModalBottomSheet,
  Row,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  clip,
  fillMaxWidth,
  imePadding,
  padding,
  Shapes,
  toggleable,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';

import { Icons } from './icons';
import { ControlledTextField } from './text-field';
import { useAppMaterialColors, useSuccessColors } from './theme';

import {
  PREVIOUS_PRODUCTS_EMPTY,
  PREVIOUS_PRODUCTS_HINT,
  type PreviousProductsPicker,
} from '@/hooks/use-previous-products';
import { previousProductDetails } from '@/utils/shopping';

/**
 * "Previously purchased": tick products from earlier sessions (searchable
 * once there are many) and add them to this one in a single tap.
 */
export function PreviousProductsSheet({ picker }: { picker: PreviousProductsPicker }) {
  const colors = useAppMaterialColors();
  const success = useSuccessColors();

  return (
    <ModalBottomSheet onDismissRequest={picker.close} skipPartiallyExpanded>
      <Column
        modifiers={[fillMaxWidth(), imePadding(), padding(16, 0, 16, 16)]}
        verticalArrangement={{ spacedBy: 12 }}>
        <Row modifiers={[fillMaxWidth()]} verticalAlignment="center">
          <Text style={{ typography: 'headlineSmall' }} modifiers={[weight(1), padding(8, 0, 0, 0)]}>
            Previously purchased
          </Text>
          <IconButton onClick={picker.close}>
            <Icon source={Icons.close} contentDescription="Close" />
          </IconButton>
        </Row>

        {!picker.hasProducts ? (
          <Text
            color={colors.onSurfaceVariant}
            style={{ typography: 'bodyLarge', textAlign: 'center' }}
            modifiers={[fillMaxWidth(), padding(8, 24, 8, 24)]}>
            {PREVIOUS_PRODUCTS_EMPTY}
          </Text>
        ) : (
          <>
            <Text
              color={colors.onSurfaceVariant}
              style={{ typography: 'bodyMedium' }}
              modifiers={[padding(8, 0, 8, 0)]}>
              {PREVIOUS_PRODUCTS_HINT}
            </Text>
            {picker.showSearch ? (
              <ControlledTextField
                value={picker.query}
                onChangeText={picker.setQuery}
                label="Search products or stores"
                exact
              />
            ) : null}

            {/* Takes the room between the search and the Add button, and scrolls. */}
            <LazyColumn
              modifiers={[fillMaxWidth(), weight(1)]}
              verticalArrangement={{ spacedBy: 4 }}>
              {picker.products.length === 0 ? (
                <Text
                  color={colors.onSurfaceVariant}
                  style={{ typography: 'bodyMedium', textAlign: 'center' }}
                  modifiers={[fillMaxWidth(), padding(8, 24, 8, 24)]}>
                  {`No products match “${picker.query.trim()}”.`}
                </Text>
              ) : null}
              {picker.products.map((product) => {
                const selected = picker.isSelected(product.key);
                const inList = picker.isInList(product.key);
                return (
                  <ListItem
                    key={product.key}
                    colors={{
                      containerColor: selected ? colors.secondaryContainer : colors.surfaceContainer,
                    }}
                    modifiers={[
                      fillMaxWidth(),
                      clip(Shapes.RoundedCorner(12)),
                      toggleable(selected, () => picker.toggle(product.key), { role: 'checkbox' }),
                    ]}>
                    <ListItem.LeadingContent>
                      <Checkbox value={selected} />
                    </ListItem.LeadingContent>
                    <ListItem.HeadlineContent>
                      <Text maxLines={2} overflow="ellipsis" style={{ typography: 'titleMedium' }}>
                        {product.name}
                      </Text>
                    </ListItem.HeadlineContent>
                    <ListItem.SupportingContent>
                      <Column>
                        <Text maxLines={2} overflow="ellipsis">
                          {previousProductDetails(product)}
                        </Text>
                        {inList ? (
                          <Text color={success.accent} style={{ typography: 'labelMedium' }}>
                            In your list · adds 1 more
                          </Text>
                        ) : null}
                      </Column>
                    </ListItem.SupportingContent>
                  </ListItem>
                );
              })}
            </LazyColumn>

            <Button
              onClick={picker.addSelected}
              enabled={picker.selectedCount > 0}
              modifiers={[fillMaxWidth()]}>
              <Icon source={Icons.add} size={18} />
              <Spacer modifiers={[width(8)]} />
              <Text>{picker.addLabel}</Text>
            </Button>
          </>
        )}
      </Column>
    </ModalBottomSheet>
  );
}
