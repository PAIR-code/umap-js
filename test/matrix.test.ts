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
  SparseMatrix,
  transpose,
  identity,
  pairwiseMultiply,
  add,
  subtract,
  maximum,
  multiplyScalar,
  eliminateZeros,
  normalize,
  NormType,
  getCSR,
} from '../src/matrix';

describe('sparse matrix', () => {
  test('constructs a sparse matrix from rows/cols/vals ', () => {
    const rows = [0, 0, 1, 1];
    const cols = [0, 1, 0, 1];
    const vals = [1, 2, 3, 4];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);
    expect(matrix.getRows()).toEqual(rows);
    expect(matrix.getCols()).toEqual(cols);
    expect(matrix.getValues()).toEqual(vals);
    expect(matrix.nRows).toEqual(2);
    expect(matrix.nCols).toEqual(2);
  });

  test('sparse matrix has get / set methods', () => {
    const rows = [0, 0, 1, 1];
    const cols = [0, 1, 0, 1];
    const vals = [1, 2, 3, 4];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);

    expect(matrix.get(0, 1)).toEqual(2);
    matrix.set(0, 1, 9);
    expect(matrix.get(0, 1)).toEqual(9);
  });

  test('sparse matrix has getAll method', () => {
    const rows = [0, 0, 1, 1];
    const cols = [0, 1, 0, 1];
    const vals = [1, 2, 3, 4];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);

    expect(matrix.getAll()).toEqual([
      { row: 0, col: 0, value: 1 },
      { row: 0, col: 1, value: 2 },
      { row: 1, col: 0, value: 3 },
      { row: 1, col: 1, value: 4 },
    ]);
  });

  test('sparse matrix has toArray method', () => {
    const rows = [0, 0, 1, 1];
    const cols = [0, 1, 0, 1];
    const vals = [1, 2, 3, 4];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);

    expect(matrix.toArray()).toEqual([[1, 2], [3, 4]]);
  });

  test('sparse matrix has map method', () => {
    const rows = [0, 0, 1, 1];
    const cols = [0, 1, 0, 1];
    const vals = [1, 2, 3, 4];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);
    const newMatrix = matrix.map(value => {
      return value + 1;
    });

    expect(newMatrix.toArray()).toEqual([[2, 3], [4, 5]]);
  });

  test('sparse matrix has forEach', () => {
    const rows = [0, 1];
    const cols = [0, 0];
    const vals = [1, 3];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);

    const entries: number[][] = [];
    matrix.forEach((value, row, col) => {
      entries.push([value, row, col]);
    });

    expect(entries).toEqual([[1, 0, 0], [3, 1, 0]]);
  });
});

describe('helper methods', () => {
  let A: SparseMatrix;
  let B: SparseMatrix;

  beforeEach(() => {
    const rows = [0, 0, 1, 1];
    const cols = [0, 1, 0, 1];
    const vals = [1, 2, 3, 4];
    const dims = [2, 2];
    A = new SparseMatrix(rows, cols, vals, dims);
    B = new SparseMatrix(rows, cols, vals, dims);
  });

  test('transpose method', () => {
    const T = transpose(A);
    expect(T.toArray()).toEqual([[1, 3], [2, 4]]);
  });

  test('identity method', () => {
    const I = identity([2, 2]);
    expect(I.toArray()).toEqual([[1, 0], [0, 1]]);
  });

  test('pairwise multiply method', () => {
    const X = pairwiseMultiply(A, B);
    expect(X.toArray()).toEqual([[1, 4], [9, 16]]);
  });

  test('add method', () => {
    const X = add(A, B);
    expect(X.toArray()).toEqual([[2, 4], [6, 8]]);
  });

  test('subtract method', () => {
    const X = subtract(A, B);
    expect(X.toArray()).toEqual([[0, 0], [0, 0]]);
  });

  test('element-wise maximum method', () => {
    const I = multiplyScalar(identity([2, 2]), 8);
    const X = maximum(A, I);
    expect(X.toArray()).toEqual([[8, 2], [3, 8]]);
  });

  test('scalar multiply method', () => {
    const X = multiplyScalar(A, 3);
    expect(X.toArray()).toEqual([[3, 6], [9, 12]]);
  });

  test('eliminateZeros method', () => {
    const defaultValue = 11;
    const rows = [0, 1, 1];
    const cols = [0, 0, 1];
    const vals = [0, 1, 3];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);

    expect(matrix.get(0, 0, defaultValue)).toEqual(0);
    const eliminated = eliminateZeros(matrix);

    expect(eliminated.getValues()).toEqual([1, 3]);
    expect(eliminated.getRows()).toEqual([1, 1]);
    expect(eliminated.getCols()).toEqual([0, 1]);

    expect(eliminated.get(0, 0, defaultValue)).toEqual(defaultValue);
  });
});

describe('normalize method', () => {
  let A: SparseMatrix;

  beforeEach(() => {
    const rows = [0, 0, 0, 1, 1, 1, 2, 2, 2];
    const cols = [0, 1, 2, 0, 1, 2, 0, 1, 2];
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const dims = [3, 3];
    A = new SparseMatrix(rows, cols, vals, dims);
  });

  test('max normalization method', () => {
    const expected = [
      [0.3333333333333333, 0.6666666666666666, 1.0],
      [0.6666666666666666, 0.8333333333333334, 1.0],
      [0.7777777777777778, 0.8888888888888888, 1.0],
    ];
    const n = normalize(A, NormType.max);
    expect(n.toArray()).toEqual(expected);
  });

  test('l1 normalization method', () => {
    const expected = [
      [0.16666666666666666, 0.3333333333333333, 0.5],
      [0.26666666666666666, 0.3333333333333333, 0.4],
      [0.2916666666666667, 0.3333333333333333, 0.375],
    ];
    const n = normalize(A, NormType.l1);
    expect(n.toArray()).toEqual(expected);
  });

  test('l2 normalization method (default)', () => {
    const expected = [
      [0.2672612419124244, 0.5345224838248488, 0.8017837257372732],
      [0.4558423058385518, 0.5698028822981898, 0.6837634587578277],
      [0.5025707110324167, 0.5743665268941904, 0.6461623427559643],
    ];
    const n = normalize(A);
    expect(n.toArray()).toEqual(expected);
  });

  test('getCSR function', () => {
    const { indices, values, indptr } = getCSR(A);
    expect(indices).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(indptr).toEqual([0, 3, 6]);
  });
});
