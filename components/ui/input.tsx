import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: ReactNode;
  error?: string;
}

export default function Input({
  label,
  leftIcon,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-widest text-slate-400"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 flex shrink-0 items-center text-[color:var(--color-outline)]">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            "w-full rounded-md border border-[color:var(--color-outline-variant)] bg-white py-2.5 text-sm text-[color:var(--color-on-surface)] placeholder:text-[color:var(--color-outline)] transition focus:border-[color:var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-slate-200",
            leftIcon ? "pl-9 pr-3" : "px-3",
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
              : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
