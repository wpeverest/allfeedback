const defaults               = require('@wordpress/scripts/config/webpack.config');
const { resolve, join }      = require('path');
const ForkTsCheckerPlugin    = require('fork-ts-checker-webpack-plugin');
const ReactRefreshPlugin     = require('@pmmmwh/react-refresh-webpack-plugin');
const { TanStackRouterWebpack } = require('@tanstack/router-plugin/webpack');
const WebpackBar             = require('webpackbar');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
    ...defaults,

    devtool: isProd ? 'source-map' : 'eval-source-map',

    output: {
        ...defaults.output,
        filename:      '[name].js',
        path:          resolve(process.cwd(), process.env.OUTPUT_PATH ?? 'resources/build'),
        publicPath:    'auto',
    },

    watchOptions: {
        ignored: ['**/resources/build/**', '**/node_modules/**'],
    },

    performance: {
        hints: isProd ? 'warning' : false,
        maxAssetSize: 244 * 1024,
        maxEntrypointSize: 350 * 1024,
        assetFilter: (filename) =>
            !filename.includes('-rtl.css') &&
            !filename.includes('.map') &&
            !filename.includes('.php'),
    },

    optimization: {
        ...defaults.optimization,
        runtimeChunk: false,
        splitChunks: {
            ...defaults.optimization.splitChunks,
            chunks: 'async',
            minSize: 20_000,
            cacheGroups: {
                ...defaults.optimization.splitChunks.cacheGroups,
                asyncVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'async',
                    priority: 20,
                    minChunks: 1,
                    maxSize: 200_000,
                    reuseExistingChunk: true,
                },
            },
        },
    },

    entry: {
        admin:    resolve(process.cwd(), 'resources/scripts/admin',    'index.tsx'),
        frontend: resolve(process.cwd(), 'resources/scripts/frontend', 'index.ts'),
    },

    resolve: {
        ...defaults.resolve,
        alias: {
            ...defaults.resolve.alias,
            '@': resolve(process.cwd(), 'resources/scripts'),
        },
    },

    plugins: [
        ...defaults.plugins,
        new ForkTsCheckerPlugin(),
        TanStackRouterWebpack({
            routesDirectory:     join(process.cwd(), 'resources/scripts/admin/routes'),
            generatedRouteTree:  join(process.cwd(), 'resources/scripts/admin/routeTree.gen.ts'),
            routeFileExtensions: ['.ts', '.tsx'],
        }),
        !isProd && new ReactRefreshPlugin(),
        new WebpackBar({ name: 'All Feedback' }),
    ].filter(Boolean),

    devServer: isProd ? undefined : {
        ...defaults.devServer,
        headers:      { 'Access-Control-Allow-Origin': '*' },
        allowedHosts: 'all',
    },
};
