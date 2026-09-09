/* Pure account-field validators shared by the settings server actions.
   No React/IO. Unit-tested with node:test. Floors mirror signup:
   name >= 2, password >= 8. */

export function validateDisplayName(name: string): string | null {
  if (name.trim().length < 2) return "Please enter your name.";
  return null;
}

export function validatePassword(
  password: string,
  confirm: string,
): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}
