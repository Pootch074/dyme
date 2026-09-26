import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export type PickedFile = {
  name: string;
  mimeType: string | null;
  /** In bytes, when known. */
  size: number | null;
  readText: () => Promise<string>;
};

/**
 * Lets the user choose a file, or null when they back out. Any file can be
 * chosen, so a wrong kind gets a clear message from the importer rather than
 * just being greyed out.
 */
export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    // Android: read the picked content:// file directly. A cached copy lands
    // outside the app's own folders in Expo Go, where reading it is refused.
    copyToCacheDirectory: Platform.OS !== 'android',
  });
  if (result.canceled) return null;
  const [asset] = result.assets;
  const file = new File(asset.uri);
  return {
    name: asset.name,
    mimeType: asset.mimeType ?? null,
    size: asset.size ?? file.size ?? null,
    readText: () => file.text(),
  };
}
