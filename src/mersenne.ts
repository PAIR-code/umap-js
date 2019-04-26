import * as MersenneTwister from './_mersenne';
const _r = new MersenneTwister();
_r.init_genrand(42);

export const r = _r;
