import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Common = { label: string; name: string; error?: string; hint?: ReactNode; className?: string };

function Messages({ error, hint }: { error?: string; hint?: ReactNode }) {
  if (error) return <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>;
  if (hint) return <p className="mt-1.5 text-xs text-ink-500">{hint}</p>;
  return null;
}

export function Field({ label, name, error, hint, className, ...props }: Common & ComponentProps<"input">) {
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} name={name} aria-invalid={error ? true : undefined} className={cn("input", error && "input-error")} {...props} />
      <Messages error={error} hint={hint} />
    </div>
  );
}

export function TextareaField({ label, name, error, hint, className, ...props }: Common & ComponentProps<"textarea">) {
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea id={id} name={name} aria-invalid={error ? true : undefined} className={cn("input min-h-32 resize-y", error && "input-error")} {...props} />
      <Messages error={error} hint={hint} />
    </div>
  );
}

export function SelectField({ label, name, error, hint, className, children, ...props }: Common & ComponentProps<"select">) {
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} name={name} aria-invalid={error ? true : undefined} className={cn("input appearance-none bg-white", error && "input-error")} {...props}>
        {children}
      </select>
      <Messages error={error} hint={hint} />
    </div>
  );
}

export function CheckboxField({ label, name, error, className, ...props }: Omit<Common, "hint" | "label"> & { label: ReactNode } & ComponentProps<"input">) {
  const id = props.id ?? name;
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
        <input
          id={id}
          name={name}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-line accent-brand-700"
          {...props}
        />
        <span>{label}</span>
      </label>
      <Messages error={error} />
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
      {message}
    </div>
  );
}
