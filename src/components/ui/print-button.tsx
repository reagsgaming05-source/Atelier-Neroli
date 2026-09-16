"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Imprimer / enregistrer en PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
