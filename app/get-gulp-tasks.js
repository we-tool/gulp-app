'use strict';
var childProcess = require('child_process');
var getGulpPath = require('./get-gulp-path');

module.exports = function (pth, cb) {
  var gulpPath = getGulpPath(pth);
  if (!gulpPath) {
    setImmediate(cb, new Error('No local gulp found'));
    return;
  }

  childProcess.execFile(gulpPath, ['--tasks-simple'], {
    cwd: pth
  }, function (err, stdout) {
    if (err) {
      cb(new Error('Invalid gulpfile'));
      return;
    }

    var ret = stdout.trim();

    // returns gulpPath also
    cb(null, ret ? ret.split('\n') : [], gulpPath);
  });
};
