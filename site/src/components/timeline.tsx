import { deployment } from "@/content/site";

export function DeploymentTimeline() {
  return (
    <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
      <span className="absolute left-4 top-3 hidden h-[calc(100%-1.5rem)] w-px bg-white/15 md:left-0 md:top-4 md:h-px md:w-full" aria-hidden />
      {deployment.map((step, i) => (
        <li key={step.week} className="relative pl-10 md:pl-0 md:pt-8">
          <span className="absolute left-2.5 top-1 flex size-3 items-center justify-center rounded-full bg-accent-400 ring-4 ring-brand-900 md:left-0 md:top-2.5" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-400">{step.week}</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">{step.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-white/70">{step.text}</p>
          <span className="absolute -top-1 right-0 font-display text-4xl font-semibold text-white/10 md:top-4">0{i + 1}</span>
        </li>
      ))}
    </ol>
  );
}
