const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const webpack = require('webpack');

const env = process.env.NODE_ENV || 'production';

module.exports = {
  // @see https://webpack.js.org/configuration/entry-context/
  entry: {
    // 'custom-elements-es5-adapter': ['@webcomponents/webcomponentsjs/custom-elements-es5-adapter'],
    'webcomponents-loader': ['@webcomponents/webcomponentsjs/webcomponents-loader'],
    // vendor: ['./src/vendor'],
    app: [
      // 'webpack-dev-server/client?http://localhost:8080', // live reload
      './src/index',
    ],
  },
  // @see https://webpack.js.org/configuration/output/
  output: {
    filename: env === 'production' ? '[name]-[chunkhash:7].js' : '[name].js',
    path: path.resolve(__dirname, 'build'),
  },
  // @see https://webpack.js.org/concepts/mode/
  mode: env,
  // @see https://webpack.js.org/configuration/module/
  module: {
    rules: [
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader',
        },
      },
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  // @see https://webpack.js.org/configuration/resolve/
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: [
      '.js',
      '.ts',
    ],
  },
  // @see https://webpack.js.org/configuration/plugins/
  plugins: [
    new CleanWebpackPlugin([
      'build'
    ], {
      verbose: true,
      root: __dirname,
    }),
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, './static'),
        to: '',
        ignore: ['.*']
      }
    ]),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: 'head',
    }),
    new ScriptExtHtmlWebpackPlugin({
      defaultAttribute: 'defer',
      module: /^app/,
    }),
    new webpack.IgnorePlugin(/vertx/),
    // new webpack.HotModuleReplacementPlugin(),
  ],
  // @see https://webpack.js.org/configuration/dev-server/
  devServer: {
    contentBase: path.resolve(__dirname, 'build'),
    host: '0.0.0.0',
    hot: false,
  },
  // @see https://webpack.js.org/configuration/devtool/
  devtool: env === 'production' ? 'source-map' : 'inline-source-map',
};
