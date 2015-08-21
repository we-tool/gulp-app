'use strict';
var path = require('path');
var spawn = require('child_process').spawn;
var which = require('which');
var findupSync = require('findup-sync');
var chardet = require('jschardet')
var iconv = require('iconv-lite')
var BufferHelper = require('bufferhelper')
//var currentPath = require('current-path');
var currentPath = function(callback){
	callback(null, process.cwd())
}
//var displayNotification = require('display-notification');
var displayNotification = function(){

}

var getGulpTasks = require('get-gulp-tasks');
var _ = require('lodash');
var fixPath = require('fix-path');

var app = require('app');
var dialog = require('dialog');
var Tray = require('tray');
var Menu = require('menu');
var MenuItem = require('menu-item');

var DEBUG = true;
var TRAY_UPDATE_INTERVAL = 1000;

var tray;
var prevPath;
var recentProjects = [];
var currentProject = {
	name: 'No gulpfile found',
	tasks: []
};

require('crash-reporter').start();

//app.dock.hide();

// fix the $PATH on OS X
fixPath();

var charset
function decode(buf, cb){
	if (!charset) {
		var det = chardet.detect(buf)
		console.log('-------', det.encoding)
		if (det.confidence > 0.9 && det.encoding !== 'ascii') {
			charset = det.encoding
			return decode(buf, cb)
		}
		return cb(null, buf.toString())
	}
	if (charset === 'ascii') {
		return cb(null, buf.toString())
	}
	// windows-1252 => win1252 for iconv-lite
	// https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
	var cs = charset.replace(/^windows\-/, 'win')
	console.log('====', cs)
	cb(null, iconv.decode(buf, cs))
}

function runTask(taskName) {
	//var gulpPath = path.join(__dirname, 'node_modules', 'gulp', 'bin', 'gulp.js');
	var gulpPath = which.sync('gulp');
	var cp = spawn(gulpPath, [taskName, '--no-color']);

	//cp.stdout.setEncoding('utf8');
	var bh = new BufferHelper()
	cp.stdout.on('data', function (buf) {
		bh.concat(buf)
	});
	cp.stdout.on('end', function () {
		decode(bh.toBuffer(), function(err, data){
			//data = data.replace(/脦录s/g, 'μs') // hack修正字符
			console.log(data);
		})
		bh = new BufferHelper()
	});

	// TODO: show progress in menubar menu
	//tray.menu = createTrayMenu(name, [], 'progress here');

	//cp.stderr.setEncoding('utf8');
	/*cp.stderr.on('data', function (data) {
		decode(data, function(err, data){
			console.error(data);
			displayNotification({text: '[error] ' + data});
		})
	});*/

	cp.on('exit', function (code) {
		if (code === 0) {
			displayNotification({
				title: 'gulp',
				subtitle: 'Finished running tasks'
			});
		} else {
			console.error('Exited with error code ' + code);

			displayNotification({
				title: 'gulp',
				subtitle: 'Exited with error code ' + code,
				sound: 'Basso'
			});
		}
	});
}

function addRecentProject(project) {
	recentProjects = recentProjects.filter(function (el) {
		return el.name !== project.name;
	});

	if (recentProjects.length === 10) {
		recentProjects.pop();
	}

	recentProjects.unshift(project);
}

function createProjectMenu() {
	var menu = new Menu();
/*
	if (process.platform === 'darwin' || process.platform === 'win32') {
		menu.append(new MenuItem({
			label: 'Follow Finder'
		}));

		menu.append(new MenuItem({type: 'separator'}));
	}
*/
	if (recentProjects.length > 0) {
		recentProjects.forEach(function (el) {
			menu.append(new MenuItem({
				label: el.name,
				type: 'radio',
				checked: el.name === currentProject.name
			}));
		});

		menu.append(new MenuItem({type: 'separator'}));
	}

	menu.append(new MenuItem({
		label: 'Open Project',
		click: function () {
			dialog.showOpenDialog(null, {
				title: 'Pick a project',
				properties: ['openDirectory'],
				defaultPath: path.resolve(process.cwd(), '..')
			}, function (dirs) {
				setActiveProject(dirs[0]);
				addRecentProject(currentProject);
				createTrayMenu();
			});
		}
	}));

	menu.append(new MenuItem({type: 'separator'}));

	menu.append(new MenuItem({
		label: 'Clear',
		click: function () {
			recentProjects.length = 0;
			createTrayMenu();
		}
	}));

	return menu;
}

function createTrayMenu() {
	var menu = new Menu();

	menu.append(new MenuItem({
		label: currentProject.name,
		submenu: createProjectMenu()
	}));

	if (currentProject.tasks && currentProject.tasks.length > 0) {
		menu.append(new MenuItem({type: 'separator'}));

		currentProject.tasks.forEach(function (el) {
			menu.append(new MenuItem({
				label: el,
				click: function () {
					runTask(el);
				}
			}));
		});
	}

	menu.append(new MenuItem({type: 'separator'}));
	menu.append(new MenuItem({
		label: 'Quit',
		click: app.quit
	}));

	tray.setContextMenu(menu);

	return menu;
}

function setActiveProject(dirPath) {
	currentProject = {};
	process.chdir(dirPath);

	var pkgPath = findupSync('package.json');

	if (!pkgPath) {
		console.log('Couldn\'t find package.json');
		return;
	}

	var pkg = require(pkgPath);

	currentProject.path = dirPath;
	currentProject.name = pkg.name || path.basename(dirPath, path.extname(dirPath));

	getGulpTasks(function (err, tasks) {
		if (err) {
			if (err.code !== 'MODULE_NOT_FOUND') {
				console.error(err);
			}

			return;
		}

		tasks = _.pull(tasks, 'default');
		tasks.unshift('default');

		currentProject.tasks = tasks;

		console.log(prevPath, dirPath);

		// TODO: this prevent updating of tasklist from changes in the gulpfile
		if (prevPath !== dirPath) {
			prevPath = dirPath;
			createTrayMenu();
		}
	});
}

function updateTray() {
	currentPath(function (err, dirPath) {
		setTimeout(updateTray, TRAY_UPDATE_INTERVAL);
		setActiveProject(dirPath);
	});
}

app.on('ready', function () {
	tray = new Tray(path.join(__dirname, '/menubar-icon.png'));
	tray.setPressedImage(path.join(__dirname, 'menubar-icon-alt.png'));

	createTrayMenu();
	//updateTray();

	if (DEBUG) {
		//gui.Window.get().showDevTools();
	}
});
