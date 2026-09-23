import {
  Box,
  Column,
  FilledTonalButton,
  Icon,
  Image,
  Row,
  Spacer,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  fillMaxWidth,
  height,
  Shapes,
  weight,
  width,
} from '@expo/ui/jetpack-compose/modifiers';

import { Icons } from './icons';
import { useAppMaterialColors } from './theme';

import { usePhotoPicker } from '@/hooks/use-photo-picker';

type PhotoFieldProps = {
  /** URI of the image to preview, or null when there is none. */
  value: string | null;
  onChange: (uri: string | null) => void;
};

/** Entry photo: preview, take with the camera or upload from the device, replace or remove. */
export function PhotoField({ value, onChange }: PhotoFieldProps) {
  const colors = useAppMaterialColors();
  const { error, takePhoto, choosePhoto, clearError } = usePhotoPicker(onChange);

  return (
    <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
      {value ? (
        <Image
          source={{ uri: value }}
          contentScale="crop"
          contentDescription="Photo preview"
          modifiers={[fillMaxWidth(), height(180), clip(Shapes.RoundedCorner(12))]}
        />
      ) : (
        <Box
          contentAlignment="center"
          modifiers={[
            fillMaxWidth(),
            height(120),
            clip(Shapes.RoundedCorner(12)),
            background(colors.surfaceContainerHighest),
          ]}>
          <Column horizontalAlignment="center" verticalArrangement={{ spacedBy: 4 }}>
            <Icon source={Icons.image} tint={colors.onSurfaceVariant} />
            <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
              No photo
            </Text>
          </Column>
        </Box>
      )}

      <Row modifiers={[fillMaxWidth()]} horizontalArrangement={{ spacedBy: 8 }}>
        <FilledTonalButton onClick={takePhoto} modifiers={[weight(1)]}>
          <Icon source={Icons.photoCamera} size={18} />
          <Spacer modifiers={[width(8)]} />
          <Text>{value ? 'Retake' : 'Take photo'}</Text>
        </FilledTonalButton>
        <FilledTonalButton onClick={choosePhoto} modifiers={[weight(1)]}>
          <Icon source={Icons.upload} size={18} />
          <Spacer modifiers={[width(8)]} />
          <Text>{value ? 'Replace' : 'Upload'}</Text>
        </FilledTonalButton>
      </Row>

      {value ? (
        <TextButton
          onClick={() => {
            clearError();
            onChange(null);
          }}>
          <Icon source={Icons.delete} size={18} />
          <Spacer modifiers={[width(8)]} />
          <Text>Remove photo</Text>
        </TextButton>
      ) : null}

      {error ? (
        <Text color={colors.error} style={{ typography: 'bodySmall' }}>
          {error}
        </Text>
      ) : null}
    </Column>
  );
}
