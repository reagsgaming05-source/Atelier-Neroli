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
    assert ws["H12"].value is None and ws["I12"].value == 33.6 and ws["J12"].value == "=I12"
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
