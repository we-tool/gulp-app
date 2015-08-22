var resolveFrom = require('resolve-from');
var path = require('path');


module.exports = function(pth) {
  if (!pth) {
    pth = process.cwd();
  }
  var gulpPath = null;

  try {
    gulpPath = resolveFrom(pth, 'gulp/bin/gulp');
  } catch(err) {}

  // use .cmd for windows
  if (gulpPath && process.platform === 'win32') {
    gulpPath = path.resolve(gulpPath, '../../../.bin/gulp.cmd');
  }

  return gulpPath;
}
