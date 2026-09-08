"""Check the maintained notebook and preserve the original project artifacts."""

import ast
import hashlib
import json
from pathlib import Path

import nbformat
import numpy as np
import pandas as pd


def main():
    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / "docs/original-artifacts.sha256.json").read_text())
    for filename, expected in manifest.items():
        actual = hashlib.sha256((root / filename).read_bytes()).hexdigest()
        if actual != expected:
            raise ValueError(f"Original artifact changed: {filename}")
    nb = nbformat.read(root / "reactor_yield_final.ipynb", as_version=4)
    nbformat.validate(nb)
    for cell in nb.cells:
        if cell.cell_type == "code":
            ast.parse(cell.source)
    submission = pd.read_csv(root / "submissions/Outliers.csv")
    assert list(submission.columns) == ["overall_yield"]
    assert len(submission) == 50
    assert np.isfinite(submission.overall_yield).all()
    assert submission.overall_yield.between(0, 100).all()
    print("Notebook schema and syntax, 50-row submission, and original artifact hashes verified")


if __name__ == "__main__":
    main()
