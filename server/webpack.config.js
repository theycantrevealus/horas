const webpack = require('webpack')
const nodeExternals = require('webpack-node-externals')
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const path = require('path')

const tsConfigFile = 'tsconfig.build.json'

const lazyImports = [
  '@nestjs/microservices',
  'cache-manager',
  'class-validator',
  'class-transformer',
]

const config = {
  entry: {
    server: `./src/main.ts`,
    'app-init': './scripts/app-init.ts',
    'prisma-migrations': './scripts/prisma-migrations.ts',
  },
  output: {
    filename: `[name].js`,
    path: path.join(__dirname, 'dist'),
    devtoolModuleFilenameTemplate: `${path.sep}[absolute-resource-path][loaders]`,
  },
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.build_cache'),
  },
  devtool: false,
  target: 'node',
  mode: 'none',
  optimization: {
    nodeEnv: false,
  },
  node: {
    __filename: false,
    __dirname: false,
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /.ts?$/,
        include: [path.resolve(__dirname, 'src')],
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: tsConfigFile,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: tsConfigFile,
      }),
    ],
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new webpack.IgnorePlugin({
      checkResource(resource) {
        if (!lazyImports.includes(resource)) {
          return false
        }
        try {
          require.resolve(resource, {
            paths: [process.cwd()],
          })
        } catch (err) {
          return true
        }
        return false
      },
    }),
    new CleanWebpackPlugin(),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: tsConfigFile,
      },
    }),
  ],
}

module.exports = (
  env = { debug: false },
  argv = { mode: 'none', watch: false }
) => {
  config.mode = argv.mode

  if (argv.mode === 'development') {
    config.watch = argv.watch
    config.cache.name = env.debug ? 'development_debug' : 'development'
    config.devtool = env.debug ? 'eval-source-map' : undefined

    // If running in watch mode
    if (config.watch) {
      config.cache.name = env.debug
        ? 'development_debug_hmr'
        : 'development_hmr'
      config.entry = {
        ...config.entry,
        server: [
          'webpack/hot/poll?100',
          'webpack/hot/signal',
          config.entry.server,
        ],
      }
      config.externals = [
        nodeExternals({
          allowlist: ['webpack/hot/poll?100', 'webpack/hot/signal'],
        }),
      ]
      config.plugins = [
        ...config.plugins,
        new webpack.WatchIgnorePlugin({ paths: [/\.js$/, /\.d\.ts$/] }),
        new webpack.HotModuleReplacementPlugin(),
        new RunScriptWebpackPlugin({
          name: 'server.js',
          nodeArgs: env.debug ? ['--inspect'] : undefined, // Allow debugging
          signal: true, // Signal to send for HMR (defaults to `false`, uses 'SIGUSR2' if `true`)
          keyboard: true, // Allow typing 'rs' to restart the server. default: only if NODE_ENV is 'development'
          // args: ['scriptArgument1', 'scriptArgument2'], // pass args to script
        }),
      ]
    }
  }

  if (argv.mode === 'production') {
    config.devtool = 'source-map'
    config.cache.name = 'production'
    config.optimization.minimize = true
    config.optimization.minimizer = [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true,
        },
      }),
    ]
  }

  return config
}
