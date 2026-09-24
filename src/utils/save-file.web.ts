import type { ExportFile } from '@/utils/data-export';

export type SaveResult = 'saved' | 'shared' | 'cancelled';

/** Downloads a generated file through the browser (to its Downloads folder, or wherever it asks). */
export async function saveFile(file: ExportFile): Promise<SaveResult> {
  const blob = new Blob([file.data as BlobPart], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the data.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
