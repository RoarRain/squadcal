const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = function(env) {
  if (env !== 'prod' && env !== 'dev') {
    env = 'dev';
  }
  const config = {
    entry: ['./script.js'],
    output: {
      filename: env + '.build.js',
      path: path.join(__dirname, 'dist'),
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules\/(?!lib)/,
          options: {
            presets: [
              'react',
              ['latest', { 'es2015': { modules: false } }],
            ],
            plugins: [
              ['transform-class-properties', { spec: true }],
              'transform-object-rest-spread',
              ['transform-builtin-extend', { globals: ["Error"] }],
            ],
          },
        },
      ],
    },
    resolve: {
      // This is necessary so that webpack doesn't differentiate the
      // node_modules/lib symlink from a normal folder
      symlinks: false,
      // npm uses a tree-link structure for dependencies, which means that we
      // can get multiple versions of a library if it's used in different parts
      // of the dependency tree. This is convenient for avoiding versioning
      // conflicts and the such, but it increases the bundle size a lot.
      // Instead, here we force all dependencies to use our copies of these big
      // and common libraries.
      alias: {
        'react': path.resolve('./node_modules/react'),
        'lodash': path.resolve('./node_modules/lodash'),
        'jquery': path.resolve('./node_modules/jquery'),
        'isomorphic-fetch': path.resolve('./node_modules/isomorphic-fetch'),
      },
    },
    plugins: [
      new webpack.LoaderOptionsPlugin({
        minimize: env === 'prod',
        debug: env === 'dev',
      }),
    ],
  };
  const cssLoader = {
    loader: 'css-loader',
    options: {
      modules: true,
      localIdentName: '[path][name]__[local]--[hash:base64:5]',
      sourceMap: env !== 'prod',
    },
  };
  if (env === 'prod') {
    config.plugins.push(new UglifyJSPlugin());
    config.plugins.push(new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      },
    }));
    config.module.rules.push({
      test: /\.css$/,
      use: ExtractTextPlugin.extract({ loader: cssLoader }),
    });
    config.module.rules[0].options.plugins.push(
      'transform-react-constant-elements'
    );
    config.module.rules[0].options.plugins.push(
      'transform-remove-console'
    );
    config.plugins.push(new ExtractTextPlugin('prod.build.css'));
  } else if (env === 'dev') {
    config.devtool = 'eval-cheap-module-source-map';
    config.output.pathinfo = true;
    config.output.publicPath = 'http://localhost:8080/';
    config.output.hotUpdateChunkFilename = 'hot/hot-update.js';
    config.output.hotUpdateMainFilename = 'hot/hot-update.json';
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', cssLoader],
    });
    config.module.rules[0].options.plugins.push('react-hot-loader/babel');
    config.entry.splice(
      0,
      0,
      'react-hot-loader/patch',
      'webpack-dev-server/client?http://localhost:8080',
      'webpack/hot/only-dev-server'
    );
    config.devServer = {
      hot: true,
      contentBase: __dirname,
      publicPath: 'http://localhost:8080/',
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
    config.plugins.push(new webpack.HotModuleReplacementPlugin());
    config.plugins.push(new webpack.NamedModulesPlugin());
  }
  return config;
};
