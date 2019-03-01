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

import * as utils from '../src/utils';
import Prando from 'prando';

describe('umap utils', () => {
  const prando = new Prando(42);
  const random = () => prando.next();

  test('randomNormal2d', () => {
    const results = utils.randomNormal2d(0, 1, [2, 2], random);
    expect(results).toEqual([
      [0.6269684491034108, -1.1184153575598885],
      [-0.8717275786498884, -0.6356319013602585],
    ]);
  });

  test('norm function', () => {
    const results = utils.norm([1, 2, 3, 4]);
    expect(results).toEqual(Math.sqrt(30));
  });

  test('empty function', () => {
    const results = utils.empty(3);
    expect(results).toEqual([undefined, undefined, undefined]);
  });

  test('empty function', () => {
    const results = utils.empty(3);
    expect(results).toEqual([undefined, undefined, undefined]);
  });

  test('range function', () => {
    const results = utils.range(3);
    expect(results).toEqual([0, 1, 2]);
  });

  test('filled function', () => {
    const results = utils.filled(3, 5);
    expect(results).toEqual([5, 5, 5]);
  });

  test('zeros function', () => {
    const results = utils.zeros(3);
    expect(results).toEqual([0, 0, 0]);
  });

  test('ones function', () => {
    const results = utils.ones(3);
    expect(results).toEqual([1, 1, 1]);
  });

  test('linear function', () => {
    const results = utils.linear(0, 5, 5);
    expect(results).toEqual([0, 1.25, 2.5, 3.75, 5]);
  });

  test('sum function', () => {
    const results = utils.sum([1, 2, 3]);
    expect(results).toEqual(6);
  });

  test('mean function', () => {
    const results = utils.mean([1, 2, 3]);
    expect(results).toEqual(2);
  });

  test('max function', () => {
    const results = utils.max([1, 3, 2]);
    expect(results).toEqual(3);
  });

  test('max2d function', () => {
    const results = utils.max2d([[1, 2, 3], [4, 5, 6]]);
    expect(results).toEqual(6);
  });
});
