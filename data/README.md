# Challenge data

The supplied project contains predictions, a notebook, and presentations. It does **not** contain the original challenge training or test inputs. No synthetic data is substituted for challenge data in the notebook.

Place the original files here:

```text
data/raw/train_dataset.csv
data/raw/test_dataset.csv
```

The raw directory is ignored by Git. Publication rights for the challenge inputs have not been established. The recorded challenge dimensions are 150 training rows and 50 test rows; these come from the original project materials.

| Column | Meaning | Units / constraint |
| --- | --- | --- |
| `flow_rate_L_min` | Inlet volumetric flow | L/min; strictly positive |
| `concentration_mol_L` | Inlet reactant concentration | mol/L; strictly positive |
| `inlet_temperature_K` | Inlet temperature | K; strictly positive |
| `length_m` | Reactor length | m; nonnegative |
| `jacket_temperature_K` | Jacket temperature | K; strictly positive |
| `overall_yield` | Desired product B yield | Percent in [0, 100]; training data only |

All model inputs must be numeric and finite. Keep test row order intact: the original submission contains only `overall_yield`, with no identifier column.

`length_m / flow_rate_L_min` has units of m·min/L. The current model absorbs geometry into effective coefficients; do not interpret it directly as minutes.

The public demo creates its own illustrative operating conditions in memory. Its outputs are clearly labeled and stored separately from the historical submission.
