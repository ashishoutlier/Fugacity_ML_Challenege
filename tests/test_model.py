"""Numerical and inference contracts; all fixtures are synthetic."""

from dataclasses import asdict
import importlib.util

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import ExtraTreesRegressor


@pytest.fixture(scope="module")
def model():
    spec = importlib.util.find_spec("reactor_model")
    assert spec is not None, "The notebook model must be importable without reading challenge data"
    import reactor_model
    return reactor_model


def conditions():
    return pd.DataFrame({
        "flow_rate_L_min": [1.0, 2.0, 1.5],
        "concentration_mol_L": [0.5, 1.0, 0.8],
        "inlet_temperature_K": [400.0, 425.0, 450.0],
        "length_m": [0.2, 1.0, 2.0],
        "jacket_temperature_K": [410.0, 425.0, 440.0],
    })


def test_solver_matches_independent_isothermal_series_solution(model):
    # For k1=2, k2=0.5, B(t)=2/(0.5-2)*(exp(-2t)-exp(-0.5t)).
    frame = conditions()
    frame["inlet_temperature_K"] = frame["jacket_temperature_K"] = 425.0
    d = model.prepare_conditions(frame)
    p = np.array([np.log(2), np.log(0.5), 0, 0, 1, 0, 0])
    expected = 100 * 2 / (0.5 - 2) * (np.exp(-2 * d["tau"]) - np.exp(-0.5 * d["tau"]))
    np.testing.assert_allclose(model.simulate(p, d, n_steps=640), expected, atol=0.002, rtol=0)


def test_equal_rates_and_zero_length(model):
    frame = conditions()
    frame["length_m"] = [0, 1, 3]
    d = model.prepare_conditions(frame)
    p = np.array([0, 0, 0, 0, 1, 0, 0])
    expected = 100 * d["tau"] * np.exp(-d["tau"])
    np.testing.assert_allclose(model.simulate(p, d, n_steps=640), expected, atol=0.002, rtol=0)


def test_tiny_secondary_rate_does_not_erase_yield(model):
    d = model.prepare_conditions(conditions())
    p = np.array([0, np.log(1e-16), 0, 0, 1, 0, 0])
    expected = 100 * (1 - np.exp(-d["tau"]))
    np.testing.assert_allclose(model.simulate(p, d, n_steps=640), expected, atol=0.002, rtol=0)


def test_thermal_solver_converges_as_grid_is_refined(model):
    d = model.prepare_conditions(conditions())
    p = np.array([np.log(2), np.log(0.35), 3500, 7000, 1.2, -2, 3])
    fine = model.simulate(p, d, n_steps=1280)
    coarse_error = np.max(np.abs(model.simulate(p, d, n_steps=40) - fine))
    refined_error = np.max(np.abs(model.simulate(p, d, n_steps=160) - fine))
    assert refined_error < coarse_error
    assert refined_error < 0.1


@pytest.mark.parametrize("column,value", [
    ("flow_rate_L_min", 0), ("concentration_mol_L", -1),
    ("inlet_temperature_K", 0), ("jacket_temperature_K", float("nan")),
    ("length_m", -1), ("flow_rate_L_min", float("inf")),
])
def test_invalid_conditions_fail_before_simulation(model, column, value):
    frame = conditions()
    frame.loc[0, column] = value
    with pytest.raises(ValueError):
        model.prepare_conditions(frame)


def test_missing_features_are_rejected(model):
    with pytest.raises(ValueError, match="length_m"):
        model.prepare_conditions(conditions().drop(columns="length_m"))


def test_saved_bundle_preserves_nondefault_solver_configuration(model, tmp_path):
    frame = conditions()
    d = model.prepare_conditions(frame)
    cfg = model.Config(T_REF=390.0, n_steps=80)
    p = np.array([np.log(2), np.log(0.35), 3500, 7000, 1.2, -2, 3])
    physical = model.simulate(p, d, cfg)
    trees = ExtraTreesRegressor(n_estimators=5, random_state=42).fit(
        model.features(d, physical), [1.0, -2.0, 3.0]
    )
    bundle = {
        "physical_parameters": dict(zip(
            ["ln_k1_ref", "ln_k2_ref", "E1_over_R", "E2_over_R", "h", "beta1", "beta2"], p
        )),
        "config": asdict(cfg), "lambda_residual": 0.3, "residual_model": trees,
    }
    path = tmp_path / "model.joblib"
    joblib.dump(bundle, path)
    expected = np.clip(physical + 0.3 * np.array([1, -2, 3]), 0, 100)
    actual = model.predict_yield(frame, joblib.load(path))
    np.testing.assert_allclose(actual, expected, atol=1e-10, rtol=0)


def test_robust_fit_reduces_synthetic_prediction_error(model):
    d = model.prepare_conditions(conditions())
    cfg = model.Config(n_steps=20)
    truth = model.BASE.copy()
    truth[0] += 0.2
    truth[5:] = 0
    y = model.simulate(truth, d, cfg)
    initial = model.BASE.copy()
    initial[5:] = 0
    before = model.rmse(model.simulate(initial, d, cfg), y)
    fitted = model.fit(d, y, variant="jacket_only", cfg=cfg, n_restarts=1, max_nfev=20)
    after = model.rmse(model.simulate(fitted, d, cfg), y)
    assert after < before


def test_metrics_keep_rmse_and_trimmed_diagnostic_distinct(model):
    actual = np.array([0.0] * 9 + [10.0])
    truth = np.zeros(10)
    assert model.rmse(actual, truth) == pytest.approx(np.sqrt(10))
    assert model.trimmed_rmse(actual, truth) == 0
    assert model.medae(actual, truth) == 0


@pytest.mark.parametrize("target,expected", [([0, 0, 0], 0), ([50, 50, 50], 50)])
def test_hurdle_baseline_handles_a_single_target_class(model, target, expected):
    assert hasattr(model, "hurdle_predict"), "The baseline must handle folds containing only one class"
    x = np.array([[0.0], [1.0], [2.0]])
    actual = model.hurdle_predict(x, np.array(target), np.array([[0.5], [1.5]]), n_estimators=5)
    np.testing.assert_allclose(actual, [expected, expected])
