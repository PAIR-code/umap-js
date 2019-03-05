import * as fmnist from '../../data/fmnist.json';

import { DataPoint } from '../projector/data';

class State {
  data: number[][] = [];
  labels: number[] = fmnist.labels;
  labelNames = new Map<number, string>();

  // Projector-compatible data points for visualization
  dataPoints: DataPoint[] = [];

  constructor() {
    // Populate the label names
    for (let i = 0; i < fmnist.label_names.length; i++) {
      this.labelNames.set(i, fmnist.label_names[i]);
    }

    for (let i = 0; i < fmnist.data.length; i++) {
      // Flatten 2D array of fashion mnist data
      const fmnistItem: number[][] = fmnist.data[i];
      const vector = fmnistItem.reduce((prev, curr) => prev.concat(curr), []);
      this.data.push(vector);

      const label = this.labelNames.get(this.labels[i]) || '';

      this.dataPoints.push({
        metadata: {
          label,
        },
        vector: new Float32Array(vector),
        index: i,
        projections: {},
      });
    }
  }
}

export const state = new State();
