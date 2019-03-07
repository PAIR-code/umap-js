import * as path from 'path';
const HtmlWebpackPlugin = require('html-webpack-plugin');

export default {
  mode: 'development',
  devtool: 'inline-source-map',
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
    modules: ['node_modules'],
    extensions: ['.ts', '.js'],
  },
  entry: {
    demo: './demo/index.ts',
  },
  output: {
    path: path.join(__dirname, '../dist/demo'),
    filename: 'bundle.min.js',
  },
  devServer: {
    contentBase: path.join(__dirname, '../demo'),
    port: 8080,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '../demo/index.html'),
      inject: true,
    }),
  ],
};
