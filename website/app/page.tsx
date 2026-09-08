/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG charts need an explicit image role. */
'use client';
import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Download,
  CodeXml,
  RotateCcw,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  DEFAULT_CONDITIONS,
  operatingCurve,
  simulateYield,
} from '@/lib/reactor';
import type { Conditions } from '@/lib/reactor';

const REPO = 'https://github.com/ashishoutlier/Fugacity_ML_Challenege';
const pathFor = (curve: { length: number; yield: number }[]) =>
  curve
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'}${70 + (p.length / 4) * 610},${35 + (100 - p.yield) * 2.7}`,
    )
    .join(' ');

function ReactionFigure() {
  const curve = operatingCurve(DEFAULT_CONDITIONS);
  return (
    <figure
      className="reaction-figure"
      aria-label="Sequential reaction from reactant A through desired product B to byproduct C"
    >
      <div className="reaction-flow">
        <div>
          <span className="chemical">A</span>
          <span>Reactant</span>
        </div>
        <span className="reaction-connector">
          <i>k₁(T)</i>
          <span>⟶</span>
        </span>
        <div className="desired-product">
          <span className="chemical">B</span>
          <span>Desired product</span>
        </div>
        <span className="reaction-connector">
          <i>k₂(T)</i>
          <span>⟶</span>
        </span>
        <div>
          <span className="chemical">C</span>
          <span>Byproduct</span>
        </div>
      </div>
      <svg
        viewBox="0 0 740 370"
        className="hero-curve"
        role="img"
        aria-label="Illustrative yield rises, reaches a maximum, and declines as reactor length increases"
      >
        {[25, 50, 75, 100].map((y) => (
          <g key={y}>
            <line
              x1="70"
              y1={35 + (100 - y) * 2.7}
              x2="680"
              y2={35 + (100 - y) * 2.7}
              className="plot-grid"
            />
            <text x="48" y={40 + (100 - y) * 2.7} textAnchor="end">
              {y}
            </text>
          </g>
        ))}
        <line x1="70" x2="680" y1="305" y2="305" className="plot-axis" />
        <path
          d={`${pathFor(curve)} L680,305 L70,305 Z`}
          fill="var(--copper)"
          opacity="0.07"
        />
        <path
          d={pathFor(curve)}
          fill="none"
          stroke="var(--copper)"
          strokeWidth="4"
        />
        <text x="70" y="20">
          Yield of B (%)
        </text>
        <text x="375" y="350" textAnchor="middle">
          Reactor length
        </text>
        <text x="405" y="95" className="curve-note">
          A window, not a straight line.
        </text>
        <path
          className="note-line"
          d="M428,107 Q408,150 322,145"
          fill="none"
          stroke="var(--copper)"
          strokeWidth="1.5"
        />
      </svg>
      <figcaption>
        Illustrative model response. B forms, then reacts further into C.
      </figcaption>
    </figure>
  );
}

function Control({
  label,
  name,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  name: keyof Conditions;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (name: keyof Conditions, value: number) => void;
}) {
  return (
    <div className="control">
      <div className="control-label">
        <label id={`${name}-label`}>{label}</label>
        <output>
          {Number.isInteger(step) ? value.toFixed(0) : value.toFixed(1)}{' '}
          <span>{unit}</span>
        </output>
      </div>
      <Slider
        aria-labelledby={`${name}-label`}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) =>
          onChange(name, Array.isArray(v) ? v[0] : Number(v))
        }
      />
      <div className="control-range">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}

function Explorer() {
  const [conditions, setConditions] = useState<Conditions>({
    ...DEFAULT_CONDITIONS,
  });
  const curve = useMemo(() => operatingCurve(conditions), [conditions]);
  const current = useMemo(() => simulateYield(conditions), [conditions]);
  const peak = curve.reduce(
    (best, point) => (point.yield > best.yield ? point : best),
    curve[0],
  );
  const set = (name: keyof Conditions, value: number) =>
    setConditions((c) => ({ ...c, [name]: value }));
  function download() {
    const csv =
      'reactor_length_m,illustrative_yield_percent,inlet_temperature_K,jacket_temperature_K,flow_rate_L_min,concentration_mol_L\n' +
      curve
        .map(
          (p) =>
            `${p.length},${p.yield.toFixed(4)},${conditions.inlet},${conditions.jacket},${conditions.flow},${conditions.concentration}`,
        )
        .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'illustrative_reactor_curve.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section id="explore" className="explorer section-pad">
      <div className="section-heading">
        <div>
          <span className="section-context">The reactor, in your hands</span>
          <h2>
            Change the conditions.
            <br />
            Watch the chemistry.
          </h2>
        </div>
        <p>
          More heat can speed up production. It can also destroy the product you
          wanted. Explore that tradeoff.
        </p>
      </div>
      <div className="explorer-workspace">
        <div className="controls">
          <Control
            label="Inlet temperature"
            name="inlet"
            value={conditions.inlet}
            min={365}
            max={485}
            step={1}
            unit="K"
            onChange={set}
          />
          <Control
            label="Jacket temperature"
            name="jacket"
            value={conditions.jacket}
            min={365}
            max={485}
            step={1}
            unit="K"
            onChange={set}
          />
          <Control
            label="Flow rate"
            name="flow"
            value={conditions.flow}
            min={0.4}
            max={2.4}
            step={0.1}
            unit="L/min"
            onChange={set}
          />
          <Control
            label="Reactor length"
            name="length"
            value={conditions.length}
            min={0.2}
            max={4}
            step={0.1}
            unit="m"
            onChange={set}
          />
          <button
            className="reset-button"
            onClick={() => setConditions({ ...DEFAULT_CONDITIONS })}
          >
            <RotateCcw size={15} /> Reset conditions
          </button>
        </div>
        <div className="explorer-results">
          <div className="yield-header">
            <div>
              <span>Simulated yield of B</span>
              <output aria-live="polite" aria-atomic="true">
                {current.toFixed(1)}
                <small>%</small>
              </output>
            </div>
            <div className="peak-note">
              <span>Peak in this range</span>
              <strong>
                {peak.yield.toFixed(1)}% at {peak.length.toFixed(2)} m
              </strong>
            </div>
          </div>
          <svg
            className="live-chart"
            viewBox="0 0 740 370"
            role="img"
            aria-label={`Illustrative yield curve. Current yield ${current.toFixed(1)} percent at ${conditions.length.toFixed(1)} metres.`}
          >
            {[0, 25, 50, 75, 100].map((y) => (
              <g key={y}>
                <line
                  x1="70"
                  x2="680"
                  y1={35 + (100 - y) * 2.7}
                  y2={35 + (100 - y) * 2.7}
                  className="plot-grid"
                />
                <text x="48" y={40 + (100 - y) * 2.7} textAnchor="end">
                  {y}
                </text>
              </g>
            ))}
            {[0, 1, 2, 3, 4].map((x) => (
              <text key={x} x={70 + (x / 4) * 610} y="334" textAnchor="middle">
                {x}
              </text>
            ))}
            <path
              d={`${pathFor(curve)} L680,305 L70,305 Z`}
              fill="#efab79"
              opacity="0.08"
            />
            <path
              d={pathFor(curve)}
              fill="none"
              stroke="#efab79"
              strokeWidth="3.5"
            />
            <line
              x1={70 + (conditions.length / 4) * 610}
              x2={70 + (conditions.length / 4) * 610}
              y1="35"
              y2="305"
              stroke="#dbe8ed"
              strokeDasharray="4 5"
              opacity="0.4"
            />
            <circle
              cx={70 + (conditions.length / 4) * 610}
              cy={35 + (100 - current) * 2.7}
              r="6"
              fill="#efab79"
              stroke="#163b47"
              strokeWidth="3"
            />
            <text x="70" y="20">
              Yield (%)
            </text>
            <text x="375" y="368" textAnchor="middle">
              Reactor length (m)
            </text>
          </svg>
          <div className="chart-footer">
            <span>Feed concentration: 1.0 mol/L</span>
            <button onClick={download}>
              <Download size={15} /> Download curve
            </button>
          </div>
        </div>
      </div>
      <p className="simulation-note">
        This is an illustrative physics simulation with example coefficients. It
        does not use the fitted challenge model or its ML correction, and it is
        not intended for plant operation.{' '}
        <a href={`${REPO}/blob/main/docs/METHODOLOGY.md`}>
          Model assumptions <ArrowUpRight size={13} />
        </a>
      </p>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="wordmark" href="#main" aria-label="Reactor Yield home">
          <span className="mark">
            r<span>y</span>
          </span>
          <span>Reactor Yield</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#approach">Approach</a>
          <a href="#explore">Explore</a>
          <a href="#results">Results</a>
          <a href={REPO} target="_blank" rel="noreferrer" className="repo-link">
            <CodeXml size={17} />
            <span>Source code</span>
            <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero section-pad">
          <div className="hero-copy">
            <p className="project-credit">
              A project by Ashish Sharma <span>Fugacity 2026</span>
            </p>
            <h1>
              Teaching a model
              <br />
              how a reactor
              <br />
              behaves.
            </h1>
            <p className="hero-intro">
              Predicting chemical yield with a little machine learning and a lot
              of physics.
            </p>
            <p className="hero-description">
              A study in making more of a small dataset. Seven physical
              parameters describe the reaction. A tree ensemble learns what the
              equations leave behind.
            </p>
            <a className="primary-link" href="#explore">
              Explore the reactor <ArrowDown size={18} />
            </a>
          </div>
          <ReactionFigure />
          <div className="project-facts">
            <span>
              <strong>150</strong> training examples*
            </span>
            <span>
              <strong>5</strong> operating inputs
            </span>
            <span>
              <strong>7</strong> physical parameters
            </span>
            <span>
              <strong>50</strong> submitted predictions
            </span>
          </div>
        </section>
        <section id="approach" className="approach section-pad">
          <div className="approach-intro">
            <span className="section-context">The modeling decision</span>
            <h2>
              Start with the
              <br />
              reaction.
            </h2>
            <p className="serif-copy">
              The desired product is only an intermediate. Give it too little
              time and it never forms. Give it too much and it disappears.
            </p>
          </div>
          <div className="approach-detail">
            <p>
              Flow, temperature, and heat exchange all change that window. With
              only 150 reported training examples, this project uses the
              reaction structure to guide prediction.
            </p>
            <ol className="method-steps">
              <li>
                <span className="step-number">1</span>
                <div>
                  <h3>Describe the physics</h3>
                  <p>
                    Couple the material and energy balances for A → B → C. Fit
                    the kinetic rates, heat exchange, and reaction heat terms.
                  </p>
                </div>
              </li>
              <li>
                <span className="step-number">2</span>
                <div>
                  <h3>Learn the remaining error</h3>
                  <p>
                    Train ExtraTrees on observed yield minus the physical
                    prediction. Apply a residual weight of 0.30.
                  </p>
                </div>
              </li>
              <li>
                <span className="step-number">3</span>
                <div>
                  <h3>Test the whole pipeline</h3>
                  <p>
                    Refit the physics inside each validation fold. Compare the
                    physical ablations and the ML baseline across two seeds.
                  </p>
                </div>
              </li>
            </ol>
            <a
              className="text-link"
              href={`${REPO}/blob/main/reactor_yield_final.ipynb`}
            >
              <BookOpen size={17} /> Read the notebook{' '}
              <ArrowUpRight size={15} />
            </a>
          </div>
        </section>
        <Explorer />
        <section id="results" className="results section-pad">
          <div className="section-heading">
            <div>
              <span className="section-context">
                From the challenge presentation
              </span>
              <h2>
                What the results
                <br />
                suggest.
              </h2>
            </div>
            <p>
              The reported comparison favors a compact physics model. The
              evidence has limits, and they matter.
            </p>
          </div>
          <div className="results-grid">
            <div className="comparison">
              <div className="comparison-title">
                <h3>Reported baseline RMSE</h3>
                <span>Lower is better</span>
              </div>
              <div className="bar-row">
                <div>
                  <span>ExtraTrees baseline</span>
                  <strong>18.09</strong>
                </div>
                <div className="bar-track">
                  <span style={{ width: '90.45%' }} />
                </div>
              </div>
              <div className="bar-row physical">
                <div>
                  <span>Physics model, 5 parameters</span>
                  <strong>10.76</strong>
                </div>
                <div className="bar-track">
                  <span style={{ width: '53.8%' }} />
                </div>
              </div>
              <p className="comparison-caption">
                A calculated 40.5% reduction in RMSE for the five parameter
                physics baseline. This is not the final hybrid model’s measured
                improvement.
              </p>
            </div>
            <aside className="score-note">
              <span>Separately reported leaderboard RMSE</span>
              <strong>11.2</strong>
              <p>
                The original presentation reports this score. The repository
                does not include an official leaderboard export.
              </p>
            </aside>
          </div>
          <div className="evidence-note">
            <h3>A note on reproducibility</h3>
            <p>
              The original challenge inputs and executed outputs were not
              supplied. Historical scores have not been independently
              reproduced. The public code includes numerical checks and an
              illustrative demo; neither establishes challenge accuracy. *The
              150 training examples come from the original project materials.
            </p>
            <a href={`${REPO}/blob/main/docs/RESULTS.md`}>
              Read the evidence notes <ArrowUpRight size={15} />
            </a>
          </div>
        </section>
        <section className="project-files section-pad">
          <div>
            <span className="section-context">Open the work</span>
            <h2>
              Equations, experiments,
              <br />
              and the thinking behind them.
            </h2>
          </div>
          <div className="resource-links">
            <a href={`${REPO}/blob/main/reactor_yield_final.ipynb`}>
              <span>
                <BookOpen size={21} /> Analysis notebook
              </span>
              <ArrowUpRight size={21} />
            </a>
            <a href={`${REPO}/blob/main/reports/Outliers_Presentation.pdf`}>
              <span>
                Challenge presentation <small>PDF</small>
              </span>
              <ArrowUpRight size={21} />
            </a>
            <a href={`${REPO}/blob/main/submissions/Outliers.csv`}>
              <span>
                Original predictions <small>50 rows</small>
              </span>
              <ArrowUpRight size={21} />
            </a>
            <a href={REPO}>
              <span>
                <CodeXml size={21} /> Complete repository
              </span>
              <ArrowUpRight size={21} />
            </a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <strong>Ashish Sharma</strong>
          <span>Team Outliers, IIT Kharagpur</span>
        </div>
        <p>Scientific machine learning, with the assumptions in view.</p>
        <a
          href="https://github.com/ashishoutlier"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ArrowUpRight size={15} />
        </a>
      </footer>
    </>
  );
}
