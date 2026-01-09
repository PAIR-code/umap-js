/**
 * Example demonstrating WASM-accelerated NN-Descent
 */

import {
  UMAP,
  NNDescentWrapper,
  isWasmAvailable,
  getDefaultNNDescentConfig,
} from '../src/index';

// Example 1: Using UMAP with automatic WASM acceleration
async function example1() {
  console.log('=== Example 1: UMAP with WASM ===');

  // Generate sample data
  const data: number[][] = [];
  for (let i = 0; i < 100; i++) {
    data.push([Math.random(), Math.random(), Math.random()]);
  }

  // Create UMAP instance (WASM enabled by default)
  const umap = new UMAP({
    nNeighbors: 15,
    minDist: 0.1,
    nComponents: 2,
  });

  // Fit the model
  const embedding = await umap.fitAsync(data, (epochNumber) => {
    if (epochNumber % 50 === 0) {
      console.log(`  Epoch ${epochNumber}`);
    }
  });

  console.log(`  Result: ${embedding.length} points embedded`);
}

// Example 2: Explicitly controlling WASM usage
async function example2() {
  console.log('\n=== Example 2: Controlling WASM Usage ===');

  const data: number[][] = [];
  for (let i = 0; i < 100; i++) {
    data.push([Math.random(), Math.random(), Math.random()]);
  }

  // Check if WASM is available
  const wasmAvailable = await isWasmAvailable();
  console.log(`  WASM available: ${wasmAvailable}`);

  // Use JavaScript implementation explicitly
  const umapJS = new UMAP({
    nNeighbors: 15,
    useWasmNNDescent: false, // Force JavaScript
  });

  console.log('  Running with pure JavaScript...');
  const start = Date.now();
  await umapJS.fitAsync(data);
  const jsTime = Date.now() - start;
  console.log(`  JavaScript time: ${jsTime}ms`);

  // Use WASM implementation explicitly
  if (wasmAvailable) {
    const umapWasm = new UMAP({
      nNeighbors: 15,
      useWasmNNDescent: true, // Force WASM
    });

    console.log('  Running with WASM...');
    const start2 = Date.now();
    await umapWasm.fitAsync(data);
    const wasmTime = Date.now() - start2;
    console.log(`  WASM time: ${wasmTime}ms`);
    console.log(`  Speedup: ${(jsTime / wasmTime).toFixed(2)}x`);
  }
}

// Example 3: Using NNDescentWrapper directly
async function example3() {
  console.log('\n=== Example 3: Direct NNDescentWrapper Usage ===');

  const data: number[][] = [];
  for (let i = 0; i < 50; i++) {
    data.push([Math.random(), Math.random()]);
  }

  // Euclidean distance function
  const euclidean = (a: number[], b: number[]): number => {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  };

  // Create wrapper with configuration
  const config = getDefaultNNDescentConfig(10, {
    useWasm: true,
    nIters: 5,
  });

  const wrapper = new NNDescentWrapper(euclidean, Math.random, config);

  console.log('  Running NN-Descent...');
  console.log(`  Configuration:`, wrapper.getConfig());

  // Run with empty leaf array (no RP tree initialization)
  const { indices, weights } = await wrapper.run(data, []);

  console.log(`  Found neighbors for ${indices.length} points`);
  console.log(`  Sample neighbors for point 0:`, indices[0]);
  console.log(`  Sample distances for point 0:`, weights[0]);
}

// Example 4: Benchmarking different configurations
async function example4() {
  console.log('\n=== Example 4: Configuration Benchmarks ===');

  const sizes = [50, 100, 200];

  for (const size of sizes) {
    console.log(`\n  Dataset size: ${size}`);

    const data: number[][] = [];
    for (let i = 0; i < size; i++) {
      data.push([Math.random(), Math.random(), Math.random()]);
    }

    // Test with JavaScript
    const umapJS = new UMAP({
      nNeighbors: 10,
      nEpochs: 100,
      useWasmNNDescent: false,
    });

    const startJS = Date.now();
    await umapJS.fitAsync(data);
    const timeJS = Date.now() - startJS;
    console.log(`    JavaScript: ${timeJS}ms`);

    // Test with WASM
    if (await isWasmAvailable()) {
      const umapWasm = new UMAP({
        nNeighbors: 10,
        nEpochs: 100,
        useWasmNNDescent: true,
      });

      const startWasm = Date.now();
      await umapWasm.fitAsync(data);
      const timeWasm = Date.now() - startWasm;
      console.log(`    WASM: ${timeWasm}ms`);
      console.log(`    Speedup: ${(timeJS / timeWasm).toFixed(2)}x`);
    }
  }
}

// Run all examples
async function runExamples() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  runExamples();
}

export { example1, example2, example3, example4, runExamples };
