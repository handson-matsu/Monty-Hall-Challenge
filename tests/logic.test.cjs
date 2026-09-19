const assert = require('node:assert/strict');
const { createRound, choose, finish, simulate } = require('../logic.js');
for (let n = 3; n <= 20; n++) {
  for (let prize = 0; prize < n; prize++) {
    for (let first = 0; first < n; first++) {
      for (const rng of [() => 0, () => 0.999999]) {
        const round = createRound(n, () => (prize + 0.5) / n);
        choose(round, first, rng);
        assert.notEqual(round.first, round.remaining);
        const opened = Array.from({ length: n }, (_, i) => i).filter(i => i !== first && i !== round.remaining);
        assert.equal(opened.length, n - 2);
        assert(!opened.includes(prize));
        assert.equal(finish(round, 'stay'), first === prize);
        assert.equal(finish(round, 'switch'), first !== prize);
      }
    }
  }
  let seed = 123456;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const data = simulate(n, 100000, random);
  assert.equal(data.stay.wins + data.switch.wins, 100000);
  assert(Math.abs(data.stay.wins / 100000 - 1 / n) < 0.01);
}
console.log('PASS: all prize/first-choice combinations for 3–20 doors; seeded simulation convergence.');
