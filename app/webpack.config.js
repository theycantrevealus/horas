// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require('webpack')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HtmlWebpackPlugin = require('html-webpack-plugin')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
    VueLoaderPlugin
} = require('vue-loader')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
    CleanWebpackPlugin
} = require('clean-webpack-plugin')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
    .BundleAnalyzerPlugin

const CKEditorWebpackPlugin = require('@ckeditor/ckeditor5-dev-webpack-plugin')

module.exports = {
    devServer: {
        devMiddleware: {
            index: true,
            mimeTypes: {
                'text/html': ['phtml']
            },
            publicPath: 'public',
            serverSideRender: true,
            writeToDisk: true
        }
    },
    context: path.resolve(__dirname, 'src'),
    entry: {
        'vue-bundle': './main.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: 'dist/',
        filename: '[name].js',
        chunkFilename: '[name].js'
    },
    module: {
        rules: [{
                test: /\.vue?$/,
                use: [{
                    loader: 'vue-loader'
                }],
                exclude: /node_modules/
            },
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    appendTsSuffixTo: [/\.vue?$/]
                },
                exclude: /node_modules/
            },
            {
                test: /\.(sa|sc|c)ss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                use: [{
                    loader: 'url-loader?limit=100000'
                }]
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': JSON.stringify(dotenv.config({
                path: './.env'
            }).parsed)
        }),
        new HtmlWebpackPlugin(),
        new CleanWebpackPlugin(),
        new VueLoaderPlugin(),
        new BundleAnalyzerPlugin({
            openAnalyzer: false,
            analyzerMode: 'static',
            reportFilename: 'webpack_bundle_analyser_report.html',
            defaultSizes: 'gzip'
        }),
        new CKEditorWebpackPlugin({
            language: 'en',
            translationsOutputFile: /app/
        })
    ],
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            vue: 'vue/dist/vue.esm-bundler.js',
            '@': path.resolve(`${__dirname}/src`)
        }
    }
}