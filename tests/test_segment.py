from decompte.models import PageData, Word
from decompte.segment import segment_page

TICKET = ["Mobilis", "Billet de groupes individuel", "Valable: 10.03.2025 09:12 -", "Zones 70 72",
          "3 Prix entier CHF 2.80", "38 Jeune 6-24.99 CHF 1.70", "41 Total", "", "", "", "", "", "2. Cl.", "CHF 73.00", "No article: 80186"]


def words_for(lines, x_off, y_off, h=30):
    out = []
    for i, t in enumerate(lines):
        y = y_off + i * (h + 12)
        x = x_off
        for tok in t.split():
            w = 14 * len(tok)
            out.append(Word(x0=x, y0=y, x1=x + w, y1=y + h, text=tok))
            x += w + 12
    return out


def test_grid_of_four_tickets_gives_four_pieces_in_reading_order():
    words = words_for(TICKET, 100, 100) + words_for(TICKET, 1200, 100) + words_for(TICKET, 100, 1500) + words_for(TICKET, 1200, 1500)
    page = PageData(number=3, width=2400, height=3400, words=words)
    blocks = segment_page(page)
    assert len(blocks) == 4
    assert [round(b.bbox[0]) for b in blocks] == [100, 1200, 100, 1200]
    assert all("CHF 73.00" in b.text and b.text.startswith("Mobilis") for b in blocks)


def test_invoice_page_is_one_piece_plus_recepisse():
    invoice = ["Ville de Vevey", "Musée suisse", "", "", "FACTURE N° 296'868", "Payable jusqu'au: 20.12.2025", "", "", "Excursion photographique", "300.00",
               "", "", "", "", "", "", "", "", "", "", "Récépissé Section paiement", "CH53 3000 0001 1800 0004 6", "Payable par", "CHF 300.00", "Point de dépôt"]
    page = PageData(number=5, width=2400, height=3400, words=words_for(invoice, 100, 100))
    blocks = segment_page(page)
    assert len(blocks) == 2
    assert blocks[0].text.startswith("Ville de Vevey") and "300.00" in blocks[0].text and "Récépissé" not in blocks[0].text
    assert blocks[1].text.startswith("Récépissé")


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------


def test_recus_numerotes_a_la_main_restent_des_pieces_distinctes():
    """« Auberge du Lac 1 » … « Auberge du Lac 4 » : quatre reçus, pas un seul."""
    from decompte.segment import _is_header_line, _repeated_first_lines

    firsts = [f"Auberge du Lac {i}" for i in range(1, 5)]
    repeated = _repeated_first_lines(firsts)
    assert repeated, "les premières lignes répétées doivent être reconnues"
    for f in firsts:
        assert _is_header_line(f, repeated), f"« {f} » n'est pas vu comme un en-tête de pièce"
