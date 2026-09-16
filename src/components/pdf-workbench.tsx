"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { Check, Download, FilePlus2, Layers, Loader2, RotateCw, Sparkles, Trash2, Upload, X } from "lucide-react";
import { recordUsageAction } from "@/lib/actions/usage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type LoadedFile = { id: string; name: string; bytes: Uint8Array; size: number; pageCount: number; thumbs: string[] };
type PageRef = { id: string; fileId: string; index: number; rotation: number; selected: boolean };
type Result = { url: string; name: string; pages: number; size: number };

const A4: [number, number] = [595.28, 841.89];

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

async function renderThumbs(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  const thumbs: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 0.32 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    thumbs.push(canvas.toDataURL("image/jpeg", 0.82));
  }
  const count = doc.numPages;
  await task.destroy();
  return { count, thumbs };
}

/** Document d'exemple généré dans le navigateur (aucun téléchargement). */
async function makeSample(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const sections = [
    { title: "Autorisation de sortie - camp de ski 8P", lines: ["Madame, Monsieur,", "", "Les classes de 8P participeront au camp de ski du 9 au 13 mars 2026 aux Diablerets.", "Nous vous remercions de retourner ce document signe au secretariat", "avant le 15 fevrier 2026.", "", "Eleve : Nora Favre         Classe : 8P/2         N AVS : 756.1234.5678.90", "", "Le camp est encadre par quatre enseignants et deux moniteurs J+S.", "Les frais de participation s'elevent a CHF 180.- par eleve."] },
    { title: "Informations pratiques", lines: ["Depart : lundi 9 mars, 7h30, parking de l'ecole.", "Retour : vendredi 13 mars, vers 16h30.", "", "Hebergement : chalet Les Mazots, dortoirs de 6 a 8 lits.", "Repas : pension complete, regimes alimentaires a signaler au secretariat.", "", "Contact durant le camp : +41 21 943 00 00 (secretariat)."] },
    { title: "Liste du materiel", lines: ["- Skis ou snowboard, batons, casque obligatoire", "- Veste et pantalon de ski, gants, bonnet, lunettes", "- Creme solaire, gourde, sac a dos", "- Pyjama, affaires de toilette, linge", "- Carte d'assurance maladie (copie)", "", "Le materiel de ski peut etre loue sur place : CHF 60.- pour la semaine."] },
    { title: "Regles de vie", lines: ["Les eleves respectent les consignes des adultes en tout temps.", "Les telephones sont ranges pendant les activites et la nuit.", "Toute atteinte au materiel ou aux personnes entraine un retour anticipe,", "aux frais des parents.", "", "Merci d'en discuter avec votre enfant avant le depart."] },
    { title: "Coupon-reponse", lines: ["Je soussigne(e) ______________________________, representant(e) legal(e)", "de l'eleve ______________________________, classe ______,", "", "[ ] autorise mon enfant a participer au camp de ski.", "[ ] n'autorise pas mon enfant a participer au camp de ski.", "", "Lieu et date : ______________________", "", "Signature : ______________________"] },
  ];
  sections.forEach((s, i) => {
    const page = doc.addPage(A4);
    page.drawRectangle({ x: 0, y: A4[1] - 44, width: A4[0], height: 44, color: rgb(0.11, 0.23, 0.75) });
    page.drawText("Etablissement primaire et secondaire de Blonay - Saint-Legier", { x: 40, y: A4[1] - 28, size: 11, font: bold, color: rgb(1, 1, 1) });
    page.drawText(s.title, { x: 40, y: 740, size: 20, font: bold, color: rgb(0.07, 0.08, 0.1) });
    page.drawLine({ start: { x: 40, y: 726 }, end: { x: 300, y: 726 }, thickness: 2, color: rgb(1, 0.62, 0.31) });
    s.lines.forEach((line, j) => page.drawText(line, { x: 40, y: 696 - j * 18, size: 11, font, color: rgb(0.22, 0.24, 0.27) }));
    page.drawText(`Page ${i + 1} / ${sections.length}`, { x: A4[0] - 100, y: 28, size: 9, font, color: rgb(0.55, 0.57, 0.6) });
  });
  return doc.save();
}

export function PdfWorkbench({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [pages, setPages] = useState<PageRef[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watermark, setWatermark] = useState("");
  const [numbering, setNumbering] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sources = useRef(new Map<string, Promise<PDFDocument>>());

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const addBytes = useCallback(async (name: string, bytes: Uint8Array) => {
    const { count, thumbs } = await renderThumbs(bytes);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setFiles((f) => [...f, { id, name, bytes, size: bytes.byteLength, pageCount: count, thumbs }]);
    setPages((p) => [...p, ...thumbs.map((_, index) => ({ id: `${id}:${index}`, fileId: id, index, rotation: 0, selected: false }))]);
  }, []);

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      setError(null);
      setResult(null);
      setBusy("Lecture des fichiers…");
      try {
        for (const file of Array.from(list)) {
          if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") throw new Error(`« ${file.name} » n'est pas un PDF.`);
          if (file.size > 50 * 1024 * 1024) throw new Error(`« ${file.name} » dépasse 50 Mo (limite de la démo).`);
          await addBytes(file.name, new Uint8Array(await file.arrayBuffer()));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible de lire ce fichier.");
      } finally {
        setBusy(null);
      }
    },
    [addBytes],
  );

  async function loadSample() {
    setError(null);
    setResult(null);
    setBusy("Génération du document d'exemple…");
    try {
      await addBytes("Autorisation_camp_ski_8P.pdf", await makeSample());
    } finally {
      setBusy(null);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
  }

  function getSource(fileId: string) {
    let p = sources.current.get(fileId);
    if (!p) {
      const f = files.find((x) => x.id === fileId);
      if (!f) throw new Error("Fichier introuvable.");
      p = PDFDocument.load(f.bytes);
      sources.current.set(fileId, p);
    }
    return p;
  }

  async function build(selection: PageRef[], label: string) {
    if (selection.length === 0) {
      setError("Sélectionnez au moins une page.");
      return;
    }
    setError(null);
    setBusy(label);
    try {
      const out = await PDFDocument.create();
      for (const p of selection) {
        const src = await getSource(p.fileId);
        const [copied] = await out.copyPages(src, [p.index]);
        copied.setRotation(degrees((copied.getRotation().angle + p.rotation) % 360));
        out.addPage(copied);
      }
      if (watermark.trim()) {
        const font = await out.embedFont(StandardFonts.HelveticaBold);
        for (const page of out.getPages()) {
          const { width, height } = page.getSize();
          const size = Math.min(64, (width * 1.1) / Math.max(6, watermark.trim().length));
          page.drawText(watermark.trim(), { x: width * 0.1, y: height * 0.3, size, font, color: rgb(0.78, 0.36, 0.11), opacity: 0.22, rotate: degrees(32) });
        }
      }
      if (numbering) {
        const font = await out.embedFont(StandardFonts.Helvetica);
        const all = out.getPages();
        all.forEach((page, i) => {
          const { width } = page.getSize();
          page.drawText(`${i + 1} / ${all.length}`, { x: width / 2 - 14, y: 22, size: 10, font, color: rgb(0.4, 0.42, 0.46) });
        });
      }
      out.setProducer("Blonay PDF — démo");
      out.setCreator("Blonay PDF");
      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      if (result) URL.revokeObjectURL(result.url);
      const name = files.length > 1 ? "Document_fusionne.pdf" : files[0]?.name.replace(/\.pdf$/i, "") + "_Blonay.pdf";
      setResult({ url: URL.createObjectURL(blob), name, pages: selection.length, size: blob.size });
      if (isLoggedIn) {
        const tool = watermark.trim() ? "protect" : files.length > 1 ? "merge" : "organize";
        void recordUsageAction(tool, selection.length);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'opération a échoué.");
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setFiles([]);
    setPages([]);
    setResult(null);
    setError(null);
    setWatermark("");
    setNumbering(false);
    sources.current.clear();
  }

  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <div className="space-y-6">
      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-[1.5rem] border-2 border-dashed p-8 text-center transition sm:p-10",
          dragging ? "border-brand-500 bg-brand-50" : "border-line bg-white",
        )}
      >
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Upload className="size-5" aria-hidden />
        </span>
        <p className="mt-4 font-display text-xl font-semibold text-ink-900">Déposez un ou plusieurs PDF ici</p>
        <p className="mt-1 text-sm text-ink-500">Tout se passe dans votre navigateur : aucun fichier n'est envoyé sur un serveur.</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(busy)}>
            <FilePlus2 className="size-4" aria-hidden />
            Choisir des fichiers
          </Button>
          <Button type="button" variant="secondary" onClick={loadSample} disabled={Boolean(busy)}>
            <Sparkles className="size-4" aria-hidden />
            Charger un exemple
          </Button>
        </div>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </div>

      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="card overflow-hidden">
          {/* Barre d'outils */}
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-canvas-50 px-5 py-4">
            <p className="text-sm text-ink-700">
              <strong className="text-ink-900">{files.length}</strong> {files.length > 1 ? "fichiers" : "fichier"} · <strong className="text-ink-900">{pages.length}</strong> pages · {formatBytes(totalSize)}
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
                <span className="text-ink-500">Filigrane</span>
                <input value={watermark} onChange={(e) => setWatermark(e.target.value)} placeholder="CONFIDENTIEL" className="w-32 bg-transparent text-ink-900 outline-none placeholder:text-ink-400" />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink-700">
                <input type="checkbox" checked={numbering} onChange={(e) => setNumbering(e.target.checked)} className="accent-brand-700" />
                Numéroter
              </label>
              <button type="button" onClick={() => setPages((p) => p.map((x) => ({ ...x, selected: selectedCount !== p.length })))} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink-700 hover:border-ink-900/40">
                {selectedCount === pages.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-500 hover:text-danger">
                <X className="size-3.5" aria-hidden />
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Pages */}
          <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {pages.map((p, i) => {
              const file = files.find((f) => f.id === p.fileId)!;
              return (
                <li key={p.id} className={cn("group relative rounded-xl border bg-canvas-50 p-2 transition", p.selected ? "border-brand-500 ring-2 ring-brand-500/20" : "border-line")}>
                  <label className="absolute left-3 top-3 z-10 flex size-6 cursor-pointer items-center justify-center rounded-md bg-white shadow-card">
                    <input type="checkbox" checked={p.selected} onChange={() => setPages((all) => all.map((x) => (x.id === p.id ? { ...x, selected: !x.selected } : x)))} className="accent-brand-700" aria-label={`Sélectionner la page ${i + 1}`} />
                  </label>
                  <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-white shadow-card">
                    <img src={file.thumbs[p.index]} alt={`${file.name}, page ${p.index + 1}`} className="max-h-full max-w-full transition-transform" style={{ transform: `rotate(${p.rotation}deg)` }} />
                  </div>
                  <p className="mt-2 truncate text-center text-[0.68rem] text-ink-500" title={file.name}>
                    {file.name} · p. {p.index + 1}
                  </p>
                  <div className="mt-1.5 flex justify-center gap-1">
                    <button type="button" onClick={() => setPages((all) => all.map((x) => (x.id === p.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x)))} className="rounded-md p-1.5 text-ink-500 hover:bg-white hover:text-brand-700" aria-label="Pivoter">
                      <RotateCw className="size-3.5" aria-hidden />
                    </button>
                    <button type="button" disabled={i === 0} onClick={() => setPages((all) => move(all, i, i - 1))} className="rounded-md px-1.5 py-1 text-sm text-ink-500 hover:bg-white hover:text-brand-700 disabled:opacity-30" aria-label="Déplacer avant">
                      ←
                    </button>
                    <button type="button" disabled={i === pages.length - 1} onClick={() => setPages((all) => move(all, i, i + 1))} className="rounded-md px-1.5 py-1 text-sm text-ink-500 hover:bg-white hover:text-brand-700 disabled:opacity-30" aria-label="Déplacer après">
                      →
                    </button>
                    <button type="button" onClick={() => setPages((all) => all.filter((x) => x.id !== p.id))} className="rounded-md p-1.5 text-ink-500 hover:bg-white hover:text-danger" aria-label="Supprimer la page">
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Actions */}
          <div className="flex flex-col gap-4 border-t border-line bg-canvas-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => build(pages, files.length > 1 ? "Fusion en cours…" : "Assemblage en cours…")} disabled={Boolean(busy) || pages.length === 0}>
                <Layers className="size-4" aria-hidden />
                {files.length > 1 ? "Fusionner en un PDF" : "Générer le PDF"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => build(pages.filter((p) => p.selected), "Extraction en cours…")} disabled={Boolean(busy) || selectedCount === 0}>
                Extraire la sélection ({selectedCount})
              </Button>
            </div>
            {result && (
              <div className="flex items-center gap-3 rounded-2xl bg-success-50 px-4 py-2.5 text-sm text-success">
                <Check className="size-4" strokeWidth={3} aria-hidden />
                <span>
                  Prêt · {result.pages} pages · {formatBytes(result.size)}
                </span>
                <a href={result.url} download={result.name} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800">
                  <Download className="size-3.5" aria-hidden />
                  Télécharger
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
