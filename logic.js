(function (root) {
  'use strict';
  const randomIndex = (n, random = Math.random) => Math.floor(random() * n);
  function createRound(n, random = Math.random) {
    return { n, prize: randomIndex(n, random), first: null, remaining: null, final: null };
  }
  function choose(round, first, random = Math.random) {
    round.first = first;
    const candidates = Array.from({ length: round.n }, (_, i) => i).filter(i => i !== first);
    round.remaining = first === round.prize ? candidates[randomIndex(candidates.length, random)] : round.prize;
    return round;
  }
  function finish(round, strategy) {
    round.final = strategy === 'switch' ? round.remaining : round.first;
    return round.final === round.prize;
  }
  function simulate(n, count, random = Math.random) {
    let stay = 0;
    for (let i = 0; i < count; i++) if (randomIndex(n, random) === randomIndex(n, random)) stay++;
    return { stay: { total: count, wins: stay }, switch: { total: count, wins: count - stay } };
  }
  const api = { createRound, choose, finish, simulate };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Monty = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
