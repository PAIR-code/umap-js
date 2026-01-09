/**
 * Tests for WASM NN-Descent implementation
 * 
 * These tests verify that WASM and JavaScript implementations are correctly
 * selected based on configuration and produce consistent results.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  UMAP,
  NNDescentWrapper,
  isWasmAvailable,
  getDefaultNNDescentConfig,
} from '../src/index';
import * as nnDescentJS from '../src/nn_descent';
import * as heap from '../src/heap';

describe('WASM NN-Descent Configuration', () => {
  test('getDefaultNNDescentConfig creates config with WASM enabled by default', () => {
    const config = getDefaultNNDescentConfig(15);
    
    expect(config.useWasm).toBe(true);
    expect(config.nNeighbors).toBe(15);
    expect(config.nIters).toBe(10);
    expect(config.maxCandidates).toBe(50);
    expect(config.delta).toBe(0.001);
    expect(config.rho).toBe(0.5);
    expect(config.rpTreeInit).toBe(true);
  });

  test('getDefaultNNDescentConfig accepts overrides', () => {
    const config = getDefaultNNDescentConfig(15, {
      useWasm: false,
      nIters: 5,
    });
    
    expect(config.useWasm).toBe(false);
    expect(config.nIters).toBe(5);
    expect(config.nNeighbors).toBe(15);
  });

  test('isWasmAvailable returns a boolean', async () => {
    const available = await isWasmAvailable();
    expect(typeof available).toBe('boolean');
  });
});

describe('NNDescentWrapper Configuration', () => {
  const euclidean = (a: number[], b: number[]): number => {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  };

  test('wrapper stores and retrieves configuration', () => {
    const config = getDefaultNNDescentConfig(10, {
      useWasm: true,
      nIters: 5,
    });

    const wrapper = new NNDescentWrapper(euclidean, Math.random, config);
    const retrievedConfig = wrapper.getConfig();

    expect(retrievedConfig.useWasm).toBe(true);
    expect(retrievedConfig.nIters).toBe(5);
    expect(retrievedConfig.nNeighbors).toBe(10);
  });

  test('wrapper allows configuration updates', () => {
    const config = getDefaultNNDescentConfig(10);
    const wrapper = new NNDescentWrapper(euclidean, Math.random, config);

    wrapper.updateConfig({ nIters: 20 });
    const updated = wrapper.getConfig();

    expect(updated.nIters).toBe(20);
    expect(updated.nNeighbors).toBe(10);
  });
});

describe('NN-Descent Result Consistency', () => {
  const createTestData = (n: number, dim: number, seed: number = 42): number[][] => {
    const data: number[][] = [];
    let random = seed;
    
    for (let i = 0; i < n; i++) {
      const point: number[] = [];
      for (let j = 0; j < dim; j++) {
        random = (random * 1103515245 + 12345) % 2147483647;
        point.push(random / 2147483647);
      }
      data.push(point);
    }
    
    return data;
  };

  const euclidean = (a: number[], b: number[]): number => {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  };

  test('JavaScript NN-Descent produces valid k-NN structure', async () => {
    const data = createTestData(50, 3);
    const config = getDefaultNNDescentConfig(10, {
      useWasm: false,
      nIters: 5,
    });

    let randomState = 12345;
    const random = () => {
      randomState = (randomState * 1103515245 + 12345) % 2147483647;
      return randomState / 2147483647;
    };

    const wrapper = new NNDescentWrapper(euclidean, random, config);
    const { indices, weights } = await wrapper.run(data, [], 'js');

    // Verify structure
    expect(indices.length).toBe(data.length);
    expect(weights.length).toBe(data.length);

    for (let i = 0; i < data.length; i++) {
      expect(indices[i].length).toBe(10);
      expect(weights[i].length).toBe(10);

      // Distances should be non-negative and sorted
      for (let j = 0; j < weights[i].length; j++) {
        expect(weights[i][j]).toBeGreaterThanOrEqual(0);
        
        if (j > 0) {
          expect(weights[i][j]).toBeGreaterThanOrEqual(weights[i][j - 1]);
        }
      }

      // Indices should be valid
      for (let j = 0; j < indices[i].length; j++) {
        expect(indices[i][j]).toBeGreaterThanOrEqual(0);
        expect(indices[i][j]).toBeLessThan(data.length);
      }
    }
  });

  test('WASM and JS produce structurally similar results', async () => {
    const wasmAvailable = await isWasmAvailable();
    
    if (!wasmAvailable) {
      throw new Error('WASM module is not available. Please build WASM first with: cd wasm && cargo build --release --target wasm32-unknown-unknown && wasm-bindgen --out-dir pkg --target web target/wasm32-unknown-unknown/release/umap_wasm_core.wasm');
    }

    const data = createTestData(40, 3, 42);
    
    // Run with JavaScript
    let randomStateJS = 12345;
    const randomJS = () => {
      randomStateJS = (randomStateJS * 1103515245 + 12345) % 2147483647;
      return randomStateJS / 2147483647;
    };

    const configJS = getDefaultNNDescentConfig(8, {
      useWasm: false,
      nIters: 5,
    });
    const wrapperJS = new NNDescentWrapper(euclidean, randomJS, configJS);
    const resultJS = await wrapperJS.run(data, [], 'js');

    // Run with WASM
    let randomStateWasm = 12345;
    const randomWasm = () => {
      randomStateWasm = (randomStateWasm * 1103515245 + 12345) % 2147483647;
      return randomStateWasm / 2147483647;
    };

    const configWasm = getDefaultNNDescentConfig(8, {
      useWasm: true,
      nIters: 5,
    });
    const wrapperWasm = new NNDescentWrapper(euclidean, randomWasm, configWasm);
    const resultWasm = await wrapperWasm.run(data, [], 'wasm');

    // Both should have same structure
    expect(resultJS.indices.length).toBe(resultWasm.indices.length);
    expect(resultJS.weights.length).toBe(resultWasm.weights.length);

    // Compare neighbor quality - check overlap
    let totalOverlap = 0;
    for (let i = 0; i < data.length; i++) {
      const jsSet = new Set(resultJS.indices[i]);
      const wasmSet = new Set(resultWasm.indices[i]);
      
      let overlap = 0;
      for (const idx of jsSet) {
        if (wasmSet.has(idx)) overlap++;
      }
      
      totalOverlap += overlap;
    }

    // Expect at least 50% overlap on average (due to randomness in algorithm)
    const avgOverlap = totalOverlap / (data.length * 8);
    expect(avgOverlap).toBeGreaterThan(0.5);
  }, 30000); // Longer timeout for WASM execution

  test('UMAP with WASM produces valid embeddings', async () => {
    const wasmAvailable = await isWasmAvailable();
    
    if (!wasmAvailable) {
      throw new Error('WASM module is not available. Please build WASM first with: cd wasm && cargo build --release --target wasm32-unknown-unknown && wasm-bindgen --out-dir pkg --target web target/wasm32-unknown-unknown/release/umap_wasm_core.wasm');
    }

    const data = createTestData(30, 3);
    
    const umap = new UMAP({
      nNeighbors: 10,
      nEpochs: 10,
      minDist: 0.1,
      useWasmNNDescent: true,
    });

    const embedding = await umap.fitAsync(data);

    // Verify embedding structure
    expect(embedding.length).toBe(data.length);
    
    for (const point of embedding) {
      expect(point.length).toBe(2); // Default nComponents
      expect(isFinite(point[0])).toBe(true);
      expect(isFinite(point[1])).toBe(true);
    }
  }, 30000);
});

describe('WASM Fallback Behavior', () => {
  const euclidean = (a: number[], b: number[]): number => {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  };

  test('wrapper with useWasm=false forces JavaScript execution', async () => {
    const data: number[][] = [];
    for (let i = 0; i < 20; i++) {
      data.push([Math.random(), Math.random()]);
    }

    const config = getDefaultNNDescentConfig(5, {
      useWasm: false,
    });

    const wrapper = new NNDescentWrapper(euclidean, Math.random, config);
    const result = await wrapper.run(data, [], 'js');

    expect(result.indices.length).toBe(20);
    expect(result.weights.length).toBe(20);
  });

  test('UMAP with useWasmNNDescent=false uses JavaScript', async () => {
    const data: number[][] = [];
    for (let i = 0; i < 15; i++) {
      data.push([i / 15, Math.sin(i), Math.cos(i)]);
    }

    const umap = new UMAP({
      nNeighbors: 5,
      nEpochs: 5,
      useWasmNNDescent: false,
    });

    const embedding = await umap.fitAsync(data);
    
    expect(embedding.length).toBe(data.length);
    expect(embedding[0].length).toBe(2);
  });
});

describe('Heap Operations Consistency', () => {
  test('heap operations produce sorted neighbors', () => {
    const testHeap = heap.makeHeap(10, 5);
    
    // Add some distances
    heap.heapPush(testHeap, 0, 1.5, 5, 1);
    heap.heapPush(testHeap, 0, 0.3, 2, 1);
    heap.heapPush(testHeap, 0, 2.1, 8, 1);
    heap.heapPush(testHeap, 0, 0.8, 4, 1);
    heap.heapPush(testHeap, 0, 1.2, 6, 1);

    const sorted = heap.deheapSort(testHeap);
    
    // Verify sorted order
    for (let i = 1; i < sorted.weights[0].length; i++) {
      if (sorted.weights[0][i] !== Infinity) {
        expect(sorted.weights[0][i]).toBeGreaterThanOrEqual(sorted.weights[0][i - 1]);
      }
    }
  });
});
