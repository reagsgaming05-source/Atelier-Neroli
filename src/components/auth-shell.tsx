import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo";

export function AuthShell({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="container-x flex justify-center py-16 lg:py-24">
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-10">
          <LogoMark className="size-9 text-brand-800" />
          <h1 className="mt-6 font-display text-[2.25rem] font-semibold text-ink-900">{title}</h1>
          <p className="mt-2 text-[15px] text-ink-500">{text}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}
