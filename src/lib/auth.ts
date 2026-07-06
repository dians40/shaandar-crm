export const AUTH_COOKIE = "shaandar-auth";

/** Demo credentials until Supabase auth is integrated */
export const DEMO_CREDENTIALS = {
  email: "admin@shaandar.com",
  password: "admin123",
} as const;

export function validateCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password
  );
}

/** Demo admin accepts username `admin` or the demo email address. */
export function validateDemoAdminLogin(username: string, password: string): boolean {
  const normalized = username.trim().toLowerCase();
  const acceptsIdentity =
    normalized === DEMO_CREDENTIALS.email ||
    normalized === "admin" ||
    normalized === "admin@shaandar.com";
  return acceptsIdentity && password === DEMO_CREDENTIALS.password;
}
