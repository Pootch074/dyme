// expo-print's web implementation just calls window.print() on the current
// page, ignoring the `html` option — so on web we print a dedicated window
// carrying the generated document instead.
export async function exportDtrDocument(html: string): Promise<void> {
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Let the new document lay out (fonts, table) before invoking print.
    setTimeout(() => printWindow.print(), 250);
    return;
  }

  // Pop-up blocked — fall back to downloading the document so the user can
  // open and print it themselves; this path never fails.
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'DTR.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
