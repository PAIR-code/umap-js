const pyEmbeddings = [
  [-2.0587447, -4.2423863],
  [-4.3923454, -6.9971895],
  [-4.6690845, -6.432068],
  [-0.7188951, -2.9570978],
  [-3.2231536, -7.2128615],
  [-0.6706776, -3.763011],
  [-3.6028814, -6.965405],
  [-1.9064398, -5.558926],
  [-1.1467532, -4.167386],
  [-1.6807799, -3.992522],
  [-2.8602192, -6.189407],
  [-4.1969686, -6.300055],
  [-0.0991127, -2.7851243],
  [-0.9129898, -3.413774],
  [-2.8364997, -6.811427],
  [-1.1062639, -5.2619057],
  [-3.9937587, -7.2913723],
  [-2.3824172, -5.780026],
  [-1.5894171, -5.186763],
  [-0.31171876, -3.0919414],
];

import { r } from '../../src/mersenne';
import { UMAP } from '../../src/umap';
import { digits } from './digits_data';

const SIZE = 20;
console.time('UMAP');
const umap = new UMAP({ nNeighbors: 5 });
const embedding = umap.fit(digits.slice(0, SIZE));

r.init_genrand(42);
(umap as any).embedding = pyEmbeddings;
const transformed = umap.transform(digits.slice(SIZE - 1, SIZE));

console.log('🔥 transformed: ', transformed);

console.timeEnd('UMAP');
