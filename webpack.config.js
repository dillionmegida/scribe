const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProd ? 'production' : 'development',
  entry: './src/renderer/App.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: { configFile: 'tsconfig.renderer.json' },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
    }),
  ],
  target: 'web',
  devtool: isProd ? false : 'source-map',
  devServer: {
    port: 3000,
    hot: true,
    static: {
      directory: path.resolve(__dirname, 'src/renderer'),
    },
    devMiddleware: {
      publicPath: '/',
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};