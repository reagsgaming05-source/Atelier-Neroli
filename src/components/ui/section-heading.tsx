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
      {eyebrow && <p className={cn("eyebrow", light && "text-blossom-400")}>{eyebrow}</p>}
      <h2 className={cn("mt-3 font-display text-4xl font-medium leading-[1.05] sm:text-5xl", light ? "text-cream-50" : "text-ink-900")}>
        {title}
      </h2>
      {text && <p className={cn("mt-5 text-[17px] leading-relaxed", light ? "text-cream-100/80" : "text-ink-500")}>{text}</p>}
    </div>
  );
}
