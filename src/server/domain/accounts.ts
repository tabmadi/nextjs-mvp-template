export const PASSWORD_MIN_CHARACTERS = 12;
export const PASSWORD_MAX_BYTES = 1024;
export const NAME_MAX = 100;
export const PERSONAL_ORGANIZATION_NAME = "Personal workspace";

export type RegistrationInput = { name: string; email: string; password: string };

export type RegistrationError = { field: keyof RegistrationInput; message: string };

export function normalizeEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  const parts = value.split("@");
  if (parts.length !== 2 || !/^[!-~]+$/.test(value)) {
    return null;
  }
  const [local, domain] = parts;
  return local && domain?.includes(".") ? value : null;
}

export function passwordError(password: string, email: string): string | null {
  if ([...password].length < PASSWORD_MIN_CHARACTERS) {
    return `Use at least ${PASSWORD_MIN_CHARACTERS} characters.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return `Use at most ${PASSWORD_MAX_BYTES} bytes.`;
  }
  if (resemblesEmail(password, email)) {
    return "Do not use your email in the password.";
  }
  return null;
}

function resemblesEmail(password: string, email: string): boolean {
  const lowered = password.toLowerCase();
  const local = email.split("@")[0] ?? "";
  return lowered.includes(email) || (local.length >= 4 && lowered.includes(local));
}

export function validateRegistration(input: RegistrationInput): {
  email: string | null;
  errors: RegistrationError[];
} {
  const errors: RegistrationError[] = [];
  const name = input.name.trim();
  if (name.length === 0 || name.length > NAME_MAX) {
    errors.push({ field: "name", message: `Enter a name of 1 to ${NAME_MAX} characters.` });
  }
  const email = normalizeEmail(input.email);
  if (!email) {
    errors.push({ field: "email", message: "Enter a valid email." });
  }
  const password = passwordError(input.password, email ?? "");
  if (password) {
    errors.push({ field: "password", message: password });
  }
  return { email, errors };
}
