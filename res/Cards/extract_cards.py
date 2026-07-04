#!/usr/bin/env python3
"""
Extract individual card SVGs from English_pattern_playing_cards_deck.svg.

Uses Inkscape 1.x CLI to export each card group as a clean, standalone SVG
with proper viewBox and no green background.

Grid layout:
  Rows (top → bottom): pik (Spades), herz (Hearts), karo (Diamonds), kreuz (Clubs)
  Cols (left → right): ass, 2, 3, 4, 5, 6, 7, 8, 9, 10, bube, dame, koenig
"""

import xml.etree.ElementTree as ET
import os
import re
import subprocess
import sys

# ── Config ────────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "English_pattern_playing_cards_deck.svg")
OUT  = os.path.join(HERE, "svg_cards")

SUITS  = ["pik", "herz", "karo", "kreuz"]
VALUES = ["ass", "2", "3", "4", "5", "6", "7", "8", "9", "10", "bube", "dame", "koenig"]

# Column x-origins and expected row canvas y-origins
COL_X  = [30 + i * 390 for i in range(13)]   # 30, 420, …, 4710
ROW_Y  = [0, 570, 1140, 1710]                 # top edges of card cells

SVG_NS = "http://www.w3.org/2000/svg"

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_translate(t: str):
    """Return (tx, ty) from 'translate(tx[,ty])'."""
    if not t:
        return 0.0, 0.0
    m = re.search(r"translate\(\s*([\-\d.]+)(?:[\s,]+([\-\d.]+))?\s*\)", t)
    if m:
        return float(m.group(1)), float(m.group(2) or 0)
    return 0.0, 0.0


def closest(val, lst, tol):
    """Return index of closest element in lst within tol, else -1."""
    best_idx = min(range(len(lst)), key=lambda i: abs(lst[i] - val))
    best_dist = abs(lst[best_idx] - val)
    return best_idx if best_dist <= tol else -1


# ── Parse the SVG and map groups to (row, col) ────────────────────────────────

def map_groups(src):
    """Return dict { (row, col): group_element_id }."""
    tree = ET.parse(src)
    root = tree.getroot()

    groups = {}   # (row, col) → element id

    for child in root:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        if tag != "g":
            continue

        tx, ty = parse_translate(child.get("transform", ""))
        gid = child.get("id", "")

        col = closest(tx, COL_X, tol=5)
        if col == -1:
            continue

        # Most groups use translate(col_x, row_y_biased) where row_y_biased = ROW_Y[row] - 482.36218
        row = closest(ty + 482.36218, ROW_Y, tol=15)

        # Fallback: some groups (e.g. kreuz_bube id=g9009) use absolute canvas coords
        if row == -1:
            row = closest(ty, ROW_Y, tol=40)

        if row == -1:
            continue

        if (row, col) in groups:
            print(f"  [WARN] duplicate ({row},{col}) — existing={groups[(row,col)]}, new={gid}; skipping new")
            continue

        groups[(row, col)] = gid

    return groups


# ── Export via Inkscape ───────────────────────────────────────────────────────

def export_card(src, group_id, out_path):
    """Call inkscape to export a single group as a plain SVG."""
    cmd = [
        "inkscape",
        src,
        f"--export-id={group_id}",
        "--export-id-only",           # hide everything else
        "--export-type=svg",
        "--export-plain-svg",         # strip Inkscape-specific attributes
        f"--export-filename={out_path}",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    [ERROR] inkscape failed for {group_id}: {result.stderr.strip()}")
        return False
    return True


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUT, exist_ok=True)

    print(f"Parsing SVG structure …")
    groups = map_groups(SRC)
    print(f"  Found {len(groups)} card groups (expected 52)")

    missing = [(r, c) for r in range(4) for c in range(13) if (r, c) not in groups]
    if missing:
        print(f"  [WARN] Missing grid cells: "
              + ", ".join(f"{SUITS[r]}_{VALUES[c]}" for r, c in missing))

    total = len(groups)
    ok = 0

    for (row, col), gid in sorted(groups.items()):
        suit  = SUITS[row]
        value = VALUES[col]
        name  = f"{suit}_{value}.svg"
        out_path = os.path.join(OUT, name)

        print(f"  Exporting {name} (id={gid}) …", end=" ", flush=True)
        success = export_card(SRC, gid, out_path)
        if success:
            print("✓")
            ok += 1
        else:
            print("✗")

    print(f"\nDone! {ok}/{total} cards exported to: {OUT}/")

    if ok < 52:
        sys.exit(1)


if __name__ == "__main__":
    main()
