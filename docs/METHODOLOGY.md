# Technical approach

## Model structure

The five operating inputs describe feed flow, reactant concentration, inlet temperature, reactor length, and jacket temperature. The solver approximates a first order sequential A → B → C system, with B as the desired intermediate.

Normalized reactant and product fractions obey:

$$\frac{dy_A}{ds}=-\tau k_1y_A,\qquad \frac{dy_B}{ds}=\tau(k_1y_A-k_2y_B)$$

The temperature balance includes jacket exchange and two reaction heat terms:

$$\frac{dT}{ds}=h\tau(T_j-T)+\beta_1C_{A0}\tau k_1y_A+\beta_2C_{A0}\tau k_2y_B$$

Rates use reference temperature Arrhenius coordinates:

$$k_i(T)=\exp\left[\ln k_{i,ref}-(E_i/R)(1/T-1/T_{ref})\right]$$

Here `s = z/L`, `T_ref = 425 K`, and `tau = L/Q`. Since reactor area is not included, `tau` is an operating group rather than a physical residence time in minutes. Treat rate and heat transfer coefficients as effective coefficients under this convention.

## Fitting and ablation

| Variant | Fitted parameters | Heat terms |
| --- | ---: | --- |
| Jacket only | 5 | Jacket exchange |
| One enthalpy | 6 | Jacket + A → B heat |
| Two enthalpies | 7 | Jacket + A → B and B → C heat |

The implementation retains the original parameter bounds, initial vector, and multistart strategy. It uses SciPy's [bounded nonlinear least squares solver](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.least_squares.html) with Cauchy loss and coordinate scaling. Cauchy loss downweights large residuals. It is a modeling choice here, not a verified description of the unknown noise distribution.

The full data fit uses 24 restarts per variant. Each cross validation fit uses eight restarts. Restarts improve exploration but cannot certify the global optimum. The original provenance of the fixed starting vector and parameter bounds is unavailable.

## Numerical implementation

The exponential midpoint update vectorizes across operating points. [NumPy `expm1`](https://numpy.org/doc/stable/reference/generated/numpy.expm1.html) avoids subtracting nearly equal floating point numbers in `(1 - exp(-b Δs)) / b` when `b` is tiny.

The nonlinear coupled update is approximate. Its handling of frozen decay terms does not imply that the complete scheme is exact or unconditionally stable. Yield clipping to [0, 100] constrains the public output but is not evidence of conservation or numerical convergence.

Automated tests use independent closed form isothermal solutions, the equal rate limit, a vanishing secondary rate, and grid refinement for selected thermal conditions. More demanding stiff regimes require additional checks, ideally against an adaptive reference ODE solver.

## Hybrid correction

[ExtraTreesRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.ExtraTreesRegressor.html) learns residuals from nine columns: the five inputs, L/Q, temperature difference between inlet and jacket, mean temperature, and the physical prediction. Four hundred trees estimate the residual; the final prediction adds 0.30 times that estimate to the physical yield and clips to [0, 100].

The pure ML baseline uses the first eight features. It multiplies an estimated nonzero yield probability by a regressor's conditional positive yield estimate.

## Evaluation protocol

The notebook uses shuffled five fold CV with seeds 0 and 1. Every fold refits the physics using only its training rows. It then trains the residual learner on those training rows and evaluates both components on the validation rows.

Raw RMSE and median absolute error summarize prediction quality against the supplied labels. A trimmed RMSE discards the worst 10% of squared errors as an auxiliary diagnostic. That exclusion may hide difficult physical regimes and does not reveal the error against unobserved clean labels.

The residual weight sweep shares validation predictions with the reported CV scores. A nested selection procedure or untouched holdout is needed for an unbiased estimate after choosing the weight. No executed nested CV results are included.

## Scope

This is a challenge scale scientific ML study. It does not implement direct A → C conversion, axial dispersion, variable reaction order, a Bayesian posterior, calibrated uncertainty intervals, online adaptation, or process control safeguards.
