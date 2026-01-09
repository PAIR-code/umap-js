use wasm_bindgen::prelude::*;

#[cfg(feature = "parallel")]
use rayon::prelude::*;

/// Flat representation of a random projection tree
#[wasm_bindgen]
#[derive(Clone)]
pub struct FlatTree {
    pub(crate) hyperplanes: Vec<Vec<f64>>,
    pub(crate) offsets: Vec<f64>,
    pub(crate) children: Vec<Vec<i32>>,
    pub(crate) indices: Vec<Vec<i32>>,
}

#[wasm_bindgen]
impl FlatTree {
    #[wasm_bindgen(constructor)]
    pub fn new() -> FlatTree {
        FlatTree {
            hyperplanes: Vec::new(),
            offsets: Vec::new(),
            children: Vec::new(),
            indices: Vec::new(),
        }
    }
}

/// Internal tree node structure
struct TreeNode {
    is_leaf: bool,
    indices: Option<Vec<usize>>,
    left_child: Option<Box<TreeNode>>,
    right_child: Option<Box<TreeNode>>,
    hyperplane: Option<Vec<f64>>,
    offset: Option<f64>,
}

impl TreeNode {
    fn new_leaf(indices: Vec<usize>) -> Self {
        TreeNode {
            is_leaf: true,
            indices: Some(indices),
            left_child: None,
            right_child: None,
            hyperplane: None,
            offset: None,
        }
    }

    fn new_internal(
        hyperplane: Vec<f64>,
        offset: f64,
        left: TreeNode,
        right: TreeNode,
    ) -> Self {
        TreeNode {
            is_leaf: false,
            indices: None,
            left_child: Some(Box::new(left)),
            right_child: Some(Box::new(right)),
            hyperplane: Some(hyperplane),
            offset: Some(offset),
        }
    }
}

/// Build a random projection forest
pub fn make_forest(
    data: &[f64],
    n_samples: usize,
    n_features: usize,
    n_neighbors: usize,
    n_trees: usize,
    random_fn: &dyn Fn() -> f64,
    random_int_fn: &dyn Fn(usize) -> usize,
) -> Vec<FlatTree> {
    let leaf_size = n_neighbors.max(10);

    #[cfg(feature = "parallel")]
    {
        (0..n_trees)
            .into_par_iter()
            .map(|i| {
                let tree = make_tree(data, n_samples, n_features, leaf_size, i, random_fn, random_int_fn);
                flatten_tree(&tree, leaf_size)
            })
            .collect()
    }

    #[cfg(not(feature = "parallel"))]
    {
        (0..n_trees)
            .map(|i| {
                let tree = make_tree(data, n_samples, n_features, leaf_size, i, random_fn, random_int_fn);
                flatten_tree(&tree, leaf_size)
            })
            .collect()
    }
}

/// Construct a single random projection tree
fn make_tree(
    data: &[f64],
    n_samples: usize,
    n_features: usize,
    leaf_size: usize,
    seed: usize,
    random_fn: &dyn Fn() -> f64,
    random_int_fn: &dyn Fn(usize) -> usize,
) -> TreeNode {
    let indices: Vec<usize> = (0..n_samples).collect();
    make_euclidean_tree(data, n_features, indices, leaf_size, random_fn, random_int_fn)
}

/// Recursive function to build a Euclidean random projection tree
fn make_euclidean_tree(
    data: &[f64],
    n_features: usize,
    indices: Vec<usize>,
    leaf_size: usize,
    random_fn: &dyn Fn() -> f64,
    random_int_fn: &dyn Fn(usize) -> usize,
) -> TreeNode {
    if indices.len() <= leaf_size {
        return TreeNode::new_leaf(indices);
    }

    let split = euclidean_random_projection_split(data, n_features, &indices, random_fn, random_int_fn);

    let left_child = make_euclidean_tree(
        data,
        n_features,
        split.indices_left,
        leaf_size,
        random_fn,
        random_int_fn,
    );

    let right_child = make_euclidean_tree(
        data,
        n_features,
        split.indices_right,
        leaf_size,
        random_fn,
        random_int_fn,
    );

    TreeNode::new_internal(split.hyperplane, split.offset, left_child, right_child)
}

struct SplitResult {
    indices_left: Vec<usize>,
    indices_right: Vec<usize>,
    hyperplane: Vec<f64>,
    offset: f64,
}

/// Split data points using a random hyperplane
fn euclidean_random_projection_split(
    data: &[f64],
    n_features: usize,
    indices: &[usize],
    random_fn: &dyn Fn() -> f64,
    random_int_fn: &dyn Fn(usize) -> usize,
) -> SplitResult {
    // Select two random points
    let mut left_idx = random_int_fn(indices.len());
    let mut right_idx = random_int_fn(indices.len());

    if right_idx == left_idx {
        right_idx = (right_idx + 1) % indices.len();
    }

    let left = indices[left_idx];
    let right = indices[right_idx];

    // Compute hyperplane normal vector and offset
    let mut hyperplane = vec![0.0; n_features];
    let mut offset = 0.0;

    for i in 0..n_features {
        let left_val = data[left * n_features + i];
        let right_val = data[right * n_features + i];
        hyperplane[i] = left_val - right_val;
        offset -= hyperplane[i] * (left_val + right_val) / 2.0;
    }

    // Split indices based on which side of hyperplane they fall
    let mut indices_left = Vec::new();
    let mut indices_right = Vec::new();

    for &idx in indices {
        let mut margin = offset;
        for i in 0..n_features {
            margin += hyperplane[i] * data[idx * n_features + i];
        }

        if margin == 0.0 {
            // On the hyperplane - randomly assign
            if random_fn() < 0.5 {
                indices_left.push(idx);
            } else {
                indices_right.push(idx);
            }
        } else if margin < 0.0 {
            indices_left.push(idx);
        } else {
            indices_right.push(idx);
        }
    }

    // Ensure both sides have at least one element
    if indices_left.is_empty() {
        indices_left.push(indices_right.pop().unwrap());
    } else if indices_right.is_empty() {
        indices_right.push(indices_left.pop().unwrap());
    }

    SplitResult {
        indices_left,
        indices_right,
        hyperplane,
        offset,
    }
}

/// Flatten a tree into arrays for efficient searching
fn flatten_tree(tree: &TreeNode, leaf_size: usize) -> FlatTree {
    let mut flat = FlatTree::new();
    let mut node_queue = vec![tree];

    while let Some(node) = node_queue.pop() {
        if node.is_leaf {
            flat.hyperplanes.push(Vec::new());
            flat.offsets.push(0.0);
            flat.children.push(vec![-1, -1]);

            let mut leaf_indices = vec![-1; leaf_size];
            if let Some(indices) = &node.indices {
                for (i, &idx) in indices.iter().enumerate() {
                    if i < leaf_size {
                        leaf_indices[i] = idx as i32;
                    }
                }
            }
            flat.indices.push(leaf_indices);
        } else {
            flat.hyperplanes.push(node.hyperplane.clone().unwrap());
            flat.offsets.push(node.offset.unwrap());

            let left_idx = flat.hyperplanes.len();
            let right_idx = left_idx + count_nodes(node.left_child.as_ref().unwrap());

            flat.children.push(vec![left_idx as i32, right_idx as i32]);
            flat.indices.push(Vec::new());

            if let Some(left) = &node.left_child {
                node_queue.push(left);
            }
            if let Some(right) = &node.right_child {
                node_queue.push(right);
            }
        }
    }

    flat
}

/// Count the number of nodes in a tree
fn count_nodes(node: &TreeNode) -> usize {
    let mut count = 1;
    if let Some(left) = &node.left_child {
        count += count_nodes(left);
    }
    if let Some(right) = &node.right_child {
        count += count_nodes(right);
    }
    count
}

/// Search a flat tree for nearest neighbors
pub fn search_flat_tree(
    point: &[f64],
    tree: &FlatTree,
    random_fn: &dyn Fn() -> f64,
) -> Vec<i32> {
    if tree.hyperplanes.is_empty() {
        return Vec::new();
    }

    let mut node_idx = 0;

    loop {
        // Check if this is a leaf node
        if tree.children[node_idx][0] < 0 {
            return tree.indices[node_idx].clone();
        }

        // Compute which side of the hyperplane the point is on
        let hyperplane = &tree.hyperplanes[node_idx];
        let offset = tree.offsets[node_idx];

        let mut margin = offset;
        for (i, &h) in hyperplane.iter().enumerate() {
            margin += h * point[i];
        }

        // Choose child based on margin (with random tie-breaking)
        if margin == 0.0 {
            node_idx = if random_fn() < 0.5 {
                tree.children[node_idx][0] as usize
            } else {
                tree.children[node_idx][1] as usize
            };
        } else if margin < 0.0 {
            node_idx = tree.children[node_idx][0] as usize;
        } else {
            node_idx = tree.children[node_idx][1] as usize;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tree_creation() {
        let data = vec![
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
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

        let tree = make_tree(&data, 4, 2, 2, 0, &random_fn, &random_int_fn);

        // Tree should have split the 4 points
        assert!(!tree.is_leaf || tree.indices.as_ref().unwrap().len() <= 2);
    }

    #[test]
    fn test_search_flat_tree() {
        let data = vec![
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
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

        let tree = make_tree(&data, 4, 2, 2, 0, &random_fn, &random_int_fn);
        let flat = flatten_tree(&tree, 2);

        let query = vec![0.1, 0.1];
        let result = search_flat_tree(&query, &flat, &random_fn);

        // Should return some indices
        assert!(!result.is_empty());
    }
}
