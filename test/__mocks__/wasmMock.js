/**
 * Mock for WASM module in Jest environment
 * 
 * The actual WASM module cannot be loaded in Node.js/Jest because:
 * 1. wasm-bindgen --target web generates ES modules with dynamic imports
 * 2. Jest runs in Node.js which has different module loading
 * 3. WASM modules need special initialization in Node.js
 * 
 * This mock intentionally throws to ensure tests fail if WASM is required
 * but not available, which is the desired behavior.
 */

// Export nothing - any attempt to import will fail at runtime
// This ensures isWasmAvailable() returns false correctly
module.exports = {};
