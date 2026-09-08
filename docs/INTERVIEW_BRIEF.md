# Project brief

## Resume title

**Physics Guided Reactor Yield Prediction | Python, SciPy, Scikit learn**

## Resume bullets

* Built a hybrid reactor yield model combining seven fitted kinetic and thermal parameters with an ExtraTrees residual regressor for a chemical engineering ML challenge.
* Implemented robust nonlinear fitting, vectorized reactor simulation, and repeated five fold cross validation with the physics model refitted inside each fold.
* Added analytical solver checks, input validation, and serialized model inference tests to make the modeling workflow easier to inspect and reuse.

If the original challenge results can be substantiated, an optional results bullet is:

> Reported a 40.5% RMSE reduction for the five parameter physics baseline versus ExtraTrees (18.09 → 10.76), with a separately reported leaderboard RMSE of 11.2.

The numbers above come from the original presentation. Do not describe them as independently reproduced, attribute the 10.76 score to the final hybrid, or convert them into an accuracy percentage.

## Explain it in 45 seconds

“The task was to predict the yield of an intermediate product in a continuous chemical reactor with a small training set. The desired product can react further into a byproduct, and temperature changes both reaction rates. I encoded that behavior in coupled reaction and heat balances, fitted the physical coefficients with a robust loss, and used ExtraTrees to correct residual errors. The interesting part was comparing progressively richer physical models and refitting the physics within each validation fold. The public repository now includes numerical checks and an illustrative demo that runs without challenge data; reproducing the challenge scores still requires the original input data.”

## Questions to be ready for

**Why use physics?** The reaction structure gives a useful inductive bias when data is limited. Whether it improves prediction must still be evaluated against held out observations.

**Why Cauchy loss?** It downweights large residuals, which is a reasonable modeling choice when labels may be contaminated. The repository does not contain the Bayesian experiment needed to establish a particular noise distribution.

**How did you prevent leakage?** The notebook refits physical parameters using each fold's training portion before predicting its validation portion. λ selection uses the reporting CV and therefore needs nested CV or a separate holdout for an unbiased final estimate.

**What does the tree model learn?** It learns the difference between observed and predicted physical yield using the five inputs, derived operating groups, and the physics prediction. Its contribution is multiplied by 0.30.

**What would you do next?** Restore the original datasets and execution logs, measure repeated/nested CV with uncertainty, inspect optimization and grid convergence near the thermal transition, and test on genuinely unseen operating regimes.

**Is this ready for plant control?** No. It is a challenge scale modeling study, without external validation, process safety constraints, drift monitoring, or a demonstrated deployment.
