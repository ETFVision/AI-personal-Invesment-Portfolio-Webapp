export function parseAdminAllowlist(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isEmailAllowedByAllowlist(email: string, allowedEmails: string[]): boolean {
  if (allowedEmails.length === 0) return true;
  const normalizedEmail = email.trim().toLowerCase();
  return allowedEmails.some((allowed) => allowed.trim().toLowerCase() === normalizedEmail);
}

export function isAdminUser(
  userId: string,
  email: string | null,
  adminIds: string[],
  adminEmails: string[]
): boolean {
  const normalizedUserId = userId.trim();
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const normalizedAdminIds = adminIds.map((id) => id.trim()).filter(Boolean);
  const normalizedAdminEmails = adminEmails.map((adminEmail) => adminEmail.trim().toLowerCase()).filter(Boolean);

  if (normalizedAdminIds.length === 0 && normalizedAdminEmails.length === 0) {
    return false;
  }

  if (normalizedUserId && normalizedAdminIds.includes(normalizedUserId)) {
    return true;
  }

  return Boolean(normalizedEmail && normalizedAdminEmails.includes(normalizedEmail));
}
