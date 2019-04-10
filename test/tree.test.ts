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

import * as tree from '../src/tree';
import { testData, treeData } from './test_data';
import Prando from 'prando';

describe('umap knn tree methods', () => {
  const prando = new Prando(42);
  const random = () => prando.next();

  test('makeForest method constructs an rpForest', () => {
    const nNeighbors = 15;
    const nTrees = 6;
    const forest = tree.makeForest(testData, nNeighbors, nTrees, random);

    expect(forest.length).toEqual(nTrees);
    expect(forest[0]).toEqual(treeData);
  });

  test('makeLeafArray method flattens indices', () => {
    const nNeighbors = 15;
    const nTrees = 6;
    const forest = tree.makeForest(testData, nNeighbors, nTrees, random);
    const leafArray = tree.makeLeafArray(forest);
    const firstIndices = forest[0].indices;

    expect(leafArray.slice(0, firstIndices.length)).toEqual(firstIndices);
  });
});
