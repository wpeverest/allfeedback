/** @type {import('postcss-load-config').Config} */
module.exports = {
    plugins: {
        '@tailwindcss/postcss': {},  // TailwindCSS v4 via PostCSS
        'postcss-import':       {},  // @import resolution
        'postcss-nested':       {},  // SCSS-style nesting
        'postcss-calc':         {},  // calc() simplification
        'autoprefixer':         {},  // vendor prefixes
        ...(process.env.NODE_ENV === 'production'
            ? { cssnano: { preset: 'default' } }   // minify in prod
            : {}),
    },
};
