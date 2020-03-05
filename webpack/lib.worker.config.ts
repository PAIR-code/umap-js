import * as path from 'path';

export default {
  mode: 'production',
  module: {
    rules: [
      {
        test: /(\.ts$|\.js$)/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },
      {
        test: /(\.worker\.ts$|\.worker\.js$)/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'worker-loader',
            options: { fallback: false, inline: true },
          },
          'ts-loader',
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  entry: {
    lib: path.resolve(__dirname, '../worker/worker-lib.ts'),
  },
  output: {
    filename: 'umap-worker-js.js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, '../lib'),
  },
  optimization: { minimize: true },
};
