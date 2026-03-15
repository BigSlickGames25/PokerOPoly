const upstreamTransformer = require("@expo/metro-config/babel-transformer");

function transformTextModule(src) {
  return `module.exports = ${JSON.stringify(src)};`;
}

module.exports.transform = function ({ filename, options, src }) {
  if (filename.endsWith(".mtl") || filename.endsWith(".obj")) {
    return upstreamTransformer.transform({
      filename,
      options,
      src: transformTextModule(src)
    });
  }

  return upstreamTransformer.transform({ filename, options, src });
};
