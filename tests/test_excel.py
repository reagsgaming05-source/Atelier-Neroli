import datetime as dt
import io

import openpyxl

from decompte.excel import build_workbook, output_filename
from decompte.models import DecompteRow, Dossier, Effectifs


def make(type_activite, rows):
    return Dossier(id="t", filename="ANS100325.pdf", numero="ANS100325", type_activite=type_activite, classe="5P/1", enseignant="C. Ansermet",
                   date_debut="10.03.2025", date_fin="10.03.2025", effectifs=Effectifs(eleves=77, enseignants_dgeo=6, autres=2), rows=rows)


def load(data):
    return openpyxl.load_workbook(io.BytesIO(data)).worksheets[0]


def test_course_one_row_removes_unused_template_rows():
    d = make("course", [DecompteRow(rubrique="Transport", libelle="pces 1-4 (6*2.80)", mode="direct", cout_direct=33.6)])
    ws = load(build_workbook(d, today=dt.date(2025, 4, 25)))
    assert ws["C5"].value == "5P/1" and ws["C6"].value == "C. Ansermet" and ws["C7"].value == "Course d'école"
    assert ws["C8"].value == dt.datetime(2025, 3, 10) and ws["J8"].value == "ANS100325"
    assert (ws["D11"].value, ws["E11"].value, ws["F11"].value, ws["G11"].value) == (2, 77, 6, "=SUM(D11:F11)")
    assert ws["B12"].value == "Transport" and ws["C12"].value == "pces 1-4 (6*2.80)"
    assert ws["H12"].value is None and ws["I12"].value == 33.6 and ws["J12"].value == "=I12"  # ligne saisie à la main : montant
    assert "Total du remboursement" in ws["B13"].value
    assert ws["J13"].value == "=MROUND(SUM(J12:J12),0.05)"
    assert "B13:I13" in {str(r) for r in ws.merged_cells.ranges}
    assert ws["G16"].value == "Date :" and ws["I16"].value == dt.datetime(2025, 4, 25)
    assert "I16:J16" in {str(r) for r in ws.merged_cells.ranges}


def test_course_prorata_row_keeps_formula():
    d = make("course", [DecompteRow(rubrique="Transport", libelle="pce 1 (1*5.50)", mode="direct", cout_direct=5.5),
                        DecompteRow(rubrique="Activité", libelle="pce 2", mode="prorata", cout_total=300.0)])
    ws = load(build_workbook(d))
    assert ws["H13"].value == 300.0 and ws["I13"].value == "=IFERROR(H13/$G$11*$F$11,0)" and ws["J13"].value == "=I13"
    assert ws["J14"].value == "=MROUND(SUM(J12:J13),0.05)"


def test_more_rows_than_template_inserts_styled_rows():
    rows = [DecompteRow(rubrique="Transport", libelle=f"pce {i}", mode="prorata", cout_total=10.0 * i) for i in range(1, 6)]
    d = make("course", rows)
    ws = load(build_workbook(d))
    for i in range(5):
        r = 12 + i
        assert ws.cell(r, 2).value == "Transport" and ws.cell(r, 9).value == f"=IFERROR(H{r}/$G$11*$F$11,0)"
        assert ws.cell(r, 3).border.left.style is not None  # style copié
    assert ws["J17"].value == "=MROUND(SUM(J12:J16),0.05)"
    assert "B17:I17" in {str(r) for r in ws.merged_cells.ranges}
    assert ws.print_area.endswith("$K$21")


def test_camp_template_and_date_range():
    d = make("camp", [DecompteRow(rubrique="Hébergement", libelle="pce 1", mode="prorata", cout_total=2000.0)])
    d.date_fin = "14.03.2025"
    d.activite = "Camp de ski"
    ws = load(build_workbook(d))
    assert ws["C7"].value == "Camp – Camp de ski" and ws["C8"].value == "10.03.2025 – 14.03.2025"
    assert ws["B12"].value == "Hébergement" and ws["J13"].value == "=MROUND(SUM(J12:J12),0.05)"


def test_signature_date_from_dossier():
    d = make("course", [DecompteRow(rubrique="Transport", libelle="pce 1", mode="direct", cout_direct=5.5)])
    d.date_decompte = "16.12.2025"
    ws = load(build_workbook(d, today=dt.date(2026, 1, 1)))
    assert ws["I16"].value == dt.datetime(2025, 12, 16)
    d.date_decompte = "pas une date"
    ws = load(build_workbook(d, today=dt.date(2026, 1, 1)))
    assert ws["I16"].value == dt.datetime(2026, 1, 1)


def test_output_filename():
    assert output_filename(make("course", [])) == "ANS100325.xlsx"


def test_direct_row_writes_ticket_total_and_formula():
    d = make("course", [DecompteRow(rubrique="Transport", libelle="pces 1-4 (6*2.80 + 6*4.20 + 2*2.10)", mode="direct", cout_total=339.2, cout_direct=46.2, formule="6*2.80 + 6*4.20 + 2*2.10"),
                        DecompteRow(rubrique="Activité", libelle="pce 5", mode="prorata", cout_total=300.0)])
    ws = load(build_workbook(d))
    # billets : coût total en H, part État en I sous forme de formule montrant les tarifs retenus
    assert ws["H12"].value == 339.2 and ws["I12"].value == "=ROUND(6*2.80+6*4.20+2*2.10,2)" and ws["J12"].value == "=I12"
    # montant global : coût total en H, règle de trois du modèle en I
    assert ws["H13"].value == 300.0 and ws["I13"].value == "=IFERROR(H13/$G$11*$F$11,0)"
    # détail incohérent avec le montant (ligne retouchée à la main) : le montant l'emporte
    d2 = make("course", [DecompteRow(rubrique="Transport", libelle="pce 1", mode="direct", cout_total=50.0, cout_direct=12.0, formule="2*5.50")])
    ws2 = load(build_workbook(d2))
    assert ws2["I12"].value == 12.0
    # formule en EUR convertie : « 2*10.00 EUR*0.9500 »
    d3 = make("course", [DecompteRow(rubrique="Transport", libelle="pce 1", mode="direct", cout_direct=19.0, formule="2*10.00 EUR*0.9500")])
    ws3 = load(build_workbook(d3))
    assert ws3["I12"].value == "=ROUND(2*10.00*0.9500,2)"


# ---------------------------------------------------------------------------
# Relecture de septembre
# ---------------------------------------------------------------------------


def test_formule_de_ligne_hostile_ou_incoherente_donne_le_montant():
    from decompte.excel import _direct_formula

    # « 9**9**9 » : une expression Python évaluée telle quelle bloquerait le programme
    row = DecompteRow(rubrique="Transport", libelle="pce 1", mode="direct", cout_direct=33.6, formule="9**9**9")
    assert _direct_formula(row) == 33.6
    # formule qui ne retombe pas sur le montant (ligne retouchée à la main) : le montant fait foi
    assert _direct_formula(DecompteRow(rubrique="Transport", libelle="pce 1", mode="direct", cout_direct=33.6, formule="2*2.80")) == 33.6
    # formule cohérente : elle est écrite dans la case
    assert _direct_formula(DecompteRow(rubrique="Transport", libelle="pce 1", mode="direct", cout_direct=33.6, formule="6*2.80 + 6*2.80")) == "=ROUND(6*2.80+6*2.80,2)"
    # tarifs en EUR : la devise est retirée, le taux reste un facteur
    assert _direct_formula(DecompteRow(rubrique="Transport", libelle="pce 1", mode="direct", cout_direct=21.7, formule="2*10.00 EUR*1.0850")) == "=ROUND(2*10.00*1.0850,2)"
