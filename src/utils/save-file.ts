import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { ExportFile } from '@/utils/data-export';

/** How a save ended: written to a folder, handed to the share sheet, or called off by the user. */
export type SaveResult = 'saved' | 'shared' | 'cancelled';

/**
 * Lets the user keep a generated file. Android asks for a folder (e.g.
 * Downloads) and writes it there; iOS opens the share sheet, where "Save to
 * Files" keeps it (or it can be sent elsewhere).
 */
export async function saveFile(file: ExportFile): Promise<SaveResult> {
  if (Platform.OS === 'android') {
    let directory: Directory;
    try {
      directory = await Directory.pickDirectoryAsync();
    } catch {
      return 'cancelled'; // The folder picker was closed.
    }
    const target = directory.createFile(file.fileName, file.mimeType);
    target.write(file.data);
    return 'saved';
  }

  const target = new File(Paths.cache, file.fileName);
  if (target.exists) target.delete();
  target.create();
  target.write(file.data);
  await Sharing.shareAsync(target.uri, {
    mimeType: file.mimeType,
    UTI: file.uti,
    dialogTitle: `Save ${file.fileName}`,
  });
  return 'shared';
}
