"""Physics-guided reactor yield model extracted from the original challenge notebook.

The reaction topology, ETD update equations, parameter bounds, and restart
strategy follow the supplied notebook. Coefficients are effective parameters;
L/Q is a residence-time group with geometry absorbed into the fit.
"""

from dataclasses import dataclass
import logging

import numpy as np
from scipy.optimize import least_squares
from sklearn.ensemble import ExtraTreesClassifier, ExtraTreesRegressor

log = logging.getLogger(__name__)




@dataclass(frozen=True)
class Config:
    train_path: str = "data/raw/train_dataset.csv"
    test_path: str = "data/raw/test_dataset.csv"
    out_dir: str = "artifacts"
    team_name: str = "Outliers"

    target: str = "overall_yield"
    raw_features: tuple = ("flow_rate_L_min", "concentration_mol_L",
                           "inlet_temperature_K", "length_m", "jacket_temperature_K")

    R_GAS: float = 8.314                 # J/mol/K
    T_REF: float = 425.0                 # K, fixed Arrhenius reference temperature
    n_steps: int = 160                   # verify grid convergence for each operating regime

    robust_loss: str = "cauchy"          # robust modeling choice; see docs/RESULTS.md
    f_scale: float = 1.0
    n_restarts: int = 24                 # the objective is multi-modal; see section 4

    lambda_residual: float = 0.30        # retained original residual weight
    y_min: float = 0.0
    y_max: float = 100.0

    n_splits: int = 5
    seeds: tuple = (0, 1)


CFG = Config()


def prepare_conditions(frame):
    """Validate operating columns and construct vectorized solver inputs.

    Additional columns are allowed; the input frame is not mutated.
    Length zero is accepted as the no-reaction boundary condition.
    """
    missing = set(CFG.raw_features) - set(frame.columns)
    if missing:
        raise ValueError(f"Missing operating columns: {', '.join(sorted(missing))}")
    values = frame.loc[:, list(CFG.raw_features)].to_numpy(dtype=float)
    if len(values) == 0 or not np.isfinite(values).all():
        raise ValueError("Operating conditions must contain finite, nonempty numeric data")
    if (values[:, [0, 1, 2, 4]] <= 0).any() or (values[:, 3] < 0).any():
        raise ValueError("Flow, concentration, and temperatures must be positive; length must be nonnegative")
    Q, C0, Ti, L, Tj = values.T
    return dict(Q=Q, C0=C0, Ti=Ti, L=L, Tj=Tj, tau=L / Q)



def _phi(b, step):
    """step * (1-exp(-b*step))/(b*step) without catastrophic cancellation.

    The naive expression returns exactly 0 when b ~ 1e-16 (low-temperature rows),
    which silently zeroes the predicted yield.
    """
    x = np.clip(b * step, 0.0, 700.0)
    safe = np.where(x < 1e-10, 1.0, x)
    return np.where(x < 1e-10, step, step * (-np.expm1(-safe)) / safe)


def simulate(p, d, cfg: Config = CFG, n_steps=None):
    """Vectorised ETD solution of the non-isothermal PFR for A -> B -> C.

    p = (ln_k1, ln_k2, E1/R, E2/R, h, beta1, beta2)
      beta1, beta2 [K.L/mol] : adiabatic temperature change per unit inlet
      concentration for A->B and B->C. Both zero => jacket-only energy balance.
    Returns exit yield of B in percent.
    """
    ln_k1, ln_k2, E1_R, E2_R, h, beta1, beta2 = p
    t, Ti_, Tj_, C_ = d["tau"], d["Ti"], d["Tj"], d["C0"]
    n_steps = n_steps or cfg.n_steps
    ds = 1.0 / n_steps
    dT1, dT2 = beta1 * C_, beta2 * C_

    yA = np.ones_like(t); yB = np.zeros_like(t); T = Ti_.copy()

    def rates(T_):
        inv = 1.0 / T_ - 1.0 / cfg.T_REF
        k1 = np.exp(np.clip(ln_k1 - E1_R * inv, -700, 700))
        k2 = np.exp(np.clip(ln_k2 - E2_R * inv, -700, 700))
        return t * k1, t * k2

    for _ in range(n_steps):
        a, b = rates(T); r1, r2 = a * yA, b * yB; hm = 0.5 * ds
        yA_m = yA * np.exp(-np.clip(a * hm, 0, 700))
        yB_m = yB * np.exp(-np.clip(b * hm, 0, 700)) + r1 * _phi(b, hm)
        T_m = Tj_ + (T - Tj_) * np.exp(-np.clip(h * t * hm, 0, 700)) + (dT1 * r1 + dT2 * r2) * hm

        a, b = rates(T_m); r1, r2 = a * yA_m, b * yB_m
        yA_n = yA * np.exp(-np.clip(a * ds, 0, 700))
        yB = yB * np.exp(-np.clip(b * ds, 0, 700)) + r1 * _phi(b, ds)
        T = Tj_ + (T - Tj_) * np.exp(-np.clip(h * t * ds, 0, 700)) + (dT1 * r1 + dT2 * r2) * ds
        yA = np.clip(yA_n, 0.0, 1.0); yB = np.clip(yB, 0.0, 1.0)

    return np.clip(yB, 0.0, 1.0) * 100.0


LO = np.array([-20., -20., 0., 0., 1e-5, -40., -40.])
HI = np.array([20., 20., 2e5, 2e5, 5e3, 60., 60.])
XS = np.array([1., 1., 1e4, 1e4, 1., 1., 1.])
BASE = np.array([2.2, -6.5, 4.7e3, 7.6e4, 2.8, -9.0, 0.0])

# structural variants: which of (beta1, beta2) are free
VARIANTS = {"jacket_only": (False, False),   # 5 params - the naive model
            "one_enthalpy": (True, False),   # 6 params
            "two_enthalpy": (True, True)}    # 7 params - our model


def fit(d, y_obs, variant="two_enthalpy", cfg: Config = CFG, loss=None,
        n_restarts=None, seed=7, max_nfev=500):
    """Robust multi-start nonlinear least squares. Frozen betas are pinned to zero."""
    b1, b2 = VARIANTS[variant]
    lo, hi, base = LO.copy(), HI.copy(), BASE.copy()
    if not b1:
        lo[5], hi[5], base[5] = -1e-9, 1e-9, 0.0
    if not b2:
        lo[6], hi[6], base[6] = -1e-9, 1e-9, 0.0

    loss = loss or cfg.robust_loss
    n_restarts = n_restarts or cfg.n_restarts
    resid = lambda p: simulate(p, d, cfg) - y_obs
    rng = np.random.default_rng(seed)
    best, n_wide = None, max(1, n_restarts // 4)
    for i in range(n_restarts):
        if i == 0:
            start = base.copy()
        elif i <= n_wide:                       # genuinely wide, not a perturbation
            start = lo + rng.uniform(size=7) * (np.minimum(hi, np.abs(base) * 8 + 1) - lo)
        else:
            start = base * rng.uniform(0.6, 1.6, size=7)
        start = np.clip(start, lo, hi)
        try:
            r = least_squares(resid, start, loss=loss, f_scale=cfg.f_scale,
                              bounds=(lo, hi), x_scale=XS, max_nfev=max_nfev)
        except (ValueError, FloatingPointError) as exc:
            log.debug("Restart %s failed: %s", i, exc)
            continue
        if best is None or r.cost < best.cost:
            best = r
    if best is None:
        raise RuntimeError("all restarts failed")
    return best.x


rmse = lambda a, b: float(np.sqrt(np.mean((np.asarray(a) - np.asarray(b)) ** 2)))
medae = lambda a, b: float(np.median(np.abs(np.asarray(a) - np.asarray(b))))

def trimmed_rmse(a, b, keep=0.90):
    e = np.sort((np.asarray(a) - np.asarray(b)) ** 2)
    return float(np.sqrt(np.mean(e[:int(len(e) * keep)])))



def features(d, phys):
    return np.column_stack([d["Q"], d["C0"], d["Ti"], d["L"], d["Tj"], d["tau"],
                            d["Ti"] - d["Tj"], (d["Ti"] + d["Tj"]) / 2, phys])


def predict_yield(conditions, bundle):
    """Predict with the exact solver configuration stored in a fitted bundle."""
    q = bundle["physical_parameters"]
    p = np.array([q["ln_k1_ref"], q["ln_k2_ref"], q["E1_over_R"], q["E2_over_R"],
                  q["h"], q["beta1"], q["beta2"]])
    cfg = Config(**bundle["config"])
    d = prepare_conditions(conditions)
    physical = simulate(p, d, cfg)
    correction = bundle["residual_model"].predict(features(d, physical))
    return np.clip(physical + bundle["lambda_residual"] * correction, cfg.y_min, cfg.y_max)


def hurdle_predict(x_train, y_train, x_validation, seed=0, n_estimators=300):
    """Pure ML baseline that also supports folds with only one target class."""
    y_train = np.asarray(y_train)
    live = y_train >= 1e-2
    if not live.any():
        return np.zeros(len(x_validation))
    regressor = ExtraTreesRegressor(n_estimators, random_state=seed, n_jobs=-1)
    regressor.fit(x_train[live], y_train[live])
    probability = np.ones(len(x_validation))
    if not live.all():
        classifier = ExtraTreesClassifier(n_estimators, random_state=seed, n_jobs=-1)
        classifier.fit(x_train, live.astype(int))
        positive_column = int(np.flatnonzero(classifier.classes_ == 1)[0])
        probability = classifier.predict_proba(x_validation)[:, positive_column]
    return np.clip(probability * regressor.predict(x_validation), 0, 100)
