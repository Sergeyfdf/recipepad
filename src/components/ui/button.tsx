import * as React from "react";

type Variant = "golden" | "goldenOutline";
type Size = "lg" | "md" | "sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const cls = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "golden", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold rounded-xl transition select-none active:translate-y-[1px] focus:outline-none";
    const sizes: Record<Size, string> = { sm: "h-9 px-4 text-sm", md: "h-10 px-4 text-base", lg: "h-12 px-6 text-lg" };
    const variants: Record<Variant, string> = {
      golden: "text-black bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_6px_24px_rgba(245,158,11,.35)] hover:brightness-105",
      goldenOutline: "border border-amber-400/70 text-amber-300 hover:bg-amber-500/10",
    };
    return <button ref={ref} className={cls(base, sizes[size], variants[variant], className)} {...props} />;
  }
);
Button.displayName = "Button";
