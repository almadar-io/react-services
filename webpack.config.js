"use strict";
var webpack = require("webpack");
var path = require("path");

module.exports = {
  entry: "./index.js",
  output: {
    path: path.join(__dirname, "lib"),
    filename: "react-services.js",
    publicPath: "/lib/",
    library: "react-services",
    libraryTarget: "umd",
    umdNamedDefine: true // Important
  },
  externals: {
    react: {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "react"
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/, //Check for all js files
        use: [
          {
            loader: "babel-loader",
            options: { babelrcRoots: [".", "../"] }
          }
        ],
        exclude: /(node_modules|bower_compontents)/
      },
      {
        test: /\.(css|sass|scss)$/, //Check for sass or scss file names
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /\.json$/,
        loader: "json-loader" //JSON loader
      }
    ]
  },
  //To run development server
  devServer: {
    contentBase: __dirname
  }
};
