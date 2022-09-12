export const MODULE_NAME = "inline-roll-cmd";

export const debug = (...args) => {
  try {
    const debugEnabled = game.modules
      .get("_dev-mode")
      ?.api?.getPackageDebugValue(MODULE_NAME);

    if (debugEnabled) log(...args);
  } catch (e) {}
};

export const log = (...args) => console.log(MODULE_NAME, "|", ...args);
