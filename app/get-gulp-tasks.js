'use strict';
var childProcess = require('child_process');
var getGulpPath = require('./get-gulp-path');

module.exports = function (pth, cb) {
  if (typeof pth !== 'string') {
    cb = pth;
    pth = process.cwd();
  }

  try {
    var gulpBinPath = getGulpPath();
  } catch(err) {
    setImmediate(cb, err)
  }

  childProcess.execFile(gulpBinPath, ['--tasks-simple'], {cwd: pth}, function (err, stdout) {
    if (err) {
      cb(err);
      return;
    }

    var ret = stdout.trim();

    cb(null, ret ? ret.split('\n') : []);
  });
};
