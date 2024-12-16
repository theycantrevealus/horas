const { styles } = require('@ckeditor/ckeditor5-dev-utils')
const path = require('path')
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const webpack = require('webpack')
const fs = require('fs')
// const horas_ca = fs.readFileSync(path.resolve(__dirname, 'certificates/CA.pem'))
// const horas_cert = fs.readFileSync(path.resolve(__dirname, 'certificates/localhost.crt'))
// const horas_pfx = fs.readFileSync(path.resolve(__dirname, 'certificates/localhost.pfx'))
// const horas_key = fs.readFileSync(path.resolve(__dirname, 'certificates/localhost.key'))

module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/horas/app/dist/' : '/',
  configureWebpack: {
    devtool: 'eval-source-map',
    plugins: [
      // new webpack.DefinePlugin({
      //   horas_ca: fs.readFileSync(path.resolve(__dirname, 'certificates/CA.pem')),
      //   horas_pfx: fs.readFileSync(path.resolve(__dirname, 'certificates/localhost.pfx')),
      //   horas_rejectUnauthorized: true,
      //   horas_key: fs.readFileSync(path.resolve(__dirname, 'certificates/localhost.decrypted.key')),
      //   horas_cert: fs.readFileSync(path.resolve(__dirname, 'certificates/localhost.crt')),
      //   horas_passphrase: process.env.CA_PASS,
      // })
    ]
  },
  devServer: {
    server: {
      // type: 'https',
      options: {
        // ca: path.resolve(__dirname, 'certificates/CA.pem'),
        // pfx: path.resolve(__dirname, 'certificates/localhost.pfx'),
        // key: path.resolve(__dirname, 'certificates/localhost.decrypted.key'),
        // cert: path.resolve(__dirname, 'certificates/localhost.crt'),
        // passphrase: process.env.CA_PASS,
        // requestCert: true,
      }
    },
  },
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: false,
    },
  },
  transpileDependencies: [/ckeditor5-[^/\\]+[/\\]src[/\\].+\.js$/],
  chainWebpack: (config) => {
    const svgRule = config.module.rule('svg')
    svgRule.exclude.add(path.join(__dirname, 'node_modules', '@ckeditor'))
    // config.plugin('define').tap(args => {
    //   args[0]['process.env'].HORAS_CA = horas_ca;
    //   args[0]['process.env'].HORAS_CERT = horas_cert;
    //   args[0]['process.env'].HORAS_PFX = horas_pfx;
    //   args[0]['process.env'].HORAS_KEY = horas_key;
    //   return args;
    // });
    config.plugin('polyfills').use(NodePolyfillPlugin)
    config.module
      .rule('cke-svg')
      .test(/ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/)
      .use('raw-loader')
      .loader('raw-loader')

    config.module
      .rule('cke-css')
      .test(/ckeditor5-[^/\\]+[/\\].+\.css$/)
      .use('postcss-loader')
      .loader('postcss-loader')
      .tap(() => {
        return {
          postcssOptions: styles.getPostCssConfig({
            themeImporter: {
              themePath: require.resolve('@ckeditor/ckeditor5-theme-lark'),
            },
            minify: true,
          }),
        }
      })
  },
}
