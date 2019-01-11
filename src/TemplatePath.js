const path = require("path");
const normalize = require("normalize-path");
const parsePath = require("parse-filepath");
const fs = require("fs-extra");

function TemplatePath() {}

/**
 * @returns {String} the absolute path to Eleventy’s project directory.
 */
TemplatePath.getWorkingDir = function() {
  return TemplatePath.normalize(path.resolve("."));
};

/**
 * Returns the directory portion of a path.
 * Works for directory and file paths and paths ending in a glob pattern.
 *
 * @param {String} path A path
 * @returns {String} the directory portion of a path.
 */
TemplatePath.getDir = function(path) {
  if (TemplatePath.isDirectorySync(path)) {
    return path;
  }

  return TemplatePath.getDirFromFilePath(path);
};

/**
 * Returns the directory portion of a path that either points to a file
 * or ends in a glob pattern. If `path` points to a directory,
 * the returned value will have its last path segment stripped
 * due to how [`parsePath`][1] works.
 *
 * [1]: https://www.npmjs.com/package/parse-filepath
 *
 * @param {String} path A path
 * @returns {String} the directory portion of a path.
 */
TemplatePath.getDirFromFilePath = function(path) {
  return parsePath(path).dir || ".";
};

/**
 * Returns the last path segment in a path (no leading/trailing slashes).
 *
 * Assumes [`parsePath`][1] was called on `path` before.
 *
 * [1]: https://www.npmjs.com/package/parse-filepath
 *
 * @param {String} path A path
 * @returns {String} the last path segment in a path
 */
TemplatePath.getLastPathSegment = function(path) {
  if (!path.includes("/")) {
    return path;
  }

  // Trim a trailing slash if there is one
  path = path.replace(/\/$/, "");

  return path.substr(path.lastIndexOf("/") + 1);
};

/**
 * @param {String} path A path
 * @returns {String[]} an array of paths pointing to each path segment of the
 * provided `path`.
 */
TemplatePath.getAllDirs = function(path) {
  // Trim a trailing slash if there is one
  path = path.replace(/\/$/, "");

  if (!path.includes("/")) {
    return [path];
  }

  return path
    .split("/")
    .map(segment => path.substring(0, path.indexOf(segment) + segment.length))
    .filter(path => path !== ".");
};

/**
 * Normalizes a path, resolving single-dot and double-dot segments.
 *
 * Node.js’ [`path.normalize`][1] is called to strip a possible leading `"./"` segment.
 *
 * [1]: https://nodejs.org/api/path.html#path_path_normalize_path
 *
 * @param {String} thePath The path that should be normalized.
 * @returns {String} the normalized path.
 */
TemplatePath.normalize = function(thePath) {
  return normalize(path.normalize(thePath));
};

/**
 * Joins all given path segments together.
 *
 * It uses Node.js’ [`path.join`][1] method and the [normalize-path][2] package.
 *
 * [1]: https://nodejs.org/api/path.html#path_path_join_paths
 * [2]: https://www.npmjs.com/package/normalize-path
 *
 * @param {String[]} paths An arbitrary amount of path segments.
 * @returns {String} the normalized and joined path.
 */
TemplatePath.join = function(...paths) {
  return normalize(path.join(...paths));
};

/**
 * Determines whether a path ends in a path separating character.
 *
 * @param {String|undefined} path
 * @param {Boolean} pathIsNormalized
 * @returns {Boolean} whether `path` ends with a path separating character.
 */
TemplatePath.hasTrailingSlash = function(path, pathIsNormalized = false) {
  if (path === undefined || path.length === 0) {
    return false;
  }

  let pathSeparator = "/";
  // Handle Windows path separators
  if (pathIsNormalized && process.platform === "win32") {
    pathSeparator = "\\";
  }

  return path.endsWith(pathSeparator);
};

TemplatePath.normalizeUrlPath = function(...paths) {
  let thePath = path.join(...paths);
  let hasTrailingSlashBefore = TemplatePath.hasTrailingSlash(thePath, true);
  let normalizedPath = normalize(thePath);
  let hasTrailingSlashAfter = TemplatePath.hasTrailingSlash(normalizedPath);
  return (
    normalizedPath +
    (hasTrailingSlashBefore && !hasTrailingSlashAfter ? "/" : "")
  );
};

TemplatePath.localPath = function(...paths) {
  return normalize(path.join(TemplatePath.getWorkingDir(), ...paths));
};

TemplatePath.delocalPath = function(path) {
  return TemplatePath.stripPathFromDir(path, TemplatePath.getWorkingDir());
};

TemplatePath.addLeadingDotSlashArray = function(paths) {
  return paths.map(function(path) {
    return TemplatePath.addLeadingDotSlash(path);
  });
};

TemplatePath.addLeadingDotSlash = function(path) {
  if (path === "." || path === "..") {
    return path + "/";
  } else if (
    path.indexOf("/") === 0 ||
    path.indexOf("./") === 0 ||
    path.indexOf("../") === 0
  ) {
    return path;
  }
  return "./" + path;
};

TemplatePath.stripLeadingDots = function(str) {
  return str.replace(/^\.*/, "");
};

TemplatePath.stripLeadingDotSlash = function(dir) {
  return dir.replace(/^\.\//, "");
};

TemplatePath.contains = function(haystack, needle) {
  haystack = TemplatePath.stripLeadingDotSlash(normalize(haystack));
  needle = TemplatePath.stripLeadingDotSlash(normalize(needle));

  return haystack.indexOf(needle) === 0;
};

TemplatePath.stripPathFromDir = function(targetDir, prunedPath) {
  targetDir = TemplatePath.stripLeadingDotSlash(normalize(targetDir));
  prunedPath = TemplatePath.stripLeadingDotSlash(normalize(prunedPath));

  if (prunedPath && prunedPath !== "." && targetDir.indexOf(prunedPath) === 0) {
    return targetDir.substr(prunedPath.length + 1);
  }

  return targetDir;
};

TemplatePath.isDirectorySync = function(path) {
  return fs.existsSync(path) && fs.statSync(path).isDirectory();
};

TemplatePath.convertToGlob = function(path) {
  if (!path) {
    return "./**";
  }

  path = TemplatePath.addLeadingDotSlash(path);

  if (TemplatePath.isDirectorySync(path)) {
    return path + (!TemplatePath.hasTrailingSlash(path) ? "/" : "") + "**";
  }

  return path;
};

TemplatePath.getExtension = function(path) {
  let split = path.split(".");
  if (split.length > 1) {
    return split.pop();
  }
  return "";
};

TemplatePath.removeExtension = function(path, extension) {
  let split = path.split(".");

  // only remove extension if extension is passed in and an extension is found
  if (extension && split.length > 1) {
    let ext = split.pop();
    if (extension.charAt(0) === ".") {
      extension = extension.substr(1);
    }
    return split.join(".") + (!extension || ext === extension ? "" : "." + ext);
  }

  return path;
};

/**
 * USE ONLY IN TESTS.
 *
 * @returns {String} the absolute path to this module.
 */
TemplatePath._getModuleDir = function() {
  return path.resolve(__dirname, "..");
};

module.exports = TemplatePath;
