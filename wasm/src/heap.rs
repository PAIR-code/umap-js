use wasm_bindgen::prelude::*;

/// A heap structure for tracking k-nearest neighbors.
/// The heap stores indices, distances, and flags indicating whether elements are new.
#[wasm_bindgen]
#[derive(Clone)]
pub struct Heap {
    pub(crate) indices: Vec<Vec<i32>>,
    pub(crate) distances: Vec<Vec<f64>>,
    pub(crate) flags: Vec<Vec<u8>>,
    pub(crate) n_points: usize,
    pub(crate) size: usize,
}

#[wasm_bindgen]
impl Heap {
    /// Create a new heap with the given number of points and size per point
    #[wasm_bindgen(constructor)]
    pub fn new(n_points: usize, size: usize) -> Heap {
        Heap {
            indices: vec![vec![-1; size]; n_points],
            distances: vec![vec![f64::INFINITY; size]; n_points],
            flags: vec![vec![0; size]; n_points],
            n_points,
            size,
        }
    }

    /// Get the number of points in the heap
    pub fn n_points(&self) -> usize {
        self.n_points
    }

    /// Get the size (k) of each heap
    pub fn size(&self) -> usize {
        self.size
    }
}

impl Heap {
    /// Push a new element onto the heap for a given row.
    /// Returns 1 if an element was added, 0 otherwise.
    pub fn heap_push(&mut self, row: usize, weight: f64, index: i32, flag: u8) -> u32 {
        // Check if weight is already too large
        if weight >= self.distances[row][0] {
            return 0;
        }

        // Check if we already have this index
        for &idx in &self.indices[row] {
            if idx == index {
                return 0;
            }
        }

        self.unchecked_heap_push(row, weight, index, flag)
    }

    /// Push without checking if the element already exists
    pub fn unchecked_heap_push(&mut self, row: usize, weight: f64, index: i32, flag: u8) -> u32 {
        if weight >= self.distances[row][0] {
            return 0;
        }

        // Insert at position zero
        self.distances[row][0] = weight;
        self.indices[row][0] = index;
        self.flags[row][0] = flag;

        // Descend the heap, swapping values until the max heap criterion is met
        let mut i = 0;
        loop {
            let ic1 = 2 * i + 1;
            let ic2 = ic1 + 1;

            if ic1 >= self.size {
                break;
            }

            let i_swap = if ic2 >= self.size {
                if self.distances[row][ic1] > weight {
                    ic1
                } else {
                    break;
                }
            } else if self.distances[row][ic1] >= self.distances[row][ic2] {
                if weight < self.distances[row][ic1] {
                    ic1
                } else {
                    break;
                }
            } else {
                if weight < self.distances[row][ic2] {
                    ic2
                } else {
                    break;
                }
            };

            self.distances[row][i] = self.distances[row][i_swap];
            self.indices[row][i] = self.indices[row][i_swap];
            self.flags[row][i] = self.flags[row][i_swap];

            i = i_swap;
        }

        self.distances[row][i] = weight;
        self.indices[row][i] = index;
        self.flags[row][i] = flag;

        1
    }

    /// Find the smallest flagged element in a given row
    pub fn smallest_flagged(&mut self, row: usize) -> i32 {
        let mut min_dist = f64::INFINITY;
        let mut result_index = -1;

        for i in 0..self.indices[row].len() {
            if self.flags[row][i] == 1 && self.distances[row][i] < min_dist {
                min_dist = self.distances[row][i];
                result_index = i as i32;
            }
        }

        if result_index >= 0 {
            let idx = result_index as usize;
            self.flags[row][idx] = 0;
            self.indices[row][idx]
        } else {
            -1
        }
    }

    /// Deheap sort - unpack the heap to give sorted lists
    pub fn deheap_sort(&mut self) -> (Vec<Vec<i32>>, Vec<Vec<f64>>) {
        for row in 0..self.n_points {
            for j in 0..self.size - 1 {
                let ind_heap_index = self.size - j - 1;
                let dist_heap_index = self.size - j - 1;

                // Swap
                self.indices[row].swap(0, ind_heap_index);
                self.distances[row].swap(0, dist_heap_index);

                self.sift_down(row, dist_heap_index, 0);
            }
        }

        (self.indices.clone(), self.distances.clone())
    }

    /// Sift down operation for heap maintenance
    fn sift_down(&mut self, row: usize, ceiling: usize, mut elt: usize) {
        while elt * 2 + 1 < ceiling {
            let left_child = elt * 2 + 1;
            let right_child = left_child + 1;
            let mut swap = elt;

            if self.distances[row][swap] < self.distances[row][left_child] {
                swap = left_child;
            }
            if right_child < ceiling && self.distances[row][swap] < self.distances[row][right_child]
            {
                swap = right_child;
            }

            if swap == elt {
                break;
            } else {
                self.distances[row].swap(elt, swap);
                self.indices[row].swap(elt, swap);
                elt = swap;
            }
        }
    }
}

/// Build candidate neighbors for NN descent
pub fn build_candidates(
    current_graph: &mut Heap,
    n_vertices: usize,
    n_neighbors: usize,
    max_candidates: usize,
    random_fn: &dyn Fn() -> f64,
) -> Heap {
    let mut candidate_neighbors = Heap::new(n_vertices, max_candidates);

    for i in 0..n_vertices {
        for j in 0..n_neighbors {
            if current_graph.indices[i][j] < 0 {
                continue;
            }

            let idx = current_graph.indices[i][j] as usize;
            let isn = current_graph.flags[i][j];
            let d = random_fn();

            candidate_neighbors.heap_push(i, d, idx as i32, isn);
            candidate_neighbors.heap_push(idx, d, i as i32, isn);
            current_graph.flags[i][j] = 0;
        }
    }

    candidate_neighbors
}

/// Generate n_samples many integers from 0 to pool_size such that no integer is selected twice
pub fn rejection_sample(
    n_samples: usize,
    pool_size: usize,
    random_int: &dyn Fn(usize) -> usize,
) -> Vec<usize> {
    let mut result = vec![0; n_samples];

    for i in 0..n_samples {
        loop {
            let j = random_int(pool_size);
            let mut is_duplicate = false;

            for k in 0..i {
                if j == result[k] {
                    is_duplicate = true;
                    break;
                }
            }

            if !is_duplicate {
                result[i] = j;
                break;
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_heap_creation() {
        let heap = Heap::new(10, 5);
        assert_eq!(heap.n_points(), 10);
        assert_eq!(heap.size(), 5);
    }

    #[test]
    fn test_heap_push() {
        let mut heap = Heap::new(5, 3);
        let result = heap.heap_push(0, 1.0, 1, 1);
        assert_eq!(result, 1);

        // Try to push the same index again
        let result = heap.heap_push(0, 0.5, 1, 1);
        assert_eq!(result, 0);
    }

    #[test]
    fn test_heap_ordering() {
        let mut heap = Heap::new(1, 5);
        heap.heap_push(0, 3.0, 3, 1);
        heap.heap_push(0, 1.0, 1, 1);
        heap.heap_push(0, 4.0, 4, 1);
        heap.heap_push(0, 2.0, 2, 1);

        // The largest should be at position 0
        assert!(heap.distances[0][0] >= heap.distances[0][1]);
        assert!(heap.distances[0][0] >= heap.distances[0][2]);
    }
}
