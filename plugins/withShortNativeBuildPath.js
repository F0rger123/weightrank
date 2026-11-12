/**
 * Windows builds: ninja can't create the very deep folders React Native's C++
 * codegen needs (260-character path limit), so put the app's CMake staging
 * folder at a short path. No effect on macOS/Linux or cloud builds.
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const MARK = "// weightrank: short cmake staging dir";

module.exports = function withShortNativeBuildPath(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARK)) return cfg;
    cfg.modResults.contents += `
${MARK}
if (System.getProperty("os.name").toLowerCase().contains("windows")) {
  android {
    externalNativeBuild {
      cmake {
        buildStagingDirectory = file("C:/cx/app")
      }
    }
  }
}
`;
    return cfg;
  });
};
