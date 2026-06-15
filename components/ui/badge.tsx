import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "neutral" | "accent";
}

export function Badge({ className, variant = "neutral", children, ...props }: BadgeProps) {
  const variants = {
    success: "bg-success/10 text-success border-success/20 uppercase tracking-widest",
    warning: "bg-warning/10 text-warning border-warning/20 uppercase tracking-widest",
    danger: "bg-danger/10 text-danger border-danger/20 uppercase tracking-widest",
    neutral: "bg-surface text-text-secondary border-border uppercase tracking-widest",
    accent: "bg-accent/10 text-accent border-accent/20 uppercase tracking-widest",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border",
        variants[variant],
        className
      )}
      {...props}
    >
      {/* Remove the dot for Sleek Interface style matching, it prefers solid background colors with bold text */}
      {children}
    </span>
  );
}
