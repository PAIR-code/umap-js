/* Copyright 2019 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import { UMAP } from '../src/umap';
import { testData, testResults2D, testResults3D } from './test_data';
import Prando from 'prando';

describe('UMAP', () => {
  let random: () => number;
  beforeEach(() => {
    const prng = new Prando(42);
    random = () => prng.next();
  });

  test('UMAP fit 2d synchronous method', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    const embedding = umap.fit(testData);
    expect(embedding).toEqual(testResults2D);
  });

  test('UMAP fit 3d synchronous method', () => {
    const umap = new UMAP({ random, nComponents: 3 });
    const embedding = umap.fit(testData);
    expect(embedding).toEqual(testResults3D);
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
    const embedding = await umap.fitAsync(testData, () => {
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
    spyOn<any>(umap, 'nearestNeighbors');
    umap.initializeFit(testData, knnIndices, knnDistances);
    umap.fit(testData);

    expect(umap['nearestNeighbors']).toBeCalledTimes(0);
  });
});
