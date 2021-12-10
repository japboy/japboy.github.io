import commonjs from "@rollup/plugin-commonjs";
import html from "@rollup/plugin-html";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import esbuild from 'rollup-plugin-esbuild'
import postcss from "rollup-plugin-postcss";

import template from "./src/template";

const mode = process.env.NODE_ENV || "development";

export default {
  input: "src/app.ts",
  output: {
    entryFileNames: mode === "production" ? "[name].[hash].js" : "[name].js",
    dir: "dist",
    format: "iife",
    generatedCode: "es2015",
  },
  plugins: [
    commonjs(),
    esbuild({
      minify: mode === 'production',
      target: 'es2018',
    }),
    html(template),
    nodeResolve(),
    postcss({ minimize: mode === "production" }),
    replace({
      "process.env.NODE_ENV": JSON.stringify(mode),
    }),
    typescript(),
  ],
};
