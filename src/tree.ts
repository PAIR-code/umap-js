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

import * as utils from './utils';
import { RandomFn, Vector, Vectors } from './umap';

/**
 * Tree functionality for approximating nearest neighbors
 */
interface RandomProjectionTreeNode {
  isLeaf: boolean;
  indices?: number[];
  leftChild?: RandomProjectionTreeNode;
  rightChild?: RandomProjectionTreeNode;
  hyperplane?: number[];
  offset?: number;
}

export class FlatTree {
  constructor(
    public hyperplanes: number[][],
    public offsets: number[],
    public children: number[][],
    public indices: number[][]
  ) {}
}

/**
 * Build a random projection forest with ``nTrees``.
 */
export function makeForest(
  data: Vectors,
  nNeighbors: number,
  nTrees: number,
  random: RandomFn
) {
  const leafSize = Math.max(10, nNeighbors);

  const trees = utils
    .range(nTrees)
    .map((_, i) => makeTree(data, leafSize, i, random));
  const forest = trees.map(tree => flattenTree(tree, leafSize));

  return forest;
}

/**
 * Construct a random projection tree based on ``data`` with leaves
 * of size at most ``leafSize``
 */
function makeTree(
  data: Vectors,
  leafSize = 30,
  n: number,
  random: RandomFn
): RandomProjectionTreeNode {
  const indices = utils.range(data.length);
  const tree = makeEuclideanTree(data, indices, leafSize, n, random);
  return tree;
}

function makeEuclideanTree(
  data: Vectors,
  indices: number[],
  leafSize = 30,
  q: number,
  random: RandomFn
): RandomProjectionTreeNode {
  if (indices.length > leafSize) {
    const splitResults = euclideanRandomProjectionSplit(data, indices, random);
    const { indicesLeft, indicesRight, hyperplane, offset } = splitResults;

    const leftChild = makeEuclideanTree(
      data,
      indicesLeft,
      leafSize,
      q + 1,
      random
    );
    const rightChild = makeEuclideanTree(
      data,
      indicesRight,
      leafSize,
      q + 1,
      random
    );

    const node = { leftChild, rightChild, isLeaf: false, hyperplane, offset };
    return node;
  } else {
    const node = { indices, isLeaf: true };
    return node;
  }
}

/**
 * Given a set of ``indices`` for data points from ``data``, create
 * a random hyperplane to split the data, returning two arrays indices
 * that fall on either side of the hyperplane. This is the basis for a
 * random projection tree, which simply uses this splitting recursively.
 * This particular split uses euclidean distance to determine the hyperplane
 * and which side each data sample falls on.
 */
function euclideanRandomProjectionSplit(
  data: Vectors,
  indices: number[],
  random: RandomFn
) {
  const dim = data[0].length;

  // Select two random points, set the hyperplane between them
  let leftIndex = utils.tauRandInt(indices.length, random);
  let rightIndex = utils.tauRandInt(indices.length, random);
  rightIndex += leftIndex === rightIndex ? 1 : 0;
  rightIndex = rightIndex % indices.length;
  const left = indices[leftIndex];
  const right = indices[rightIndex];

  // Compute the normal vector to the hyperplane (the vector between the two
  // points) and the offset from the origin
  let hyperplaneOffset = 0;
  const hyperplaneVector = utils.zeros(dim);

  for (let i = 0; i < hyperplaneVector.length; i++) {
    hyperplaneVector[i] = data[left][i] - data[right][i];
    hyperplaneOffset -=
      (hyperplaneVector[i] * (data[left][i] + data[right][i])) / 2.0;
  }

  // For each point compute the margin (project into normal vector)
  // If we are on lower side of the hyperplane put in one pile, otherwise
  // put it in the other pile (if we hit hyperplane on the nose, flip a coin)
  let nLeft = 0;
  let nRight = 0;
  const side = utils.zeros(indices.length);
  for (let i = 0; i < indices.length; i++) {
    let margin = hyperplaneOffset;
    for (let d = 0; d < dim; d++) {
      margin += hyperplaneVector[d] * data[indices[i]][d];
    }
    if (margin === 0) {
      side[i] = utils.tauRandInt(2, random);
      if (side[i] === 0) {
        nLeft += 1;
      } else {
        nRight += 1;
      }
    } else if (margin > 0) {
      side[i] = 0;
      nLeft += 1;
    } else {
      side[i] = 1;
      nRight += 1;
    }
  }

  // Now that we have the counts, allocate arrays
  const indicesLeft = utils.zeros(nLeft);
  const indicesRight = utils.zeros(nRight);

  // Populate the arrays with indices according to which side they fell on
  nLeft = 0;
  nRight = 0;
  for (let i = 0; i < side.length; i++) {
    if (side[i] === 0) {
      indicesLeft[nLeft] = indices[i];
      nLeft += 1;
    } else {
      indicesRight[nRight] = indices[i];
      nRight += 1;
    }
  }

  return {
    indicesLeft,
    indicesRight,
    hyperplane: hyperplaneVector,
    offset: hyperplaneOffset,
  };
}

function flattenTree(tree: RandomProjectionTreeNode, leafSize: number) {
  const nNodes = numNodes(tree);
  const nLeaves = numLeaves(tree);

  // TODO: Verify that sparse code is not relevant...
  const hyperplanes = utils
    .range(nNodes)
    .map(() => utils.zeros(tree.hyperplane ? tree.hyperplane.length : 0));

  const offsets = utils.zeros(nNodes);
  const children = utils.range(nNodes).map(() => [-1, -1]);
  const indices = utils
    .range(nLeaves)
    .map(() => utils.range(leafSize).map(() => -1));
  recursiveFlatten(tree, hyperplanes, offsets, children, indices, 0, 0);
  return new FlatTree(hyperplanes, offsets, children, indices);
}

function recursiveFlatten(
  tree: RandomProjectionTreeNode,
  hyperplanes: number[][],
  offsets: number[],
  children: number[][],
  indices: number[][],
  nodeNum: number,
  leafNum: number
): { nodeNum: number; leafNum: number } {
  if (tree.isLeaf) {
    children[nodeNum][0] = -leafNum;

    // TODO: Triple check this operation corresponds to
    // indices[leafNum : tree.indices.shape[0]] = tree.indices
    indices[leafNum].splice(0, tree.indices!.length, ...tree.indices!);
    leafNum += 1;
    return { nodeNum, leafNum };
  } else {
    hyperplanes[nodeNum] = tree.hyperplane!;
    offsets[nodeNum] = tree.offset!;
    children[nodeNum][0] = nodeNum + 1;
    const oldNodeNum = nodeNum;

    let res = recursiveFlatten(
      tree.leftChild!,
      hyperplanes,
      offsets,
      children,
      indices,
      nodeNum + 1,
      leafNum
    );
    nodeNum = res.nodeNum;
    leafNum = res.leafNum;

    children[oldNodeNum][1] = nodeNum + 1;

    res = recursiveFlatten(
      tree.rightChild!,
      hyperplanes,
      offsets,
      children,
      indices,
      nodeNum + 1,
      leafNum
    );
    return { nodeNum: res.nodeNum, leafNum: res.leafNum };
  }
}

function numNodes(tree: RandomProjectionTreeNode): number {
  if (tree.isLeaf) {
    return 1;
  } else {
    return 1 + numNodes(tree.leftChild!) + numNodes(tree.rightChild!);
  }
}

function numLeaves(tree: RandomProjectionTreeNode): number {
  if (tree.isLeaf) {
    return 1;
  } else {
    return numLeaves(tree.leftChild!) + numLeaves(tree.rightChild!);
  }
}

/**
 * Generate an array of sets of candidate nearest neighbors by
 * constructing a random projection forest and taking the leaves of all the
 * trees. Any given tree has leaves that are a set of potential nearest
 * neighbors. Given enough trees the set of all such leaves gives a good
 * likelihood of getting a good set of nearest neighbors in composite. Since
 * such a random projection forest is inexpensive to compute, this can be a
 * useful means of seeding other nearest neighbor algorithms.
 */
export function makeLeafArray(rpForest: FlatTree[]): number[][] {
  if (rpForest.length > 0) {
    const output: number[][] = [];
    for (let tree of rpForest) {
      output.push(...tree.indices!);
    }
    return output;
  } else {
    return [[-1]];
  }
}

/**
 * Selects the side of the tree to search during flat tree search.
 */
function selectSide(
  hyperplane: number[],
  offset: number,
  point: Vector,
  random: RandomFn
) {
  let margin = offset;
  for (let d = 0; d < point.length; d++) {
    margin += hyperplane[d] * point[d];
  }

  if (margin === 0) {
    const side = utils.tauRandInt(2, random);
    return side;
  } else if (margin > 0) {
    return 0;
  } else {
    return 1;
  }
}

/**
 * Searches a flattened rp-tree for a point.
 */
export function searchFlatTree(
  point: Vector,
  tree: FlatTree,
  random: RandomFn
) {
  let node = 0;
  while (tree.children[node][0] > 0) {
    const side = selectSide(
      tree.hyperplanes[node],
      tree.offsets[node],
      point,
      random
    );
    if (side === 0) {
      node = tree.children[node][0];
    } else {
      node = tree.children[node][1];
    }
  }

  const index = -1 * tree.children[node][0];
  return tree.indices[index];
}
