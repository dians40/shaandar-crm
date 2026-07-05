import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-0", className)}>
      <label htmlFor={htmlFor} className="form-label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="form-hint">{hint}</p>
      ) : null}
    </div>
  );
}

type FormGridProps = {
  cols?: 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
};

export function FormGrid({ cols = 3, className, children }: FormGridProps) {
  const gridClass =
    cols === 2 ? "form-grid-2" : cols === 4 ? "form-grid-4" : "form-grid";

  return <div className={cn(gridClass, className)}>{children}</div>;
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextInput({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={props.required}
      hint={hint}
      error={error}
    >
      <input
        id={inputId}
        className={cn(
          "input-field",
          error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FormField>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function SelectInput({
  label,
  hint,
  error,
  options,
  placeholder = "Select an option",
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <FormField
      label={label}
      htmlFor={selectId}
      required={props.required}
      hint={hint}
      error={error}
    >
      <select
        id={selectId}
        className={cn(
          "select-field",
          error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
};

export function TextareaInput({
  label,
  hint,
  className,
  id,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <FormField label={label} htmlFor={textareaId} required={props.required} hint={hint}>
      <textarea
        id={textareaId}
        rows={props.rows ?? 3}
        className={cn("input-field resize-y", className)}
        {...props}
      />
    </FormField>
  );
}

type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ToggleInput({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex min-h-11 items-start justify-between gap-4 rounded-lg border border-corporate-border bg-corporate-bg px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-corporate-text sm:text-sm">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm text-corporate-muted sm:text-xs">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-corporate-brand" : "bg-corporate-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

type FileInputProps = {
  label: string;
  hint?: string;
  accept?: string;
  fileName?: string | null;
  onFileChange: (file: File | null) => void;
};

export function FileInputField({
  label,
  hint,
  accept = ".pdf,.jpg,.jpeg,.png",
  fileName,
  onFileChange,
}: FileInputProps) {
  return (
    <FormField label={label} hint={hint}>
      <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-corporate-border bg-corporate-bg px-4 py-5 transition-colors hover:border-corporate-brand/40 hover:bg-corporate-brand-light/40">
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <span className="text-sm font-medium text-corporate-brand">
          Choose file to upload
        </span>
        <span className="mt-1 text-xs text-corporate-muted">
          {fileName ?? "PDF, JPG, or PNG supported"}
        </span>
      </label>
    </FormField>
  );
}
