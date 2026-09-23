import { Feather, type FeatherIconName } from '@react-native-vector-icons/feather';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ImagePickerFieldProps = {
  /** URI of the image to preview, or null when there is none. */
  value: string | null;
  onChange: (uri: string | null) => void;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
};

/** Product photo input: take one with the camera or pick one from the device, preview it, replace or remove it. */
export function ImagePickerField({ value, onChange }: ImagePickerFieldProps) {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  const handleResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setError(null);
    try {
      // Browsers prompt for camera access themselves.
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera access is off. Allow it in your device settings to take a photo.');
          return;
        }
      }
      handleResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch (caught) {
      console.warn('Failed to take photo', caught);
      setError("Couldn't open the camera.");
    }
  };

  const choosePhoto = async () => {
    setError(null);
    try {
      handleResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
    } catch (caught) {
      console.warn('Failed to choose photo', caught);
      setError("Couldn't open your photos.");
    }
  };

  return (
    <View style={styles.container}>
      {value ? (
        <View>
          <Image
            source={{ uri: value }}
            style={styles.preview}
            contentFit="cover"
            accessibilityLabel="Product photo preview"
          />
          <Pressable
            onPress={() => {
              setError(null);
              onChange(null);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
            <Feather name="x" size={16} color="#ffffff" />
          </Pressable>
        </View>
      ) : (
        <ThemedView type="backgroundSelected" style={styles.placeholder}>
          <Feather name="image" size={24} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            No photo
          </ThemedText>
        </ThemedView>
      )}

      <View style={styles.actions}>
        <PickerButton
          icon="camera"
          label={value ? 'Retake' : 'Take photo'}
          onPress={takePhoto}
        />
        <PickerButton
          icon="upload"
          label={value ? 'Replace' : 'Upload'}
          onPress={choosePhoto}
        />
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

type PickerButtonProps = {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
};

function PickerButton({ icon, label, onPress }: PickerButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pickerButton,
        { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <Feather name={icon} size={16} color={theme.text} />
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.two,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    maxHeight: 140,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
