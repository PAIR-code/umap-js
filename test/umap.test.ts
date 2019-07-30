/**
 * @license
 *
 * Copyright 2019 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==============================================================================
 */

import {
  UMAP,
  findABParams,
  euclidean,
  RandomFn,
  TargetMetric,
  Vector,
} from '../src/umap';
import * as utils from '../src/utils';
import {
  additionalData,
  additionalLabels,
  testData,
  testLabels,
  testResults2D,
  testResults3D,
} from './test_data';
import Prando from 'prando';

describe('UMAP', () => {
  let random: RandomFn;

  // Expected "clustering" ratios, representing inter-cluster distance vs mean
  // distance to other points.
  const UNSUPERVISED_CLUSTER_RATIO = 0.15;
  const SUPERVISED_CLUSTER_RATIO = 0.04;

  beforeEach(() => {
    const prng = new Prando(42);
    random = () => prng.next();
  });

  test('UMAP fit 2d synchronous method', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    const embedding = umap.fit(testData);
    expect(embedding).toEqual(testResults2D);
    checkClusters(embedding, testLabels, UNSUPERVISED_CLUSTER_RATIO);
  });

  test('UMAP fit 3d synchronous method', () => {
    const umap = new UMAP({ random, nComponents: 3 });
    const embedding = umap.fit(testData);
    expect(embedding).toEqual(testResults3D);
    checkClusters(embedding, testLabels, UNSUPERVISED_CLUSTER_RATIO);
  });

  test('UMAP fitAsync method', async () => {
    const umap = new UMAP({ random });
    let nEpochs = 0;
    const embedding = await umap.fitAsync(testData, () => {
      nEpochs += 1;
    });
    expect(embedding).toEqual(testResults2D);
    expect(nEpochs).toEqual(500);
  });

  test('UMAP step method', () => {
    const umap = new UMAP({ random });
    const nEpochs = umap.initializeFit(testData);

    for (let i = 0; i < nEpochs; i++) {
      umap.step();
    }
    const embedding = umap.getEmbedding();
    expect(embedding).toEqual(testResults2D);
    expect(nEpochs).toEqual(500);
  });

  test('specifies a number of epochs', async () => {
    const nEpochs = 200;
    const umap = new UMAP({ random, nEpochs });
    let nEpochsComputed = 0;
    await umap.fitAsync(testData, () => {
      nEpochsComputed += 1;
    });
    expect(nEpochsComputed).toEqual(nEpochs);
  });

  test('finds n nearest neighbors', () => {
    const nNeighbors = 10;
    const umap = new UMAP({ random, nNeighbors });
    const knn = umap['nearestNeighbors'](testData);

    expect(knn.knnDistances.length).toBe(testData.length);
    expect(knn.knnIndices.length).toBe(testData.length);
    expect(knn.knnDistances[0].length).toBe(nNeighbors);
    expect(knn.knnIndices[0].length).toBe(nNeighbors);
  });

  test('can be initialized with precomputed nearest neighbors', () => {
    const knnUMAP = new UMAP({ random });
    const { knnIndices, knnDistances } = knnUMAP['nearestNeighbors'](testData);

    const umap = new UMAP({ random });
    umap.setPrecomputedKNN(knnIndices, knnDistances);
    spyOn<any>(umap, 'nearestNeighbors');
    umap.fit(testData);

    expect(umap['nearestNeighbors']).toBeCalledTimes(0);
  });

  test('supervised projection', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    umap.setSupervisedProjection(testLabels);
    const embedding = umap.fit(testData);

    expect(embedding.length).toEqual(testResults2D.length);
    checkClusters(embedding, testLabels, SUPERVISED_CLUSTER_RATIO);
  });

  test('non-categorical supervised projection is not implemented', () => {
    const umap = new UMAP({ random, nComponents: 2 });

    // Unimplemented target metric.
    const targetMetric = TargetMetric.l1;
    umap.setSupervisedProjection(testLabels, { targetMetric });
    const embedding = umap.fit(testData);

    // Supervision with unimplemented target metric is a noop.
    expect(embedding).toEqual(testResults2D);
  });

  test('finds AB params using levenberg-marquardt', () => {
    // The default parameters from the python implementation
    const minDist = 0.1;
    const spread = 1.0;

    // The default results from the python sklearn curve-fitting algorithm
    const a = 1.5769434603113077;
    const b = 0.8950608779109733;
    const epsilon = 0.01;

    const params = findABParams(spread, minDist);
    const diff = (x: number, y: number) => Math.abs(x - y);

    expect(diff(params.a, a)).toBeLessThanOrEqual(epsilon);
    expect(diff(params.b, b)).toBeLessThanOrEqual(epsilon);
  });

  test('transforms an additional point after fitting', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    const embedding = umap.fit(testData);

    const additional = additionalData[0];
    const transformed = umap.transform([additional]);

    const nearestIndex = getNearestNeighborIndex(embedding, transformed[0]);
    const nearestLabel = testLabels[nearestIndex];
    expect(nearestLabel).toEqual(additionalLabels[0]);
  });

  test('transforms additional points after fitting', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    const embedding = umap.fit(testData);

    const transformed = umap.transform(additionalData);

    for (let i = 0; i < transformed.length; i++) {
      const nearestIndex = getNearestNeighborIndex(embedding, transformed[i]);
      const nearestLabel = testLabels[nearestIndex];
      expect(nearestLabel).toEqual(additionalLabels[i]);
    }
  });

  test('Allows a custom distance function to be used', () => {
    let nInvocations = 0;
    // Manhattan distance function, with invocation counter
    const manhattanDistance = (a: Vector, b: Vector) => {
      nInvocations += 1;
      let distance = 0;
      for (let i = 0; i < a.length; i++) {
        distance += Math.abs(a[i] - b[i]);
      }
      return distance;
    };

    const umap = new UMAP({
      random,
      nComponents: 2,
      distanceFn: manhattanDistance,
    });
    umap.fit(testData);

    expect(nInvocations).toBeGreaterThan(0);
  });

  test('initializeFit throws helpful error if not enough data', () => {
    const umap = new UMAP({ random });
    const smallData = testData.slice(0, 15);
    expect(() => umap.initializeFit(smallData)).toThrow(/Not enough data points/);
  })
});

function computeMeanDistances(vectors: number[][]) {
  return vectors.map(vector => {
    return utils.mean(
      vectors.map(other => {
        return euclidean(vector, other);
      })
    );
  });
}

/**
 * Check the ratio between distances within a cluster and for all points to
 * indicate "clustering"
 */
function checkClusters(
  embeddings: number[][],
  labels: number[],
  expectedClusterRatio: number
) {
  const distances = computeMeanDistances(embeddings);
  const overallMeanDistance = utils.mean(distances);

  const embeddingsByLabel = new Map<number, number[][]>();
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const embedding = embeddings[i];
    const group = embeddingsByLabel.get(label) || [];
    group.push(embedding);
    embeddingsByLabel.set(label, group);
  }

  let totalIntraclusterDistance = 0;
  for (let label of embeddingsByLabel.keys()) {
    const group = embeddingsByLabel.get(label)!;
    const distances = computeMeanDistances(group);
    const meanDistance = utils.mean(distances);
    totalIntraclusterDistance += meanDistance * group.length;
  }
  const meanInterclusterDistance =
    totalIntraclusterDistance / embeddings.length;
  const clusterRatio = meanInterclusterDistance / overallMeanDistance;
  expect(clusterRatio).toBeLessThan(expectedClusterRatio);
}

function getNearestNeighborIndex(
  items: number[][],
  otherPoint: number[],
  distanceFn = euclidean
) {
  const nearest = items.reduce(
    (result, point, pointIndex) => {
      const pointDistance = distanceFn(point, otherPoint);
      if (pointDistance < result.distance) {
        return { index: pointIndex, distance: pointDistance };
      }
      return result;
    },
    { index: 0, distance: Infinity }
  );
  return nearest.index;
}
