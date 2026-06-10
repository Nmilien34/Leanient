/* eslint-disable @typescript-eslint/no-require-imports */
// Metro config for the Leanient monorepo.
// @leanient/shared is hoisted to the monorepo root node_modules and lives in
// ../shared, both outside this project folder. Metro only watches the project
// folder by default, so without this it fails with "Unable to resolve
// @leanient/shared". Watch the monorepo root and resolve from both node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
