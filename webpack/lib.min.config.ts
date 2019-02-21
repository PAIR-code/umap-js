import libConfig from './lib.config';

export default {
  ...libConfig,
  output: {
    ...libConfig.output,
    filename: 'umap-js.min.js',
  },
  optimization: { minimize: true },
};
