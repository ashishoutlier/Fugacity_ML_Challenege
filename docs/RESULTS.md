# Results and evidence

## Historical reported results

The source is slide 5 of the unchanged [challenge presentation](../reports/Outliers_Presentation.pdf). The supplied notebook contains no saved outputs, and the original challenge inputs are absent.

| Reported result | Value | Interpretation |
| --- | ---: | --- |
| Pure ExtraTrees RMSE | 18.09 | Presentation's baseline result |
| Five parameter physics RMSE | 10.76 | Presentation's physics baseline result |
| Relative RMSE reduction | 40.5% | Calculated as `(18.09 - 10.76) / 18.09` |
| Leaderboard RMSE | 11.2 | Separate presentation claim; no leaderboard export supplied |

These are **reported**, not independently reproduced, scores. Do not label 10.76 as the final seven parameter hybrid score or treat the leaderboard and CV values as interchangeable. The available files do not establish a competition rank, win, deployment speedup, or production impact.

## Verifiable artifacts

The original submission contains 50 finite values within [0, 100], in one `overall_yield` column. The PDF, editable presentation, and original notebook are preserved; their hashes are recorded in [original-artifacts.sha256.json](original-artifacts.sha256.json).

The public tests exercise the maintained model's numerical and inference behavior using synthetic fixtures. They do not validate challenge accuracy. The public demo uses example coefficients and is not a trained predictor.

## Claims requiring additional evidence

The original notebook discusses Student t MCMC, Bayesian predictive intervals, variable reaction order, axial dispersion, Gaussian Process residuals, MLP comparisons, and nested CV. None of those experiment implementations or outputs appears in the supplied notebook. The maintained version does not present these claims as established findings.

The presentation reports `beta1 = -40.8`, while the supplied fitting code constrains this parameter to `[-40, 60]`. That estimate cannot come from this exact bounded implementation; reconstructing the experiment history is necessary before claiming parameter level reproducibility.

The model's `L/Q` variable omits reactor area, so it is a residence time group. Claims of a universal selectivity threshold, identifiable mechanistic constants, unconditional nonlinear stability, a guaranteed global optimum, or safe extrapolation are not established by the available evidence.

## What the maintained version changes

* Extracts the original physical solver, fitting utilities, and residual features into an importable module.
* Validates finite operating inputs and physical sign constraints at the inference boundary.
* Uses the saved configuration during inference, including nondefault reference temperature and grid resolution.
* Reloads the serialized model before comparing predictions on all test rows.
* Preserves the original submission and archives the original notebook unchanged.
* Exports CV summaries and λ-sweep tables when the challenge notebook runs.
* Rewords unsupported conclusions as assumptions or experiments still requiring evidence.

The physical equations, original bounds, restart strategy, default residual weight, and submission rounding are retained. A fresh full data run may differ from historical results because the original data and execution environment were not supplied.

## Completing the evidence trail

Provide the original datasets with their provenance and publication permissions, retain an executed notebook and fold predictions, record the environment and random seeds, and attach an official leaderboard record if available. Then evaluate λ selection with nested CV or a separate holdout before promoting the historical result into a reproduced benchmark.
