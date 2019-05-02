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

import * as nnDescent from '../src/nn_descent';
import { euclidean } from '../src/umap';
import Prando from 'prando';

describe('umap nnDescent methods', () => {
  const prando = new Prando(42);
  const random = () => prando.next();

  test('returns a nearest neighbors function', () => {
    const nnDescentFn = nnDescent.makeNNDescent(euclidean, random);

    expect(nnDescentFn instanceof Function).toBe(true);
  });

  test('returns an initialized nearest neighbors search function', () => {
    const nnSearchFn = nnDescent.makeInitializedNNSearch(euclidean);

    expect(nnSearchFn instanceof Function).toBe(true);
  });

  test('returns initialization functions', () => {
    const { initFromRandom, initFromTree } = nnDescent.makeInitializations(
      euclidean
    );

    expect(initFromRandom instanceof Function).toBe(true);
    expect(initFromTree instanceof Function).toBe(true);
  });
});
