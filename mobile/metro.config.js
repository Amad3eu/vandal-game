// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// The game engine, tuning data and sprites live in the web project (../src) and are shared
// as-is. Only that folder is watched, so Metro doesn't crawl the web app's node_modules.
config.watchFolders = [path.resolve(__dirname, '../src')]

module.exports = config
