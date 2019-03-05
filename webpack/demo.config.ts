import * as path from 'path';
const HtmlWebpackPlugin = require('html-webpack-plugin');

export default {
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: 'style-loader',
      },
      {
        test: /\.css$/,
        loader: 'css-loader',
        query: {
          modules: true,
          localIdentName: '[name]__[local]___[hash:base64:5]',
        },
      },
    ],
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.ts', '.tsx', '.js'],
  },
  entry: {
    demo: './demo/index.tsx',
  },
  output: {
    path: path.join(__dirname, '../dist'),
    filename: 'bundle.min.js',
  },
  devServer: {
    contentBase: path.join(__dirname, '../dist'),
    port: 8080,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '../demo/index.html'),
      inject: true,
    }),
  ],
};
