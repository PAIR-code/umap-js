import * as path from 'path';
import * as DtsBundleWebpack from 'dts-bundle-webpack';

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
    extensions: ['.ts', '.js'],
  },
  entry: {
    lib: './src/lib.ts',
  },
  output: {
    filename: 'umap-js.js',
    path: path.resolve(__dirname, '../lib'),
  },
  optimization: { minimize: false },
  plugins: [
    new DtsBundleWebpack({
      name: 'umap',
      main: 'dist/umap.d.ts',
      out: '../lib/umap-js.d.ts',
    }),
  ],
};
