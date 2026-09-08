"""Run an illustrative simulation; no training data or fitted model is used."""

import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from reactor_model import prepare_conditions, simulate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/demo"))
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    # Illustrative effective coefficients, not estimated challenge parameters.
    p = np.array([np.log(2), np.log(0.35), 3500, 7000, 1.2, -2, 3])
    rows = []
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})
    fig, ax = plt.subplots(figsize=(11, 5.6), facecolor="#f3f7f8")
    ax.set_facecolor("#f3f7f8")
    for temperature, color in [(380, "#8ba9b1"), (410, "#216779"), (440, "#b74722"), (470, "#513e61")]:
        frame = pd.DataFrame({
            "flow_rate_L_min": np.ones(160),
            "concentration_mol_L": np.ones(160),
            "inlet_temperature_K": np.full(160, temperature),
            "length_m": np.linspace(0, 4, 160),
            "jacket_temperature_K": np.full(160, temperature),
        })
        prediction = simulate(p, prepare_conditions(frame))
        frame["illustrative_yield_percent"] = prediction
        rows.append(frame)
        ax.plot(frame.length_m, prediction, color=color, linewidth=2.8, label=f"{temperature} K")
    ax.set(xlabel="L/Q operating group (m·min/L)", ylabel="Product B yield (%)", ylim=(0, 100), xlim=(0, 4))
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color("#9fadb3")
    ax.grid(axis="y", alpha=0.16)
    ax.legend(frameon=False, ncol=4, loc="upper right")
    fig.suptitle("Temperature changes the window for useful yield", x=0.09, ha="left", fontsize=20, fontweight="bold", color="#153a45")
    fig.text(0.09, 0.01, "Illustrative simulation · example coefficients · not a fitted challenge result", fontsize=10, color="#4e6670")
    fig.tight_layout(rect=(0, 0.035, 1, 0.96))
    fig.savefig(args.output_dir / "operating-curves.png", dpi=180)
    plt.close(fig)
    pd.concat(rows, ignore_index=True).to_csv(args.output_dir / "illustrative_predictions.csv", index=False)
    print(f"Illustrative simulation complete: {args.output_dir}")
    print("These coefficients are illustrative, not a trained model or challenge benchmark.")


if __name__ == "__main__":
    main()
