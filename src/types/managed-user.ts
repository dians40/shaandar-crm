import type { UserRoleName } from "@/types/user-permissions";

export type ManagedUserRecord = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  role: UserRoleName;
  otpEnabled: boolean;
  createdAt: string;
};

export type ManagedUserFormState = {
  fullName: string;
  username: string;
  password: string;
  role: UserRoleName | "";
  otpEnabled: boolean;
};

export const EMPTY_MANAGED_USER_FORM: ManagedUserFormState = {
  fullName: "",
  username: "",
  password: "",
  role: "",
  otpEnabled: false,
};

export function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function validateManagedUserForm(form: ManagedUserFormState): string | null {
  if (!form.fullName.trim()) return "Full name is required.";
  if (!form.username.trim()) return "Username is required.";
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(form.username.trim())) {
    return "Username must be 3–32 characters (letters, numbers, . _ -).";
  }
  if (!form.password || form.password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!form.role) return "Select a role for this user.";
  return null;
}
