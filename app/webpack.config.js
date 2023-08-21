const webpack = require('webpack')
const dotenv = require('dotenv')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { styles } = require('@ckeditor/ckeditor5-dev-utils')
const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
module.exports = {
  target: 'node',
  devServer: {
    port: 3001,
    https: {
      ca: path.resolve(__dirname, 'certificates/CA.pem'),
      pfx: path.resolve(__dirname, 'certificates/localhost.pfx'),
      key: path.resolve(__dirname, 'certificates/localhost.decrypted.key'),
      cert: path.resolve(__dirname, 'certificates/localhost.crt'),
      passphrase: process.env.CA_PASS,
      requestCert: true
    },
    devMiddleware: {
      index: true,
      mimeTypes: {
        'text/html': ['html'],
      },
      publicPath: 'public',
      serverSideRender: true,
      writeToDisk: true,
    },
  },
  context: path.resolve(__dirname, 'src'),
  entry: {
    'vue-bundle': './main.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    chunkFilename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
        exclude: /node_modules/,
        use: ['file-loader?name=[name].[ext]'] // ?name=[name].[ext] is only necessary to preserve the original file name
      },
      {
        test: /\.vue?$/,
        use: [
          {
            loader: 'vue-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue?$/],
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(ico|jpe?g|png|gif|webp|svg|mp4|webm|wav|mp3|m4a|aac|oga)(\?.*)?$/,
        loader: "raw-loader"
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        use: [
          {
            loader: 'url-loader?limit=100000',
          },
        ],
      },
      {
        test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
        use: ['raw-loader'],
      },
      {
        test: /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              injectType: 'singletonStyleTag',
              attributes: {
                'data-cke': true,
              },
            },
          },
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: styles.getPostCssConfig({
                themeImporter: {
                  themePath: require.resolve('@ckeditor/ckeditor5-theme-lark'),
                },
                minify: true,
              }),
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(
        dotenv.config({
          path: './.env',
        }).parsed
      )
    }),
    // new NodePolyfillPlugin({
    //   excludeAliases: ['console', 'https', 'fs']
    // }),
    new TsconfigPathsPlugin({
      configFile: './tsconfig.json',
      extensions: ['.ts', '.js', '.vue']
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public', 'index.html'),
      filename: 'index.html',
      favicon: path.resolve(__dirname, 'public', 'favicon.ico'),
      inject: true
    }),
    new CleanWebpackPlugin(),
    new VueLoaderPlugin(),
    new BundleAnalyzerPlugin({
      openAnalyzer: false,
      analyzerMode: 'static',
      reportFilename: 'webpack_bundle_analyser_report.html',
      defaultSizes: 'gzip',
    }),
  ],
  externals: [nodeExternals()],
  resolve: {
    extensions: ['', '.ts', '.js', '.vue', '.json', '.jsx'],
    fallback: {
      https: false,
      path: false
    },
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      '@': path.resolve(`src`),
    }
  }
}

console.log(`${__dirname}/src`)
