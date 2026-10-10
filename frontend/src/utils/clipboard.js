export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard access needs a secure context, which a plain http LAN address is not.
    return false;
  }
}
