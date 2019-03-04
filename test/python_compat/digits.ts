import * as fs from 'fs';
import { UMAP } from '../../src/umap';
import { digits, labels } from './digits_data';

const SIZE = 1000;
console.time('UMAP');
const umap = new UMAP({ nNeighbors: 5 });
umap.setSupervisedProjection(labels.slice(0, SIZE));
const embedding = umap.fit(digits.slice(0, SIZE));
console.timeEnd('UMAP');

fs.writeFileSync(
  './digits_embedding_supervised.json',
  JSON.stringify(embedding)
);
