const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("bin", "glb", "gltf", "ktx2");

module.exports = config;
