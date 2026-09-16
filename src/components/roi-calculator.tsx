"use client";

import { useState } from "react";
import { roi } from "@/content/site";
import { formatCHF } from "@/lib/format";

/** Estimation des économies annuelles d'un établissement face à des licences individuelles. */
export function RoiCalculator() {
  const [staff, setStaff] = useState(roi.defaultStaff);
  const [licenceCost, setLicenceCost] = useState(roi.defaultLicenceCost / 100);

  const currentCents = Math.round(staff * licenceCost * 100);
  const savings = currentCents - roi.establishmentYearlyCents;
  const pct = currentCents > 0 ? Math.round((savings / currentCents) * 100) : 0;
  const perPerson = staff > 0 ? Math.round(roi.establishmentYearlyCents / staff) : 0;

  return (
    <div className="card grid gap-8 p-8 lg:grid-cols-[1fr_1fr] lg:p-10">
      <div className="space-y-7">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="roi-staff" className="label mb-0">
              Collaborateur·trice·s de l'établissement
            </label>
            <span className="font-display text-2xl font-semibold tabular-nums text-ink-900">{staff}</span>
          </div>
          <input
            id="roi-staff"
            type="range"
            min={5}
            max={300}
            step={5}
            value={staff}
            onChange={(e) => setStaff(Number(e.target.value))}
            className="mt-3 w-full accent-brand-700"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-400">
            <span>5</span>
            <span>300</span>
          </div>
        </div>
        <div>
          <label htmlFor="roi-cost" className="label">
            Coût annuel actuel par licence individuelle
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">CHF</span>
            <input
              id="roi-cost"
              type="number"
              min={0}
              step={10}
              value={licenceCost}
              onChange={(e) => setLicenceCost(Math.max(0, Number(e.target.value)))}
              className="input pl-14 tabular-nums"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-500">Par exemple le prix public d'une licence Acrobat Pro par personne et par an.</p>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-2xl bg-brand-900 p-7 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-400">Économie annuelle estimée</p>
          <p className="mt-3 font-display text-[2.75rem] font-semibold leading-none tabular-nums">{savings > 0 ? formatCHF(savings) : "CHF 0.–"}</p>
          <p className="mt-2 text-sm text-white/70">{savings > 0 ? `soit ${pct} % de moins qu'aujourd'hui` : "Une licence Établissement revient au même prix ou moins dès quelques collaborateur·trice·s."}</p>
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 text-sm">
          <div>
            <dt className="text-white/60">Aujourd'hui</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatCHF(currentCents)} / an</dd>
          </div>
          <div>
            <dt className="text-white/60">Avec Blonay PDF</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatCHF(roi.establishmentYearlyCents)} / an</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-white/60">Par personne et par an</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatCHF(perPerson)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
