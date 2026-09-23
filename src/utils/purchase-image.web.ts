// On web the picker hands back a blob: URL that dies with the page, and there
// is no app file system, so the image itself is stored on the purchase as a
// data: URL. It's downscaled first to stay well inside localStorage's quota.
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load the selected image.'));
    image.src = uri;
  });
}

export async function savePickedImage(pickedUri: string): Promise<string> {
  const image = await loadImage(pickedUri);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not supported in this browser.');
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export function resolveImageUri(imageRef: string): string {
  return imageRef;
}

export function deleteSavedImage(_imageRef: string): void {
  // Nothing to clean up: the data URL goes away with the purchase record.
}
