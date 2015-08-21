var resolveFrom = require('resolve-from');
var path = require('path');


module.exports = function(pth) {
  if (typeof pth !== 'string') {
    cb = pth;
    pth = process.cwd();
  }

  gulpBinPath = resolveFrom(pth, 'gulp/bin/gulp');

  // use .cmd for windows
  if (process.platform === 'win32') {
    gulpBinPath = path.resolve(gulpBinPath, '../../../.bin/gulp.cmd');
  }

  return gulpBinPath;
}
