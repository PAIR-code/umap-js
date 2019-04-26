import * as fs from 'fs';
import { UMAP } from '../../src/umap';
import { digits, labels } from './digits_data';

const SIZE = 100;
console.time('UMAP');
const umap = new UMAP({ nNeighbors: 5 });
const embedding = umap.fit(digits.slice(0, SIZE));

const transformed = umap.transform(digits.slice(SIZE - 1, SIZE));

console.log('🍕 original: ', embedding.slice(SIZE - 1, SIZE));
console.log('🔥 transformed: ', transformed);

console.timeEnd('UMAP');
