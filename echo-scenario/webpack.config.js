const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: "./index.ts",
  module: {
    rules: [
      {
        use: "ts-loader",
      },
    ],
  },
  target: "node",
  resolve: {
    extensions: [".ts", ".js"],
    modules: [path.resolve(__dirname, "./")],
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "build"),
  },
  externals: [nodeExternals()],
  mode: "production",
};
