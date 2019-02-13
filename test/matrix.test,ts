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

import {
  SparseMatrix,
  transpose,
  identity,
  dotMultiply,
  add,
  subtract,
  multiplyScalar,
} from '../src/matrix';

describe('sparse matrix', () => {
  test('constructs a sparse matrix from rows/cols/vals ', () => {
    const rows = [0, 0, 1, 1];
    const cols = [0, 1, 0, 1];
    const vals = [1, 2];
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
    const vals = [1, 2];
    const dims = [2, 2];
    const matrix = new SparseMatrix(rows, cols, vals, dims);

    expect(matrix.get(0, 1)).toEqual(2);
    matrix.set(0, 1, 9);
    expect(matrix.get(0, 1)).toEqual(9);
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

    const entries = [];
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

  test('dot multiply method', () => {
    const X = dotMultiply(A, B);
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

  test('scalar multiply method', () => {
    const X = multiplyScalar(A, 3);
    expect(X.toArray()).toEqual([[3, 6], [9, 12]]);
  });
});

