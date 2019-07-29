[![Build Status](https://travis-ci.com/PAIR-code/umap-js.svg?branch=master)](https://travis-ci.com/PAIR-code/umap-js.svg?branch=master)

# UMAP-JS

This is a JavaScript reimplementation of UMAP from the python implementation found at https://github.com/lmcinnes/umap.

Uniform Manifold Approximation and Projection (UMAP) is a dimension reduction technique that can be used for visualisation similarly to t-SNE, but also for general non-linear dimension reduction.

There are a few important differences between the python implementation and the JS port.

- The optimization step is seeded with a random embedding rather than a spectral embedding. This gives comparable results for smaller datasets. The spectral embedding computation relies on efficient eigenvalue / eigenvector computations that are not easily done in JS.
- There is no specialized functionality for angular distances or sparse data representations.

### Usage

#### Installation

```sh
yarn add umap-js
```

#### Synchronous fitting

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
const embedding = umap.fit(data);
```

#### Asynchronous fitting

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
const embedding = await umap.fitAsync(data, epochNumber => {
  // check progress and give user feedback, or return `false` to stop
});
```

#### Step-by-step fitting

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
const nEpochs = umap.initializeFit(data);
for (let i = 0; i < nEpochs; i++) {
  umap.step();
}
const embedding = umap.getEmbedding();
```

#### Supervised projection using labels

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
umap.setSupervisedProjection(labels);
const embedding = umap.fit(data);
```

#### Transforming additional points after fitting

```javascript
import { UMAP } from 'umap-js';

const umap = new UMAP();
umap.fit(data);
const transformed = umap.transform(additionalData);
```

#### Parameters

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

### Testing

`umap-js` uses [`jest`](https://jestjs.io/) for testing.

```
yarn test
```

**This is not an officially supported Google product**
