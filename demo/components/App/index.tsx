import * as React from 'react';

import { Projector } from '../Projector';

const styles = require('./styles.css');

export const App = () => {
  return (
    <div className={styles.app}>
      <Projector />
    </div>
  );
};
