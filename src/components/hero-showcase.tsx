"use client";

import { useEffect, useState } from "react";
import { AppMock, scenarios, type MockScenario } from "@/components/app-mock";
import { cn } from "@/lib/cn";

/** Aperçu de l'éditeur avec onglets, qui alterne les scénarios tant que l'utilisateur n'interagit pas. */
export function HeroShowcase() {
  const [scenario, setScenario] = useState<MockScenario>("sign");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setScenario((s) => {
        const i = scenarios.findIndex((x) => x.key === s);
        return scenarios[(i + 1) % scenarios.length].key;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div className="w-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div role="tablist" aria-label="Scénarios" className="mb-4 flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <button
            key={s.key}
            role="tab"
            type="button"
            aria-selected={scenario === s.key}
            onClick={() => {
              setScenario(s.key);
              setPaused(true);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              scenario === s.key ? "bg-brand-700 text-white shadow-card" : "bg-white text-ink-500 ring-1 ring-line hover:text-ink-900",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <AppMock scenario={scenario} />
    </div>
  );
}
