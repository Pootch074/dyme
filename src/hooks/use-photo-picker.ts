import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform } from 'react-native';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
};

/** Camera / library actions for a photo field; `onPicked` receives the picked image's URI. */
export function usePhotoPicker(onPicked: (uri: string) => void) {
  const [error, setError] = useState<string | null>(null);

  const handleResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]) {
      onPicked(result.assets[0].uri);
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

  const clearError = () => setError(null);

  return { error, takePhoto, choosePhoto, clearError };
}
