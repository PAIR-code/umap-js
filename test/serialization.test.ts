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

import { UMAP, RandomFn } from '../src/umap';

import { additionalData, testData } from './test_data';
import Prando from 'prando';

describe('umap serialization', () => {
  let random: RandomFn;

  beforeEach(() => {
    const prng = new Prando(42);
    random = () => prng.next();
  });

  test('Saves state', () => {
    const umap = new UMAP({ random, nComponents: 2 });
    umap.fit(testData);

    const savedState = umap.save();

    const serializedState = JSON.stringify(savedState);
    const parsedState = JSON.parse(serializedState);

    const restored = UMAP.load(parsedState);

    const transformed = restored.transform(additionalData);

    expect(true).toBe(true);
  });
});
