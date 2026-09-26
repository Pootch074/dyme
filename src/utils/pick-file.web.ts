import * as DocumentPicker from 'expo-document-picker';

export type PickedFile = {
  name: string;
  mimeType: string | null;
  /** In bytes, when known. */
  size: number | null;
  readText: () => Promise<string>;
};

/** Lets the user choose a file through the browser, or null when they back out. */
export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', base64: false });
  if (result.canceled) return null;
  const [asset] = result.assets;
  return {
    name: asset.name,
    mimeType: asset.mimeType ?? null,
    size: asset.size ?? asset.file?.size ?? null,
    readText: async () => (asset.file ? asset.file.text() : (await fetch(asset.uri)).text()),
  };
}
