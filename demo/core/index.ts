import * as fmnist from '../../data/fmnist.json';

import { DataPoint, Projection, DataSet } from '../projector/data';

class State {
  data: number[][] = [];
  labels: number[] = fmnist.labels;
  labelNames = new Map<number, string>();

  // Projector-compatible data points wrapper for visualization
  projection: Projection;

  constructor() {
    // Populate the label names
    for (let i = 0; i < fmnist.label_names.length; i++) {
      this.labelNames.set(i, fmnist.label_names[i]);
    }

    const dataPoints: DataPoint[] = [];
    for (let i = 0; i < fmnist.data.length; i++) {
      // Flatten 2D array of fashion mnist data
      const fmnistItem: number[][] = fmnist.data[i];
      const vector = fmnistItem.reduce((prev, curr) => prev.concat(curr), []);
      this.data.push(vector);

      const label = this.labelNames.get(this.labels[i]) || '';

      dataPoints.push({
        originalVector: new Float32Array(vector),
        vector: new Float32Array(fmnist.projection[i]),
        metadata: {
          label,
        },
        index: i,
      });
    }

    const dataSet = new DataSet(dataPoints);
    this.projection = new Projection(dataSet, 3);
  }
}

export const state = new State();
