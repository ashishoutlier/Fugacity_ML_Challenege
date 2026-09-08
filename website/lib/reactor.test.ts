import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateYield, operatingCurve } from './reactor.ts';

void test('isothermal first order reaction agrees with its analytical solution', () => {
  const actual = simulateYield(
    { inlet: 425, jacket: 425, flow: 1, length: 1, concentration: 1 },
    [Math.log(2), Math.log(0.5), 0, 0, 1, 0, 0],
  );
  const expected = ((100 * 2) / (0.5 - 2)) * (Math.exp(-2) - Math.exp(-0.5));
  assert.ok(Math.abs(actual - expected) < 0.01);
});

void test('zero reactor length gives zero product yield', () => {
  assert.equal(
    simulateYield({
      inlet: 425,
      jacket: 425,
      flow: 1,
      length: 0,
      concentration: 1,
    }),
    0,
  );
});

void test('operating curves contain finite percentages and respond to temperature', () => {
  const conditions = {
    inlet: 410,
    jacket: 410,
    flow: 1,
    length: 2,
    concentration: 1,
  };
  const curve = operatingCurve(conditions);
  assert.equal(curve.length, 81);
  assert.ok(
    curve.every(
      (point) =>
        Number.isFinite(point.yield) && point.yield >= 0 && point.yield <= 100,
    ),
  );
  assert.notEqual(
    simulateYield(conditions),
    simulateYield({ ...conditions, inlet: 470, jacket: 470 }),
  );
});

void test('invalid operating inputs fail clearly', () => {
  assert.throws(
    () =>
      simulateYield({
        inlet: 425,
        jacket: 425,
        flow: 0,
        length: 1,
        concentration: 1,
      }),
    /positive/,
  );
});
