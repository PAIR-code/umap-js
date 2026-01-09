[![Build Status](https://travis-ci.com/PAIR-code/umap-js.svg?branch=master)](https://travis-ci.com/PAIR-code/umap-js.svg?branch=master)

# UMAP-JS

This fork is part of the master’s thesis:

> WebAssembly-Accelerated UMAP for Browser Environment – Elar Saks, TAMK, 2026

It evaluates selectively rewriting performance‑critical parts of UMAP in Rust and compiling them to WebAssembly (WASM) for faster browser execution, while keeping the JavaScript API.

## Attribution

This project is a fork of the upstream `umap-js` library from PAIR-code (Google), which is a JavaScript reimplementation of the original Python UMAP reference implementation by McInnes et al.

- Upstream JS project: https://github.com/PAIR-code/umap-js
- Original Python implementation: https://github.com/lmcinnes/umap
- Paper: McInnes, Healy & Melville (2018), “UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction”

The thesis work builds on top of the upstream implementation and focuses on adding an optional Rust+WASM execution path for selected hot spots; credit for the baseline algorithm implementation belongs to the original authors and upstream maintainers.

Uniform Manifold Approximation and Projection (UMAP) is a dimension reduction technique that can be used for visualisation similarly to t-SNE, but also for general non-linear dimension reduction.

There are a few important differences between the python implementation and the JS port.

- The optimization step is seeded with a random embedding rather than a spectral embedding. This gives comparable results for smaller datasets. The spectral embedding computation relies on efficient eigenvalue / eigenvector computations that are not easily done in JS.
- There is no specialized functionality for angular distances or sparse data representations.

## Consume (library usage)

Install from npm:

```sh
yarn add umap-js
```

Synchronous fitting:

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
const embedding = umap.fit(data);
```

Asynchronous fitting:

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
const embedding = await umap.fitAsync(data, epochNumber => {
  // check progress and give user feedback, or return `false` to stop
});
```

Step-by-step fitting:

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
const nEpochs = umap.initializeFit(data);
for (let i = 0; i < nEpochs; i++) {
  umap.step();
}
const embedding = umap.getEmbedding();
```

Supervised projection using labels:

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
umap.setSupervisedProjection(labels);
const embedding = umap.fit(data);
```

Transforming additional points after fitting:

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
umap.fit(data);
const transformed = umap.transform(additionalData);
```

Common parameters:

The UMAP constructor can accept a number of hyperparameters via a `UMAPParameters` object, with the most common described below. See [umap.ts](./src/umap.ts) for more details.

| Parameter     | Description                                                                                                                         | default                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `nComponents` | The number of components (dimensions) to project the data to                                                                        | 2                                                                                                                   |
| `nEpochs`     | The number of epochs to optimize embeddings via SGD                                                                                 | (computed automatically)                                                                                            |
| `nNeighbors`  | The number of nearest neighbors to construct the fuzzy manifold                                                                     | 15                                                                                                                  |
| `minDist`     | The effective minimum distance between embedded points, used with `spread` to control the clumped/dispersed nature of the embedding | 0.1                                                                                                                 |
| `spread`      | The effective scale of embedded points, used with `minDist` to control the clumped/dispersed nature of the embedding                | 1.0                                                                                                                 |
| `random`      | A pseudo-random-number generator for controlling stochastic processes                                                               | `Math.random`                                                                                                       |
| `distanceFn`  | A custom distance function to use                                                                                                   | [`euclidean`](https://github.com/PAIR-code/umap-js/blob/73f181c8d7b58b051006aff7e492e259d6a32251/src/umap.ts#L1076) |

```typescript
const umap = new UMAP({
  nComponents: 2,
  nEpochs: 400,
  nNeighbors: 15,
});
```

## Develop (this repo)

This project is pinned to Yarn 4.12.0.

Install dependencies:

```sh
yarn install
```

Run tests:

```sh
yarn test
```

Build TypeScript + bundle:

```sh
yarn build
```

### WASM (experimental)

The Rust core lives in `wasm/` and is compiled to WebAssembly using `wasm-pack`.

Requirements:

- Rust toolchain with the `wasm32-unknown-unknown` target installed.
- `wasm-pack` available on `PATH`.

Build the WASM package:

```sh
yarn build:wasm
```

This runs `wasm-pack build` in `wasm/` and writes artifacts to `wasm/pkg/`.

More detailed (manual) build instructions and notes
--------------------------------------------------

Requirements:

- Rust toolchain with the `wasm32-unknown-unknown` target installed.
- `wasm-bindgen-cli` or `wasm-pack` available on `PATH`.

To build using the `wasm-bindgen` flow (used by CI and the `build:wasm` script):

```sh
cd wasm
cargo build --release --target wasm32-unknown-unknown
# generate JS bindings for Node.js (for running tests) or for web
wasm-bindgen --out-dir pkg --target nodejs \
  target/wasm32-unknown-unknown/release/umap_wasm_core.wasm
```

For browser usage (ESM-style bindings):

```sh
wasm-bindgen --out-dir pkg --target web \
  target/wasm32-unknown-unknown/release/umap_wasm_core.wasm
```

Notes:

- The generated `wasm/pkg` directory contains JavaScript glue code and `.wasm` binaries; these files are build artifacts and are ignored by `.gitignore`.
- CI builds the WASM with `--target nodejs` so tests can require the generated module in Node/Jest.
- If you modify Rust sources, rebuild the WASM before running tests or the demo.

Using the WASM module in tests or Node.js
---------------------------------------

When running the test-suite locally, ensure the `wasm/pkg` directory exists and contains the generated bindings. You can build the WASM with:

```sh
yarn build:wasm
```

Then run the test-suite as usual:

```sh
yarn test
```

