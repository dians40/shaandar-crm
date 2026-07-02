import LoginForm, { LoginBrand } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-corporate-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-corporate-border bg-corporate-surface p-8 shadow-card-md">
          <LoginBrand />
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-corporate-muted">
          &copy; {new Date().getFullYear()} Shaandar CRM. All rights reserved.
        </p>
      </div>
    </div>
  );
}
