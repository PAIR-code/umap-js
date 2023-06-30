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

  test('transforms an additional point after fitting', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    const embedding = umap.fit(testData);

    const serUmap = umap.serialize();
    const umapCopy = UMAP.deserialize(serUmap);

    const additional = additionalData[0];
    const cpTransformed = umapCopy.transform([additional]);

    const cpNearestIndex = getNearestNeighborIndex(embedding, cpTransformed[0]);
    const cpNearestLabel = testLabels[cpNearestIndex];
    expect(cpNearestLabel).toEqual(additionalLabels[0]);
  });

  test('transforms additional points after fitting', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    const embedding = umap.fit(testData);

    const serUmap = umap.serialize();
    const umapCopy = UMAP.deserialize(serUmap);

    const transformed = umapCopy.transform(additionalData);

    for (let i = 0; i < transformed.length; i++) {
      const nearestIndex = getNearestNeighborIndex(embedding, transformed[i]);
      const nearestLabel = testLabels[nearestIndex];
      expect(nearestLabel).toEqual(additionalLabels[i]);
    }
  });
});

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
