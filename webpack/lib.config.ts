import * as path from 'path';

export default {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
  },
  entry: {
    lib: './src/lib.ts',
  },
  output: {
    filename: 'umap-js.js',
    path: path.resolve(__dirname, '../lib'),
  },
  optimization: { minimize: false },
};
