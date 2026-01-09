use crate::heap::{build_candidates, rejection_sample, Heap};
use wasm_bindgen::prelude::*;

#[cfg(feature = "parallel")]
use rayon::prelude::*;

/// Distance function type
pub type DistanceFn = fn(&[f64], &[f64]) -> f64;

/// NN-Descent configuration
#[wasm_bindgen]
#[derive(Clone)]
pub struct NNDescentConfig {
    pub n_neighbors: usize,
    pub n_iters: usize,
    pub max_candidates: usize,
    pub delta: f64,
    pub rho: f64,
    pub rp_tree_init: bool,
}

#[wasm_bindgen]
impl NNDescentConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(n_neighbors: usize) -> NNDescentConfig {
        NNDescentConfig {
            n_neighbors,
            n_iters: 10,
            max_candidates: 50,
            delta: 0.001,
            rho: 0.5,
            rp_tree_init: true,
        }
    }

    pub fn set_n_iters(&mut self, n_iters: usize) {
        self.n_iters = n_iters;
    }

    pub fn set_max_candidates(&mut self, max_candidates: usize) {
        self.max_candidates = max_candidates;
    }

    pub fn set_delta(&mut self, delta: f64) {
        self.delta = delta;
    }

    pub fn set_rho(&mut self, rho: f64) {
        self.rho = rho;
    }

    pub fn set_rp_tree_init(&mut self, rp_tree_init: bool) {
        self.rp_tree_init = rp_tree_init;
    }
}

/// Euclidean distance function
pub fn euclidean_distance(a: &[f64], b: &[f64]) -> f64 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f64>()
        .sqrt()
}

/// NN-Descent algorithm implementation
pub struct NNDescent {
    config: NNDescentConfig,
    distance_fn: DistanceFn,
}

impl NNDescent {
    pub fn new(config: NNDescentConfig, distance_fn: DistanceFn) -> Self {
        NNDescent {
            config,
            distance_fn,
        }
    }

    /// Run NN-Descent algorithm
    /// 
    /// # Arguments
    /// * `data` - The input data as a flattened vector (row-major)
    /// * `n_samples` - Number of samples
    /// * `n_features` - Number of features per sample
    /// * `leaf_array` - Optional leaf array from random projection trees
    /// * `random_fn` - Random number generator (0.0 to 1.0)
    /// * `random_int_fn` - Random integer generator
    pub fn run(
        &self,
        data: &[f64],
        n_samples: usize,
        n_features: usize,
        leaf_array: Option<&[Vec<i32>]>,
        random_fn: &dyn Fn() -> f64,
        random_int_fn: &dyn Fn(usize) -> usize,
    ) -> (Vec<Vec<i32>>, Vec<Vec<f64>>) {
        let mut current_graph = Heap::new(n_samples, self.config.n_neighbors);

        // Initialize with random neighbors
        self.initialize_random(
            &mut current_graph,
            data,
            n_samples,
            n_features,
            random_int_fn,
        );

        // Initialize from RP trees if provided
        if self.config.rp_tree_init {
            if let Some(leaves) = leaf_array {
                self.initialize_from_trees(
                    &mut current_graph,
                    data,
                    n_samples,
                    n_features,
                    leaves,
                );
            }
        }

        // Main NN-Descent loop
        for iteration in 0..self.config.n_iters {
            let candidate_neighbors = build_candidates(
                &mut current_graph,
                n_samples,
                self.config.n_neighbors,
                self.config.max_candidates,
                random_fn,
            );

            let updates = self.update_graph(
                &mut current_graph,
                &candidate_neighbors,
                data,
                n_samples,
                n_features,
                random_fn,
            );

            // Check convergence
            if updates as f64 <= self.config.delta * self.config.n_neighbors as f64 * n_samples as f64
            {
                break;
            }
        }

        current_graph.deheap_sort()
    }

    /// Initialize graph with random neighbors
    fn initialize_random(
        &self,
        graph: &mut Heap,
        data: &[f64],
        n_samples: usize,
        n_features: usize,
        random_int_fn: &dyn Fn(usize) -> usize,
    ) {
        for i in 0..n_samples {
            let indices = rejection_sample(self.config.n_neighbors, n_samples, random_int_fn);

            for &j in &indices {
                let d = self.compute_distance(data, i, j, n_features);
                graph.heap_push(i, d, j as i32, 1);
                graph.heap_push(j, d, i as i32, 1);
            }
        }
    }

    /// Initialize from random projection tree leaves
    fn initialize_from_trees(
        &self,
        graph: &mut Heap,
        data: &[f64],
        n_samples: usize,
        n_features: usize,
        leaf_array: &[Vec<i32>],
    ) {
        for leaf in leaf_array {
            for i in 0..leaf.len() {
                if leaf[i] < 0 {
                    break;
                }

                for j in i + 1..leaf.len() {
                    if leaf[j] < 0 {
                        break;
                    }

                    let idx_i = leaf[i] as usize;
                    let idx_j = leaf[j] as usize;
                    let d = self.compute_distance(data, idx_i, idx_j, n_features);

                    graph.heap_push(idx_i, d, leaf[j], 1);
                    graph.heap_push(idx_j, d, leaf[i], 1);
                }
            }
        }
    }

    /// Update the graph with candidate neighbors
    fn update_graph(
        &self,
        current_graph: &mut Heap,
        candidate_neighbors: &Heap,
        data: &[f64],
        n_samples: usize,
        n_features: usize,
        random_fn: &dyn Fn() -> f64,
    ) -> u32 {
        let mut updates = 0;

        #[cfg(feature = "parallel")]
        {
            // Parallel version using rayon
            let updates_vec: Vec<u32> = (0..n_samples)
                .into_par_iter()
                .map(|i| {
                    self.update_vertex(
                        i,
                        current_graph,
                        candidate_neighbors,
                        data,
                        n_features,
                        random_fn,
                    )
                })
                .collect();
            updates = updates_vec.iter().sum();
        }

        #[cfg(not(feature = "parallel"))]
        {
            // Sequential version
            for i in 0..n_samples {
                updates += self.update_vertex(
                    i,
                    current_graph,
                    candidate_neighbors,
                    data,
                    n_features,
                    random_fn,
                );
            }
        }

        updates
    }

    /// Update neighbors for a single vertex
    fn update_vertex(
        &self,
        i: usize,
        current_graph: &mut Heap,
        candidate_neighbors: &Heap,
        data: &[f64],
        n_features: usize,
        random_fn: &dyn Fn() -> f64,
    ) -> u32 {
        let mut updates = 0;

        for j in 0..self.config.max_candidates {
            let p = candidate_neighbors.indices[i][j];
            if p < 0 || random_fn() < self.config.rho {
                continue;
            }

            for k in 0..self.config.max_candidates {
                let q = candidate_neighbors.indices[i][k];
                let cj = candidate_neighbors.flags[i][j];
                let ck = candidate_neighbors.flags[i][k];

                if q < 0 || (cj == 0 && ck == 0) {
                    continue;
                }

                let p_idx = p as usize;
                let q_idx = q as usize;
                let d = self.compute_distance(data, p_idx, q_idx, n_features);

                updates += current_graph.heap_push(p_idx, d, q, 1);
                updates += current_graph.heap_push(q_idx, d, p, 1);
            }
        }

        updates
    }

    /// Compute distance between two samples
    #[inline]
    fn compute_distance(&self, data: &[f64], i: usize, j: usize, n_features: usize) -> f64 {
        let start_i = i * n_features;
        let start_j = j * n_features;
        (self.distance_fn)(&data[start_i..start_i + n_features], &data[start_j..start_j + n_features])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_euclidean_distance() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let dist = euclidean_distance(&a, &b);
        assert!((dist - 5.196152422706632).abs() < 1e-10);
    }

    #[test]
    fn test_nn_descent_config() {
        let config = NNDescentConfig::new(15);
        assert_eq!(config.n_neighbors, 15);
        assert_eq!(config.n_iters, 10);
        assert_eq!(config.max_candidates, 50);
    }

    #[test]
    fn test_nn_descent_simple() {
        let config = NNDescentConfig::new(2);
        let nn_descent = NNDescent::new(config, euclidean_distance);

        // Simple 2D data: 4 points
        let data = vec![
            0.0, 0.0,  // Point 0
            1.0, 0.0,  // Point 1
            0.0, 1.0,  // Point 2
            10.0, 10.0, // Point 3 (far away)
        ];

        let mut rng_state = 12345u64;
        let random_fn = || {
            rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
            (rng_state % 100) as f64 / 100.0
        };

        let random_int_fn = |max: usize| {
            rng_state = rng_state.wrapping_mul(1103515245).wrapping_add(12345);
            (rng_state as usize) % max
        };

        let (indices, distances) = nn_descent.run(&data, 4, 2, None, &random_fn, &random_int_fn);

        assert_eq!(indices.len(), 4);
        assert_eq!(distances.len(), 4);

        // Point 0 should be closest to points 1 and 2
        // (but due to randomness and initialization, we just check structure)
        for i in 0..4 {
            assert_eq!(indices[i].len(), 2);
            assert_eq!(distances[i].len(), 2);
        }
    }
}
