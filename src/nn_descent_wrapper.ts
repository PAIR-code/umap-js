/**
 * Unified wrapper for NN-Descent that can use either WASM or pure JavaScript implementation
 */

import * as heap from './heap';
import * as nnDescentJS from './nn_descent';
import * as tree from './tree';
import { DistanceFn, RandomFn, Vectors } from './umap';
import {
  NNDescentExecutionConfig,
  getDefaultNNDescentConfig,
} from './config/nnDescentConfig';

// Type for WASM module (will be loaded dynamically)
type WasmModule = {
  NNDescentRunner: any;
  RandomState: any;
  build_rp_forest: any;
};

let wasmModule: WasmModule | null = null;
let wasmLoadPromise: Promise<WasmModule> | null = null;

/**
 * Load the WASM module
 */
async function loadWasmModule(): Promise<WasmModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (!wasmLoadPromise) {
    wasmLoadPromise = (async () => {
      try {
        // Dynamic import of the WASM module
        // @ts-ignore - WASM package generated at build time
        const wasm = await import('../wasm/pkg');
        wasmModule = {
          NNDescentRunner: wasm.NNDescentRunner,
          RandomState: wasm.RandomState,
          build_rp_forest: wasm.build_rp_forest,
        };
        return wasmModule!;
      } catch (error) {
        console.warn(
          'Failed to load WASM module, falling back to JavaScript:',
          error
        );
        throw error;
      }
    })();
  }

  return wasmLoadPromise;
}

/**
 * Check if WASM is available
 */
export async function isWasmAvailable(): Promise<boolean> {
  try {
    await loadWasmModule();
    return true;
  } catch {
    return false;
  }
}

/**
 * NN-Descent wrapper that supports both WASM and JavaScript implementations
 */
export class NNDescentWrapper {
  private config: Required<NNDescentExecutionConfig>;
  private distanceFn: DistanceFn;
  private random: RandomFn;

  constructor(
    distanceFn: DistanceFn,
    random: RandomFn,
    config: NNDescentExecutionConfig
  ) {
    this.config = getDefaultNNDescentConfig(config.nNeighbors, config);
    this.distanceFn = distanceFn;
    this.random = random;
  }

  /**
   * Run NN-Descent algorithm
   */
  async run(
    data: Vectors,
    leafArray: Vectors,
    forceImplementation?: 'wasm' | 'js'
  ): Promise<{ indices: number[][]; weights: number[][] }> {
    const useWasm =
      forceImplementation === 'wasm'
        ? true
        : forceImplementation === 'js'
        ? false
        : this.config.useWasm;

    if (useWasm) {
      try {
        return await this.runWasm(data, leafArray);
      } catch (error) {
        console.warn('WASM execution failed, falling back to JavaScript:', error);
        return this.runJS(data, leafArray);
      }
    } else {
      return this.runJS(data, leafArray);
    }
  }

  /**
   * Run using WASM implementation
   */
  private async runWasm(
    data: Vectors,
    leafArray: Vectors
  ): Promise<{ indices: number[][]; weights: number[][] }> {
    const wasm = await loadWasmModule();

    // Flatten data for WASM
    const nSamples = data.length;
    const nFeatures = data[0].length;
    const flatData = new Float64Array(nSamples * nFeatures);
    for (let i = 0; i < nSamples; i++) {
      for (let j = 0; j < nFeatures; j++) {
        flatData[i * nFeatures + j] = data[i][j];
      }
    }

    // Create random state for WASM
    const randomState = new wasm.RandomState(this.random() * 1000000);

    // Create and configure NN-Descent runner
    const runner = new wasm.NNDescentRunner(this.config.nNeighbors);
    runner.set_n_iters(this.config.nIters);
    runner.set_max_candidates(this.config.maxCandidates);
    runner.set_delta(this.config.delta);
    runner.set_rho(this.config.rho);
    runner.set_rp_tree_init(this.config.rpTreeInit);

    // Run NN-Descent
    const result = runner.run(flatData, nSamples, nFeatures, randomState);

    // Parse results
    const indicesFlat = Array.from(result[0]) as number[];
    const distancesFlat = Array.from(result[1]) as number[];

    const indices: number[][] = [];
    const weights: number[][] = [];

    for (let i = 0; i < nSamples; i++) {
      const start = i * this.config.nNeighbors;
      const end = start + this.config.nNeighbors;
      indices.push(indicesFlat.slice(start, end).map(Math.floor));
      weights.push(distancesFlat.slice(start, end));
    }

    return { indices, weights };
  }

  /**
   * Run using pure JavaScript implementation
   */
  private runJS(
    data: Vectors,
    leafArray: Vectors
  ): { indices: number[][]; weights: number[][] } {
    const nnDescent = nnDescentJS.makeNNDescent(this.distanceFn, this.random);
    const result = nnDescent(
      data,
      leafArray,
      this.config.nNeighbors,
      this.config.nIters,
      this.config.maxCandidates,
      this.config.delta,
      this.config.rho,
      this.config.rpTreeInit
    );

    return result;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NNDescentExecutionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<NNDescentExecutionConfig>> {
    return { ...this.config };
  }
}

/**
 * Create NN-Descent function with configurable WASM/JS execution
 */
export function makeConfigurableNNDescent(
  distanceFn: DistanceFn,
  random: RandomFn,
  config: NNDescentExecutionConfig
) {
  const wrapper = new NNDescentWrapper(distanceFn, random, config);

  return async (
    data: Vectors,
    leafArray: Vectors,
    nNeighbors?: number,
    nIters?: number,
    maxCandidates?: number,
    delta?: number,
    rho?: number,
    rpTreeInit?: boolean
  ) => {
    // Update config with any provided parameters
    if (nNeighbors !== undefined) wrapper.updateConfig({ nNeighbors });
    if (nIters !== undefined) wrapper.updateConfig({ nIters });
    if (maxCandidates !== undefined) wrapper.updateConfig({ maxCandidates });
    if (delta !== undefined) wrapper.updateConfig({ delta });
    if (rho !== undefined) wrapper.updateConfig({ rho });
    if (rpTreeInit !== undefined) wrapper.updateConfig({ rpTreeInit });

    return wrapper.run(data, leafArray);
  };
}

/**
 * Create random projection forest with configurable WASM/JS execution
 */
export async function makeConfigurableForest(
  data: Vectors,
  nNeighbors: number,
  nTrees: number,
  random: RandomFn,
  useWasm = true
): Promise<tree.FlatTree[]> {
  if (useWasm) {
    try {
      const wasm = await loadWasmModule();
      const nSamples = data.length;
      const nFeatures = data[0].length;

      // Flatten data
      const flatData = new Float64Array(nSamples * nFeatures);
      for (let i = 0; i < nSamples; i++) {
        for (let j = 0; j < nFeatures; j++) {
          flatData[i * nFeatures + j] = data[i][j];
        }
      }

      const randomState = new wasm.RandomState(random() * 1000000);
      const forestJS = wasm.build_rp_forest(
        flatData,
        nSamples,
        nFeatures,
        nNeighbors,
        nTrees,
        randomState
      );

      // Convert back to TypeScript format
      const forest: tree.FlatTree[] = [];
      for (let i = 0; i < forestJS.length; i++) {
        const treeJS = forestJS[i];
        forest.push(
          new tree.FlatTree(
            Array.from(treeJS.hyperplanes),
            Array.from(treeJS.offsets),
            Array.from(treeJS.children),
            Array.from(treeJS.indices)
          )
        );
      }

      return forest;
    } catch (error) {
      console.warn('WASM forest creation failed, falling back to JavaScript:', error);
    }
  }

  // Fallback to JavaScript
  return tree.makeForest(data, nNeighbors, nTrees, random);
}

/**
 * Export configuration utilities
 */
export { NNDescentExecutionConfig, getDefaultNNDescentConfig };
