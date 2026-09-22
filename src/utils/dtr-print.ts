import * as Print from 'expo-print';

/** Opens the native print/export preview (Print, Save as PDF, Share, AirPrint, …) for the given HTML. */
export async function exportDtrDocument(html: string): Promise<void> {
  await Print.printAsync({ html, orientation: Print.Orientation.landscape });
}
