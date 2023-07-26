/*

Attention: The following code in a file `postcss.config.js` is not working
           because of postcss issues:
           - [Document how to declare a PostCSS plugin in an ES6/TypeScript module #1771](https://github.com/postcss/postcss/issues/1771)
           - [Move to ESM #5291](https://github.com/stylelint/stylelint/issues/5291)

          export const plugins = {
            tailwindcss: {},
            autoprefixer: {},
          };

          As workaound, we use a `postcss.config.cjs` file instead.
*/
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
