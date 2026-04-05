import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "navy";
type Size = "sm" | "md" | "lg" | "pill";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-[#f0ca52] bg-primary text-[color:var(--color-on-primary)] hover:bg-primary-container hover:text-[color:var(--color-on-primary)] active:bg-[#c79300]",
  secondary:
    "border border-[color:var(--color-outline-variant)] bg-white text-[color:var(--color-on-surface)] hover:bg-[color:var(--color-primary-fixed)] active:bg-[#fff0b0]",
  ghost:
    "border border-transparent bg-transparent text-[color:var(--color-on-surface-variant)] hover:bg-[color:var(--color-primary-fixed)] active:bg-[#fff0b0]",
  navy:
    "border border-[#f0ca52] bg-primary text-[color:var(--color-on-primary)] hover:bg-primary-container active:scale-[0.98] transition-all",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
  pill: "px-8 py-4 text-base rounded-full font-headline font-bold",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-fixed-dim)]",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
