import * as React from 'react';

import { state } from '../../core';
import { ScatterPlot } from '../../projector';
import { dummyProjectorEventContext } from '../../projector/projector-event-context';

const styles = require('./styles.css');

export class Projector extends React.Component {
  containerElement!: HTMLElement;
  scatterPlot!: ScatterPlot;

  componentDidMount() {
    this.scatterPlot = new ScatterPlot(
      this.containerElement,
      dummyProjectorEventContext
    );
  }

  render() {
    return (
      <div
        id="projector"
        className={styles.projector}
        ref={ref => (this.containerElement = ref!)}
      />
    );
  }
}
