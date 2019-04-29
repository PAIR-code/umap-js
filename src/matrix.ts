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

import * as utils from './utils';
import { basename } from 'path';

/**
 * Internal 2-dimensional sparse matrix class
 */
export class SparseMatrix {
  private rows: number[];
  private cols: number[];
  private values: number[];

  private entries = new Map<string, number>();

  readonly nRows: number = 0;
  readonly nCols: number = 0;

  constructor(
    rows: number[],
    cols: number[],
    values: number[],
    dims: number[]
  ) {
    // TODO: Assert that rows / cols / vals are the same length.
    this.rows = [...rows];
    this.cols = [...cols];
    this.values = [...values];

    for (let i = 0; i < values.length; i++) {
      const key = this.makeKey(this.rows[i], this.cols[i]);
      this.entries.set(key, i);
    }

    // TODO: Assert that dims are legit.
    this.nRows = dims[0];
    this.nCols = dims[1];
  }

  private makeKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private checkDims(row: number, col: number) {
    const withinBounds = row < this.nRows && col < this.nCols;
    if (!withinBounds) {
      throw new Error('array index out of bounds');
    }
  }

  set(row: number, col: number, value: number) {
    this.checkDims(row, col);
    const key = this.makeKey(row, col);
    if (!this.entries.has(key)) {
      this.rows.push(row);
      this.cols.push(col);
      this.values.push(value);
      this.entries.set(key, this.values.length - 1);
    } else {
      const index = this.entries.get(key)!;
      this.values[index] = value;
    }
  }

  get(row: number, col: number, defaultValue = 0) {
    this.checkDims(row, col);
    const key = this.makeKey(row, col);
    if (this.entries.has(key)) {
      const index = this.entries.get(key)!;
      return this.values[index];
    } else {
      return defaultValue;
    }
  }

  getDims(): number[] {
    return [this.nRows, this.nCols];
  }

  getRows(): number[] {
    return [...this.rows];
  }

  getCols(): number[] {
    return [...this.cols];
  }

  getValues(): number[] {
    return [...this.values];
  }

  forEach(fn: (value: number, row: number, col: number) => void): void {
    for (let i = 0; i < this.values.length; i++) {
      fn(this.values[i], this.rows[i], this.cols[i]);
    }
  }

  map(fn: (value: number, row: number, col: number) => number): SparseMatrix {
    let vals: number[] = [];
    for (let i = 0; i < this.values.length; i++) {
      vals.push(fn(this.values[i], this.rows[i], this.cols[i]));
    }
    const dims = [this.nRows, this.nCols];
    return new SparseMatrix(this.rows, this.cols, vals, dims);
  }

  toArray() {
    const rows: undefined[] = utils.empty(this.nRows);
    const output = rows.map(() => {
      return utils.zeros(this.nCols);
    });
    for (let i = 0; i < this.values.length; i++) {
      output[this.rows[i]][this.cols[i]] = this.values[i];
    }
    return output;
  }
}

/**
 * Transpose a sparse matrix
 */
export function transpose(matrix: SparseMatrix): SparseMatrix {
  const cols: number[] = [];
  const rows: number[] = [];
  const vals: number[] = [];

  matrix.forEach((value, row, col) => {
    cols.push(row);
    rows.push(col);
    vals.push(value);
  });

  const dims = [matrix.nCols, matrix.nRows];
  return new SparseMatrix(rows, cols, vals, dims);
}

/**
 * Construct a sparse identity matrix
 */
export function identity(size: number[]): SparseMatrix {
  const [rows] = size;
  const matrix = new SparseMatrix([], [], [], size);
  for (let i = 0; i < rows; i++) {
    matrix.set(i, i, 1);
  }
  return matrix;
}

/**
 * Element-wise multiplication of two matrices
 */
export function pairwiseMultiply(
  a: SparseMatrix,
  b: SparseMatrix
): SparseMatrix {
  return elementWise(a, b, (x, y) => x * y);
}

/**
 * Element-wise addition of two matrices
 */
export function add(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x + y);
}

/**
 * Element-wise subtraction of two matrices
 */
export function subtract(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x - y);
}

/**
 * Element-wise maximum of two matrices
 */
export function maximum(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => (x > y ? x : y));
}

/**
 * Scalar multiplication of two matrices
 */
export function multiplyScalar(a: SparseMatrix, scalar: number): SparseMatrix {
  return a.map((value: number) => {
    return value * scalar;
  });
}

/**
 * Returns a new matrix with zero entries removed.
 */
export function eliminateZeros(m: SparseMatrix) {
  const zeroIndices = new Set();
  const values = m.getValues();
  const rows = m.getRows();
  const cols = m.getCols();
  for (let i = 0; i < values.length; i++) {
    if (values[i] === 0) {
      zeroIndices.add(i);
    }
  }
  const removeByZeroIndex = (_, index: number) => !zeroIndices.has(index);
  const nextValues = values.filter(removeByZeroIndex);
  const nextRows = rows.filter(removeByZeroIndex);
  const nextCols = cols.filter(removeByZeroIndex);

  return new SparseMatrix(nextRows, nextCols, nextValues, m.getDims());
}

/**
 * Normalization of a sparse matrix.
 */
export function normalize(m: SparseMatrix, normType = NormType.l2) {
  const normFn = normFns[normType];

  const colsByRow = new Map<number, number[]>();
  m.forEach((_, row, col) => {
    const cols = colsByRow.get(row) || [];
    cols.push(col);
    colsByRow.set(row, cols);
  });

  const nextMatrix = new SparseMatrix([], [], [], m.getDims());

  for (let row of colsByRow.keys()) {
    const cols = colsByRow.get(row)!.sort();

    const vals = cols.map(col => m.get(row, col));
    const norm = normFn(vals);
    for (let i = 0; i < norm.length; i++) {
      nextMatrix.set(row, cols[i], norm[i]);
    }
  }

  return nextMatrix;
}

/**
 * Vector normalization functions
 */
type NormFns = { [key in NormType]: (v: number[]) => number[] };
const normFns: NormFns = {
  [NormType.max]: (xs: number[]) => {
    let max = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      max = xs[i] > max ? xs[i] : max;
    }
    return xs.map(x => x / max);
  },
  [NormType.l1]: (xs: number[]) => {
    let sum = 0;
    for (let i = 0; i < xs.length; i++) {
      sum += xs[i];
    }
    return xs.map(x => x / sum);
  },
  [NormType.l2]: (xs: number[]) => {
    let sum = 0;
    for (let i = 0; i < xs.length; i++) {
      sum += xs[i] ** 2;
    }
    return xs.map(x => Math.sqrt(x ** 2 / sum));
  },
};

export const enum NormType {
  max = 'max',
  l1 = 'l1',
  l2 = 'l2',
}

/**
 * Helper function for element-wise operations.
 */
function elementWise(
  a: SparseMatrix,
  b: SparseMatrix,
  op: (x: number, y: number) => number
): SparseMatrix {
  const visited = new Set<string>();
  const rows: number[] = [];
  const cols: number[] = [];
  const vals: number[] = [];

  const operate = (row: number, col: number) => {
    rows.push(row);
    cols.push(col);
    const nextValue = op(a.get(row, col), b.get(row, col));
    vals.push(nextValue);
  };

  const valuesA = a.getValues();
  const rowsA = a.getRows();
  const colsA = a.getCols();
  for (let i = 0; i < valuesA.length; i++) {
    const row = rowsA[i];
    const col = colsA[i];
    const key = `${row}:${col}`;
    visited.add(key);
    operate(row, col);
  }

  const valuesB = b.getValues();
  const rowsB = b.getRows();
  const colsB = b.getCols();
  for (let i = 0; i < valuesB.length; i++) {
    const row = rowsB[i];
    const col = colsB[i];
    const key = `${row}:${col}`;
    if (visited.has(key)) continue;
    operate(row, col);
  }

  const dims = [a.nRows, a.nCols];
  return new SparseMatrix(rows, cols, vals, dims);
}

/**
 * Helper function for getting data, indices, and inptr arrays from a sparse
 * matrix to follow csr matrix conventions. Super inefficient (and kind of
 * defeats the purpose of this convention) but a lot of the ported python tree
 * search logic depends on this data format.
 */
export function getCSR(x: SparseMatrix) {
  type Entry = { value: number; row: number; col: number };
  const entries: Entry[] = [];

  x.forEach((value, row, col) => {
    entries.push({ value, row, col });
  });

  entries.sort((a, b) => {
    if (a.row === b.row) {
      return a.col - b.col;
    } else {
      return a.row - b.col;
    }
  });

  const indices: number[] = [];
  const values: number[] = [];
  const indptr: number[] = [];

  let currentRow = -1;
  for (let i = 0; i < entries.length; i++) {
    const { row, col, value } = entries[i];
    if (row !== currentRow) {
      currentRow = row;
      indptr.push(i);
    }
    indices.push(col);
    values.push(value);
  }

  return { indices, values, indptr };
}
