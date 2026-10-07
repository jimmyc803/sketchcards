"""
One-off generator for the optional example deck examples/amino-acids.json.

NOT needed to build or run the app. Python and RDKit are not project dependencies;
the generated JSON is committed. To regenerate:

    python3 -m venv .venv && .venv/bin/pip install rdkit
    .venv/bin/python scripts/generate_amino_acids.py

Each card's back is a skeletal structure (full amino acid incl. backbone, neutral form,
L-configuration with stereo wedges) embedded as an SVG data URL, so the file imports
through the app's normal "Import deck" button. Every structure is checked against its
expected CIP labels before writing.
"""
import base64
import json
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D

OUT = Path(__file__).resolve().parent.parent / "examples" / "amino-acids.json"
# Boards in the app are 4:3, so the reference lines up with the user's drawing.
W, H = 600, 450

# name, 3-letter, 1-letter, SMILES (L, neutral), expected CIP labels (Cα first), note, tags
AMINO_ACIDS = [
    ("Glycine", "Gly", "G", "NCC(=O)O", [], "No side chain (just H), so it's achiral", ["nonpolar"]),
    ("Alanine", "Ala", "A", "N[C@@H](C)C(=O)O", ["S"], "Methyl side chain", ["nonpolar"]),
    ("Valine", "Val", "V", "CC(C)[C@H](N)C(=O)O", ["S"], "Isopropyl side chain (β-branched)", ["nonpolar"]),
    ("Leucine", "Leu", "L", "CC(C)C[C@H](N)C(=O)O", ["S"], "Isobutyl side chain", ["nonpolar"]),
    ("Isoleucine", "Ile", "I", "CC[C@H](C)[C@H](N)C(=O)O", ["S", "S"], "sec-Butyl side chain; two stereocenters (2S,3S)", ["nonpolar"]),
    ("Proline", "Pro", "P", "OC(=O)[C@@H]1CCCN1", ["S"], "Side chain loops back to the backbone N (pyrrolidine ring)", ["nonpolar"]),
    ("Phenylalanine", "Phe", "F", "N[C@@H](Cc1ccccc1)C(=O)O", ["S"], "Benzyl side chain", ["nonpolar", "aromatic"]),
    ("Tryptophan", "Trp", "W", "N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O", ["S"], "Indole side chain", ["nonpolar", "aromatic"]),
    ("Methionine", "Met", "M", "CSCC[C@H](N)C(=O)O", ["S"], "Thioether side chain (–CH₂CH₂SCH₃)", ["nonpolar"]),
    ("Serine", "Ser", "S", "N[C@@H](CO)C(=O)O", ["S"], "Hydroxymethyl side chain (–CH₂OH)", ["polar"]),
    ("Threonine", "Thr", "T", "C[C@@H](O)[C@H](N)C(=O)O", ["S", "R"], "Secondary alcohol; two stereocenters (2S,3R)", ["polar"]),
    ("Cysteine", "Cys", "C", "N[C@@H](CS)C(=O)O", ["R"], "Thiol side chain (–CH₂SH); forms disulfides. L-Cys is R", ["polar"]),
    ("Tyrosine", "Tyr", "Y", "N[C@@H](Cc1ccc(O)cc1)C(=O)O", ["S"], "Phenol side chain (4-hydroxybenzyl)", ["polar", "aromatic"]),
    ("Asparagine", "Asn", "N", "N[C@@H](CC(N)=O)C(=O)O", ["S"], "Amide side chain (–CH₂CONH₂)", ["polar"]),
    ("Glutamine", "Gln", "Q", "N[C@@H](CCC(N)=O)C(=O)O", ["S"], "Amide side chain (–CH₂CH₂CONH₂)", ["polar"]),
    ("Aspartic acid", "Asp", "D", "N[C@@H](CC(=O)O)C(=O)O", ["S"], "Carboxylic acid side chain (–CH₂COOH); acidic", ["acidic"]),
    ("Glutamic acid", "Glu", "E", "N[C@@H](CCC(=O)O)C(=O)O", ["S"], "Carboxylic acid side chain (–CH₂CH₂COOH); acidic", ["acidic"]),
    ("Lysine", "Lys", "K", "NCCCC[C@H](N)C(=O)O", ["S"], "4-Aminobutyl side chain; basic", ["basic"]),
    ("Arginine", "Arg", "R", "N[C@@H](CCCNC(N)=N)C(=O)O", ["S"], "Guanidino group; basic", ["basic"]),
    ("Histidine", "His", "H", "N[C@@H](Cc1c[nH]cn1)C(=O)O", ["S"], "Imidazole side chain", ["basic", "aromatic"]),
]

# Shared backbone template so every structure has the same N–Cα–COOH orientation.
TEMPLATE = Chem.MolFromSmiles("NCC(=O)O")
rdDepictor.SetPreferCoordGen(True)
rdDepictor.Compute2DCoords(TEMPLATE)


def cip_labels(mol):
    """CIP labels with the alpha carbon first, then any side-chain stereocenters."""
    centers = dict(Chem.FindMolChiralCenters(mol, includeUnassigned=True, useLegacyImplementation=False))
    alpha = mol.GetSubstructMatch(TEMPLATE)[1]
    labels = [centers.pop(alpha)] if alpha in centers else []
    return labels + [lab for _, lab in sorted(centers.items())]


def draw(mol):
    AllChem.GenerateDepictionMatching2DStructure(mol, TEMPLATE)
    drawer = rdMolDraw2D.MolDraw2DSVG(W, H)
    opts = drawer.drawOptions()
    opts.useBWAtomPalette()
    opts.clearBackground = False  # transparent, so the app can theme it
    opts.bondLineWidth = 2.5
    opts.minFontSize = 22
    opts.maxFontSize = 30
    opts.padding = 0.12
    opts.addStereoAnnotation = False
    opts.fixedBondLength = 55
    drawer.DrawMolecule(rdMolDraw2D.PrepareMolForDrawing(mol, kekulize=True, wedgeBonds=True))
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()
    return svg[svg.index("<svg") :]  # drop the XML prolog


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cards = []
    for name, three, one, smiles, expected, note, tags in AMINO_ACIDS:
        mol = Chem.MolFromSmiles(smiles)
        assert mol is not None, name
        got = cip_labels(mol)
        assert got == expected, f"{name}: expected CIP {expected}, got {got}"
        svg = base64.b64encode(draw(mol).encode()).decode()
        cards.append(
            {
                "front_text": f"{name}\n{three} · {one}",
                "front_image": None,
                "back_text": note,
                "back_image": f"data:image/svg+xml;base64,{svg}",
                "back_strokes": None,
                "answer_mode": "draw",
                "tags": tags,
            }
        )
        print(f"✓ {three} {one}  {smiles}  CIP={got}")

    deck = {
        "app": "sketchcards",
        "version": 1,
        "exported_at": None,
        "decks": [{"name": "Amino acids", "default_answer_mode": "draw", "new_per_day": None, "cards": cards}],
    }
    OUT.write_text(json.dumps(deck, ensure_ascii=False, indent=1) + "\n")
    print(f"Wrote {len(cards)} cards to {OUT}")


if __name__ == "__main__":
    main()
