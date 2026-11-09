/**
 * SHA-256 of a string (UTF-8), as lowercase hex. Used to record which wording a user accepted:
 * hash the raw `actum_body` exactly as returned by the Web API (not the sanitized HTML), so the
 * value can be reproduced from the Dataverse record with any SHA-256 tool.
 */
export const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};
