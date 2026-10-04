// Hermes (React Native) and browsers both have btoa/atob. Large inputs are
// converted in slices so String.fromCharCode never gets too many arguments.
const SLICE = 0x8000;

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += SLICE) {
    binary += String.fromCharCode(...bytes.subarray(start, start + SLICE));
  }
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
