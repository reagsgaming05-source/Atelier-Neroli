import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "left",
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className={cn("eyebrow", light && "text-accent-400")}>{eyebrow}</p>}
      <h2 className={cn("mt-3 font-display text-[2.25rem] font-semibold leading-[1.05] sm:text-[2.75rem]", light ? "text-white" : "text-ink-900")}>{title}</h2>
      {text && <p className={cn("mt-5 text-[17px] leading-relaxed", light ? "text-white/75" : "text-ink-500")}>{text}</p>}
    </div>
  );
}
