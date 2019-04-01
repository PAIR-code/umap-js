import * as path from 'path';

export default {
  mode: 'production',
  module: {
    rules: [
      {
        test: /(\.ts$|\.js$)/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  entry: {
    lib: path.resolve(__dirname, '../src/lib.ts'),
  },
  output: {
    filename: 'umap-js.js',
    path: path.resolve(__dirname, '../lib'),
  },
  optimization: { minimize: false },
};
