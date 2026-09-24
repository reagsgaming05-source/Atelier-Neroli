import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-[17px] font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown className="size-5 shrink-0 text-ink-400 transition group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-500">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
