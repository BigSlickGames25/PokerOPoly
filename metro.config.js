const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts.filter(
  (extension) => extension !== "mtl" && extension !== "obj"
);
config.resolver.assetExts = [
  ...new Set([...config.resolver.assetExts, "bin", "glb", "gltf", "ktx2"])
];
config.resolver.sourceExts = [
  ...new Set([...config.resolver.sourceExts, "mtl", "obj"])
];
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("./metro.transformer")
};

module.exports = config;
