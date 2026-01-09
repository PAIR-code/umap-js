use wasm_bindgen::prelude::*;

#[cfg(feature = "allocator")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

pub mod heap;
pub mod nn_descent;
pub mod tree;

use js_sys::Float64Array;
use std::cell::RefCell;
use std::rc::Rc;

/// Simple helper to ensure the wasm is loaded and working.
#[wasm_bindgen]
pub fn version() -> String {
    "umap-wasm core 0.1.0".to_string()
}

/// Random number generator wrapper for JS
#[wasm_bindgen]
pub struct RandomState {
    state: Rc<RefCell<u64>>,
}

#[wasm_bindgen]
impl RandomState {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: f64) -> RandomState {
        RandomState {
            state: Rc::new(RefCell::new(seed as u64)),
        }
    }

    pub fn random(&self) -> f64 {
        let mut state = self.state.borrow_mut();
        *state = state.wrapping_mul(1103515245).wrapping_add(12345);
        (*state % 100) as f64 / 100.0
    }

    pub fn random_int(&self, max: usize) -> usize {
        let mut state = self.state.borrow_mut();
        *state = state.wrapping_mul(1103515245).wrapping_add(12345);
        (*state as usize) % max
    }
}

/// WASM-exposed NN-Descent runner
#[wasm_bindgen]
pub struct NNDescentRunner {
    config: nn_descent::NNDescentConfig,
}

#[wasm_bindgen]
impl NNDescentRunner {
    #[wasm_bindgen(constructor)]
    pub fn new(n_neighbors: usize) -> NNDescentRunner {
        NNDescentRunner {
            config: nn_descent::NNDescentConfig::new(n_neighbors),
        }
    }

    pub fn set_n_iters(&mut self, n_iters: usize) {
        self.config.set_n_iters(n_iters);
    }

    pub fn set_max_candidates(&mut self, max_candidates: usize) {
        self.config.set_max_candidates(max_candidates);
    }

    pub fn set_delta(&mut self, delta: f64) {
        self.config.set_delta(delta);
    }

    pub fn set_rho(&mut self, rho: f64) {
        self.config.set_rho(rho);
    }

    pub fn set_rp_tree_init(&mut self, rp_tree_init: bool) {
        self.config.set_rp_tree_init(rp_tree_init);
    }

    /// Run NN-Descent and return results as flat arrays
    /// Returns [indices_flat, distances_flat, n_samples]
    #[wasm_bindgen]
    pub fn run(
        &self,
        data: Float64Array,
        n_samples: usize,
        n_features: usize,
        random_state: &RandomState,
    ) -> js_sys::Array {
        // Convert JS array to Rust vector
        let data_vec: Vec<f64> = data.to_vec();

        let state_clone_1 = random_state.state.clone();
        let random_fn = move || {
            let mut state = state_clone_1.borrow_mut();
            *state = state.wrapping_mul(1103515245).wrapping_add(12345);
            (*state % 100) as f64 / 100.0
        };

        let state_clone_2 = random_state.state.clone();
        let random_int_fn = move |max: usize| {
            let mut state = state_clone_2.borrow_mut();
            *state = state.wrapping_mul(1103515245).wrapping_add(12345);
            (*state as usize) % max
        };

        let nn_descent = nn_descent::NNDescent::new(self.config.clone(), nn_descent::euclidean_distance);
        let (indices, distances) = nn_descent.run(
            &data_vec,
            n_samples,
            n_features,
            None,
            &random_fn,
            &random_int_fn,
        );

        // Flatten results
        let mut indices_flat = Vec::new();
        let mut distances_flat = Vec::new();

        for i in 0..n_samples {
            for j in 0..self.config.n_neighbors {
                indices_flat.push(indices[i][j] as f64);
                distances_flat.push(distances[i][j]);
            }
        }

        let result = js_sys::Array::new();
        result.push(&Float64Array::from(&indices_flat[..]).into());
        result.push(&Float64Array::from(&distances_flat[..]).into());
        result.push(&(n_samples as f64).into());
        result
    }
}

/// Build random projection forest
#[wasm_bindgen]
pub fn build_rp_forest(
    data: Float64Array,
    n_samples: usize,
    n_features: usize,
    n_neighbors: usize,
    n_trees: usize,
    random_state: &RandomState,
) -> js_sys::Array {
    let data_vec: Vec<f64> = data.to_vec();

    let state_clone_1 = random_state.state.clone();
    let random_fn = move || {
        let mut state = state_clone_1.borrow_mut();
        *state = state.wrapping_mul(1103515245).wrapping_add(12345);
        (*state % 100) as f64 / 100.0
    };

    let state_clone_2 = random_state.state.clone();
    let random_int_fn = move |max: usize| {
        let mut state = state_clone_2.borrow_mut();
        *state = state.wrapping_mul(1103515245).wrapping_add(12345);
        (*state as usize) % max
    };

    let forest = tree::make_forest(
        &data_vec,
        n_samples,
        n_features,
        n_neighbors,
        n_trees,
        &random_fn,
        &random_int_fn,
    );

    // Convert forest to JS array
    let result = js_sys::Array::new();
    for tree in forest {
        let tree_obj = js_sys::Object::new();
        
        // Convert tree data to JS arrays
        let hyperplanes_arr = js_sys::Array::new();
        for hp in tree.hyperplanes {
            hyperplanes_arr.push(&Float64Array::from(&hp[..]).into());
        }
        
        let offsets_arr = Float64Array::from(&tree.offsets[..]);
        
        let children_arr = js_sys::Array::new();
        for child in tree.children {
            let child_f64: Vec<f64> = child.iter().map(|&x| x as f64).collect();
            children_arr.push(&Float64Array::from(&child_f64[..]).into());
        }
        
        let indices_arr = js_sys::Array::new();
        for idx in tree.indices {
            let idx_f64: Vec<f64> = idx.iter().map(|&x| x as f64).collect();
            indices_arr.push(&Float64Array::from(&idx_f64[..]).into());
        }
        
        js_sys::Reflect::set(&tree_obj, &"hyperplanes".into(), &hyperplanes_arr).unwrap();
        js_sys::Reflect::set(&tree_obj, &"offsets".into(), &offsets_arr).unwrap();
        js_sys::Reflect::set(&tree_obj, &"children".into(), &children_arr).unwrap();
        js_sys::Reflect::set(&tree_obj, &"indices".into(), &indices_arr).unwrap();
        
        result.push(&tree_obj);
    }

    result
}
