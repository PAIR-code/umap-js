/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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

import * as vector from './vector';
import * as util from './util';

export type DistanceFunction = (a: vector.Vector, b: vector.Vector) => number;
export type ProjectionComponents3D = [string, string, string];

export interface PointMetadata {
  [key: string]: number | string;
}

/** Matches the json format of `projector_config.proto` */
export interface SpriteMetadata {
  imagePath: string;
  singleImageDim: [number, number];
}

export interface DataProto {
  shape: [number, number];
  tensor: number[];
  metadata: {
    columns: Array<{
      name: string;
      stringValues: string[];
      numericValues: number[];
    }>;
    sprite: { imageBase64: string; singleImageDim: [number, number] };
  };
}

/** Statistics for a metadata column. */
export interface ColumnStats {
  name: string;
  isNumeric: boolean;
  tooManyUniqueValues: boolean;
  uniqueEntries?: Array<{ label: string; count: number }>;
  min: number;
  max: number;
}

export interface SpriteAndMetadataInfo {
  stats?: ColumnStats[];
  pointsInfo?: PointMetadata[];
  spriteImage?: HTMLImageElement;
  spriteMetadata?: SpriteMetadata;
}

/** A single collection of points which make up a sequence through space. */
export interface Sequence {
  /** Indices into the DataPoints array in the Data object. */
  pointIndices: number[];
}

export interface DataPoint {
  /** The point in the original space. */
  originalVector: Float32Array;

  /** The point in the projected space. */
  vector: Float32Array;

  /*
   * Metadata for each point. Each metadata is a set of key/value pairs
   * where the value can be a string or a number.
   */
  metadata: PointMetadata;

  /** index of the sequence, used for highlighting on click */
  sequenceIndex?: number;

  /** index in the original data source */
  index: number;
}

const IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
/** Controls whether nearest neighbors computation is done on the GPU or CPU. */
const KNN_GPU_ENABLED = util.hasWebGLSupport() && !IS_FIREFOX;

export const TSNE_SAMPLE_SIZE = 10000;
export const UMAP_SAMPLE_SIZE = 5000;
export const PCA_SAMPLE_SIZE = 50000;
/** Number of dimensions to sample when doing approximate PCA. */
export const PCA_SAMPLE_DIM = 200;
/** Number of pca components to compute. */
const NUM_PCA_COMPONENTS = 10;

/** Id of message box used for umap optimization progress bar. */
const UMAP_MSG_ID = 'umap-optimization';

/**
 * Reserved metadata attributes used for sequence information
 * NOTE: Use "__seq_next__" as "__next__" is deprecated.
 */
const SEQUENCE_METADATA_ATTRS = ['__next__', '__seq_next__'];

function getSequenceNextPointIndex(
  pointMetadata: PointMetadata
): number | null {
  let sequenceAttr: string | number | null = null;
  for (let metadataAttr of SEQUENCE_METADATA_ATTRS) {
    if (metadataAttr in pointMetadata && pointMetadata[metadataAttr] !== '') {
      sequenceAttr = pointMetadata[metadataAttr];
      break;
    }
  }
  if (sequenceAttr == null) {
    return null;
  }
  return +sequenceAttr;
}

export class DataSet {
  constructor(public points: DataPoint[]) {}
}

export class Projection {
  constructor(public dataSet: DataSet, public components: number) {}
}
