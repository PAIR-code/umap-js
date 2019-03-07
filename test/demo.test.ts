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
import * as fmnist from '../data/fmnist.json';

describe('sparse matrix', () => {
  test('Processes the fmnist data', () => {
    const umap = new UMAP({ nComponents: 2 });
    const data = fmnist.data.map(x => x.reduce((p, c) => p.concat(c), []));
    const embedding = umap.fit(data.slice());
    expect(true).toEqual(true);
    console.log(JSON.stringify(embedding));
  });
});
