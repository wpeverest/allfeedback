/**
 * Webpack configuration — extends @wordpress/scripts defaults.
 *
 * Entry points:
 *   admin    → resources/scripts/admin/index.tsx    → resources/build/admin.js
 *   frontend → resources/scripts/frontend/index.ts  → resources/build/frontend.js
 *
 * Extras on top of the WP defaults:
 *   - TanStack Router plugin (auto-generates routeTree.gen.ts)
 *   - ForkTsCheckerPlugin (type-check in a separate process)
 *   - React Fast Refresh in dev mode
 *   - @ alias → resources/scripts/
 */

const defaults               = require('@wordpress/scripts/config/webpack.config');
const { resolve, join }      = require('path');
const ForkTsCheckerPlugin    = require('fork-ts-checker-webpack-plugin');
const ReactRefreshPlugin     = require('@pmmmwh/react-refresh-webpack-plugin');
const { TanStackRouterWebpack } = require('@tanstack/router-plugin/webpack');
const WebpackBar             = require('webpackbar');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
    ...defaults,

    // Source maps: fast eval in dev, full maps in prod (for Sentry etc.)
    devtool: isProd ? 'source-map' : 'eval-source-map',

    output: {
        ...defaults.output,
        filename:   '[name].js',
        path:       resolve(process.cwd(), 'resources/build'),
        publicPath: 'auto',
    },

    // Don't watch compiled output or vendor deps.
    watchOptions: {
        ignored: ['**/resources/build/**', '**/node_modules/**'],
    },

    optimization: {
        ...defaults.optimization,
        // Disable runtime chunk so each entry is fully self-contained.
        // This matches the asset.php approach used by @wordpress/scripts.
        runtimeChunk: false,
    },

    // ── Entry points ────────────────────────────────────────────────
    entry: {
        // Admin SPA (React 18 + TanStack Router)
        admin:    resolve(process.cwd(), 'resources/scripts/admin',    'index.tsx'),
        // Public-facing JS (vanilla TS — no framework overhead)
        frontend: resolve(process.cwd(), 'resources/scripts/frontend', 'index.ts'),
    },

    // ── Module resolution ────────────────────────────────────────────
    resolve: {
        ...defaults.resolve,
        alias: {
            ...defaults.resolve.alias,
            // @ → resources/scripts/  (matches tsconfig paths)
            '@': resolve(process.cwd(), 'resources/scripts'),
        },
    },

    // ── Plugins ──────────────────────────────────────────────────────
    plugins: [
        ...defaults.plugins,

        // Type-check TypeScript in a background process.
        new ForkTsCheckerPlugin(),

        // Auto-generate routeTree.gen.ts from the routes/ directory.
        TanStackRouterWebpack({
            routesDirectory:    join(process.cwd(), 'resources/scripts/admin/routes'),
            generatedRouteTree: join(process.cwd(), 'resources/scripts/admin/routeTree.gen.ts'),
            routeFileExtensions: ['.ts', '.tsx'],
        }),

        // Enable React Fast Refresh in development only.
        !isProd && new ReactRefreshPlugin(),

        // Build progress bar.
        new WebpackBar({ name: 'All Feedback' }),
    ].filter(Boolean),

    // ── Dev server ───────────────────────────────────────────────────
    devServer: isProd ? undefined : {
        ...defaults.devServer,
        // Allow cross-origin requests from the WordPress admin.
        headers:      { 'Access-Control-Allow-Origin': '*' },
        allowedHosts: 'all',
    },
};
