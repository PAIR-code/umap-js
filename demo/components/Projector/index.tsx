import * as React from 'react';

import { state } from '../../core';
import { ProjectorScatterPlotAdapter } from '../../projector';
import { dummyProjectorEventContext } from '../../projector/projector-event-context';

const styles = require('./styles.css');

export class Projector extends React.Component {
  containerElement!: HTMLElement;
  scatterPlotAdapter!: ProjectorScatterPlotAdapter;

  componentDidMount() {
    this.scatterPlotAdapter = new ProjectorScatterPlotAdapter(
      this.containerElement,
      dummyProjectorEventContext
    );

    const { projection } = state;
    this.scatterPlotAdapter.updateScatterPlotWithNewProjection(projection);

    // TODO: Add to the update callbacks
    // this.scatterPlotAdapter.updateScatterPlotPositions();
    // this.scatterPlotAdapter.updateScatterPlotAttributes();
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
