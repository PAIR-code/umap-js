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

/**
 * This is a JavaScript reimplementation of UMAP (original license below), from
 * the python implementation found at https://github.com/lmcinnes/umap.
 *
 * @author andycoenen@google.com (Andy Coenen)
 */

/**
 * @license
 * BSD 3-Clause License
 *
 * Copyright (c) 2017, Leland McInnes
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as heap from './heap';
import * as matrix from './matrix';
import * as tree from './tree';
import * as utils from './utils';
import { RandomFn, Vectors, DistanceFn } from './umap';

/**
 * Create a version of nearest neighbor descent.
 */
export function makeNNDescent(distanceFn: DistanceFn, random: RandomFn) {
  return function nNDescent(
    data: Vectors,
    leafArray: Vectors,
    nNeighbors: number,
    nIters = 10,
    maxCandidates = 50,
    delta = 0.001,
    rho = 0.5,
    rpTreeInit = true
  ) {
    const nVertices = data.length;
    const currentGraph = heap.makeHeap(data.length, nNeighbors);

    for (let i = 0; i < data.length; i++) {
      const indices = heap.rejectionSample(nNeighbors, data.length, random);
      for (let j = 0; j < indices.length; j++) {
        const d = distanceFn(data[i], data[indices[j]]);

        heap.heapPush(currentGraph, i, d, indices[j], 1);
        heap.heapPush(currentGraph, indices[j], d, i, 1);
      }
    }
    if (rpTreeInit) {
      for (let n = 0; n < leafArray.length; n++) {
        for (let i = 0; i < leafArray[n].length; i++) {
          if (leafArray[n][i] < 0) {
            break;
          }
          for (let j = i + 1; j < leafArray[n].length; j++) {
            if (leafArray[n][j] < 0) {
              break;
            }
            const d = distanceFn(data[leafArray[n][i]], data[leafArray[n][j]]);
            heap.heapPush(currentGraph, leafArray[n][i], d, leafArray[n][j], 1);
            heap.heapPush(currentGraph, leafArray[n][j], d, leafArray[n][i], 1);
          }
        }
      }
    }

    for (let n = 0; n < nIters; n++) {
      const candidateNeighbors = heap.buildCandidates(
        currentGraph,
        nVertices,
        nNeighbors,
        maxCandidates,
        random
      );

      let c = 0;
      for (let i = 0; i < nVertices; i++) {
        for (let j = 0; j < maxCandidates; j++) {
          let p = Math.floor(candidateNeighbors[0][i][j]);
          if (p < 0 || utils.tauRand(random) < rho) {
            continue;
          }
          for (let k = 0; k < maxCandidates; k++) {
            const q = Math.floor(candidateNeighbors[0][i][k]);
            const cj = candidateNeighbors[2][i][j];
            const ck = candidateNeighbors[2][i][k];
            if (q < 0 || (!cj && !ck)) {
              continue;
            }

            const d = distanceFn(data[p], data[q]);
            c += heap.heapPush(currentGraph, p, d, q, 1);
            c += heap.heapPush(currentGraph, q, d, p, 1);
          }
        }
      }
      if (c <= delta * nNeighbors * data.length) {
        break;
      }
    }
    const sorted = heap.deheapSort(currentGraph);
    return sorted;
  };
}

export type InitFromRandomFn = (
  nNeighbors: number,
  data: Vectors,
  queryPoints: Vectors,
  _heap: heap.Heap,
  random: RandomFn
) => void;

export type InitFromTreeFn = (
  _tree: tree.FlatTree,
  data: Vectors,
  queryPoints: Vectors,
  _heap: heap.Heap,
  random: RandomFn
) => void;

export function makeInitializations(distanceFn: DistanceFn) {
  function initFromRandom(
    nNeighbors: number,
    data: Vectors,
    queryPoints: Vectors,
    _heap: heap.Heap,
    random: RandomFn
  ) {
    for (let i = 0; i < queryPoints.length; i++) {
      const indices = utils.rejectionSample(nNeighbors, data.length, random);
      for (let j = 0; j < indices.length; j++) {
        if (indices[j] < 0) {
          continue;
        }
        const d = distanceFn(data[indices[j]], queryPoints[i]);
        heap.heapPush(_heap, i, d, indices[j], 1);
      }
    }
  }

  function initFromTree(
    _tree: tree.FlatTree,
    data: Vectors,
    queryPoints: Vectors,
    _heap: heap.Heap,
    random: RandomFn
  ) {
    for (let i = 0; i < queryPoints.length; i++) {
      const indices = tree.searchFlatTree(queryPoints[i], _tree, random);

      for (let j = 0; j < indices.length; j++) {
        if (indices[j] < 0) {
          return;
        }
        const d = distanceFn(data[indices[j]], queryPoints[i]);
        heap.heapPush(_heap, i, d, indices[j], 1);
      }
    }
    return;
  }

  return { initFromRandom, initFromTree };
}

export type SearchFn = (
  data: Vectors,
  graph: matrix.SparseMatrix,
  initialization: heap.Heap,
  queryPoints: Vectors
) => heap.Heap;

export function makeInitializedNNSearch(distanceFn: DistanceFn) {
  return function nnSearchFn(
    data: Vectors,
    graph: matrix.SparseMatrix,
    initialization: heap.Heap,
    queryPoints: Vectors
  ) {
    const { indices, indptr } = matrix.getCSR(graph);

    for (let i = 0; i < queryPoints.length; i++) {
      const tried = new Set(initialization[0][i]);
      while (true) {
        // Find smallest flagged vertex
        const vertex = heap.smallestFlagged(initialization, i);

        if (vertex === -1) {
          break;
        }
        const candidates = indices.slice(indptr[vertex], indptr[vertex + 1]);
        for (const candidate of candidates) {
          if (
            candidate === vertex ||
            candidate === -1 ||
            tried.has(candidate)
          ) {
            continue;
          }
          const d = distanceFn(data[candidate], queryPoints[i]);
          heap.uncheckedHeapPush(initialization, i, d, candidate, 1);
          tried.add(candidate);
        }
      }
    }
    return initialization;
  };
}

export function initializeSearch(
  forest: tree.FlatTree[],
  data: Vectors,
  queryPoints: Vectors,
  nNeighbors: number,
  initFromRandom: InitFromRandomFn,
  initFromTree: InitFromTreeFn,
  random: RandomFn
) {
  const results = heap.makeHeap(queryPoints.length, nNeighbors);
  initFromRandom(nNeighbors, data, queryPoints, results, random);
  if (forest) {
    for (let tree of forest) {
      initFromTree(tree, data, queryPoints, results, random);
    }
  }
  return results;
}
