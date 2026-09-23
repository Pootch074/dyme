import { Directory, File, Paths } from 'expo-file-system';

// Purchases store only the image's file name, not its full URI: on iOS the
// app's document directory path changes between installs/updates, so absolute
// file:// URIs saved today can point nowhere tomorrow.
const IMAGE_DIR_NAME = 'purchase-images';

function imageDirectory(): Directory {
  return new Directory(Paths.document, IMAGE_DIR_NAME);
}

/**
 * Copies a freshly picked/captured image (which lives in a temporary cache the
 * OS may purge) into permanent app storage. Returns the reference to save on
 * the purchase.
 */
export async function savePickedImage(pickedUri: string): Promise<string> {
  const directory = imageDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const extension = pickedUri.match(/\.(\w+)(?:\?.*)?$/)?.[1] ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
  await new File(pickedUri).copy(new File(directory, fileName));
  return fileName;
}

/** Turns a saved image reference into a URI that <Image> can display. */
export function resolveImageUri(imageRef: string): string {
  return new File(imageDirectory(), imageRef).uri;
}

/** Deletes a saved image; missing files are ignored. */
export function deleteSavedImage(imageRef: string): void {
  try {
    const file = new File(imageDirectory(), imageRef);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Failed to delete purchase image', error);
  }
}
