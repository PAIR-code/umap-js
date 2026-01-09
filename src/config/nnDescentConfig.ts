/**
 * Configuration for NN-Descent algorithm execution
 */
export interface NNDescentExecutionConfig {
  /**
   * Whether to use WASM implementation (true) or pure JavaScript (false)
   * @default true
   */
  useWasm?: boolean;

  /**
   * Number of nearest neighbors to find
   */
  nNeighbors: number;

  /**
   * Number of iterations for NN-Descent
   * @default 10
   */
  nIters?: number;

  /**
   * Maximum number of candidates to consider
   * @default 50
   */
  maxCandidates?: number;

  /**
   * Convergence threshold
   * @default 0.001
   */
  delta?: number;

  /**
   * Sampling rate for refinement
   * @default 0.5
   */
  rho?: number;

  /**
   * Whether to use random projection tree initialization
   * @default true
   */
  rpTreeInit?: boolean;
}

/**
 * Get the default configuration with sensible defaults
 */
export function getDefaultNNDescentConfig(
  nNeighbors: number,
  overrides?: Partial<NNDescentExecutionConfig>
): Required<NNDescentExecutionConfig> {
  return {
    useWasm: true,
    nNeighbors,
    nIters: 10,
    maxCandidates: 50,
    delta: 0.001,
    rho: 0.5,
    rpTreeInit: true,
    ...overrides,
  };
}
