'use strict';
var path = require('path');
var spawn = require('child_process').spawn;
var findupSync = require('findup-sync');
//var chardet = require('jschardet')
//var iconv = require('iconv-lite')
var BufferHelper = require('bufferhelper')
//var currentPath = require('current-path');
var notifier = require('node-notifier');

var displayNotification = function(opt){
	// use	displayBalloon on windows instead
	if (process.platform === 'win32') {
		tray.displayBalloon({
			icon: opt.icon,
			title: opt.title || 'Gulp',
			content: opt.text || opt.subtitle
		});
		return;
	}

	if (process.platform === 'darwin') {
		var fn = require('display-notification'); // osx only
		fn(opt);
		return;
	}

	// not working on win10
	// for linux, test needed
	notifier.notify({
		icon: opt.icon,
		title: opt.title || 'Gulp',
		subtitle: opt.subtitle,
		message: opt.text,
		sound: opt.sound
	});
};

var getGulpTasks = require('./get-gulp-tasks');
var _ = require('lodash');
var fixPath = require('fix-path');

var app = require('app');
var dialog = require('dialog');
var Tray = require('tray');
var Menu = require('menu');
var MenuItem = require('menu-item');

var DEBUG = true;
//var TRAY_UPDATE_INTERVAL = 1000;

var tray;
var prevPath;
var recentProjects = [];
/*
var currentProject = {
	name: 'No gulpfile found',
	tasks: []
};
*/

//require('crash-reporter').start();

app.dock.hide();

// fix the $PATH on OS X
fixPath();

function runTask(project, taskName) {
	var cp = spawn(project.gulp, [taskName, '--no-color'], {
		cwd: project.path
	});

	var outBH = new BufferHelper();
	cp.stdout.on('data', function (buf) {
		outBH.concat(buf);
	});

	// TODO: show progress in menubar menu
	//tray.menu = createTrayMenu(name, [], 'progress here');

	var errBH = new BufferHelper();
	cp.stderr.on('data', function (buf) {
		errBH.concat(buf);
	});

	cp.on('exit', function (code) {
		var outStr = outBH.toBuffer().toString();
		if (outStr) {
			console.log(outStr);
		}

		var errStr = errBH.toBuffer().toString();
		if (errStr) {
			console.error(errStr);
		}

		if (code === 0) {
			displayNotification({
				title: project.name + ' ['+ taskName +']',
				subtitle: 'Finished running task'
			});
		} else {
			console.error('Exited with error code ' + code);
			displayNotification({
				title: project.name + ' ['+ taskName +']',
				text: '[error] ' + errStr,
				sound: 'Basso'
			});
		}
	});
}

function addRecentProject(dirPath) {
	var project = {};
	project.path = dirPath;

	try {
		var pkgPath = findupSync('package.json', {
			cwd: dirPath
		});
		var pkg = require(pkgPath);
		project.name = pkg.name;
	} catch(err) {
		project.name = path.basename(dirPath, path.extname(dirPath));
	}

	getProjectTasks(project, function (err, tasks, gulpPath) {
		// always no error
		project.menu = createProjectMenu(project);

		recentProjects = recentProjects.filter(function (el) {
			return el.path !== project.path;
		});
		if (recentProjects.length === 10) {
			recentProjects.pop();
		}
		recentProjects.unshift(project);

		console.log(prevPath, dirPath);

		// TODO: this prevent updating of tasklist from changes in the gulpfile
		//if (prevPath !== dirPath) {
			prevPath = dirPath;
			createTrayMenu();
		//}

		displayNotification({
			title: project.name,
			subtitle: 'Project is ready'
		})
	});
}

function getProjectTasks(project, callback) {
	getGulpTasks(project.path, function (err, tasks, gulpPath) {
		if (err) {
			//if (err.code !== 'MODULE_NOT_FOUND') {
			//	console.error(err);
			//}
			//callback(err);

			// ignore err, return empty tasks
			displayNotification({
				title: project.name,
				text: '[error] ' + err.message
			});
			callback(null);
			return;
		}

		tasks = _.pull(tasks, 'default');
		tasks.unshift('default');

		project.tasks = tasks;
		project.gulp = gulpPath;
		callback(null);
	});
}

function createProjectMenu(project) {
	var menu = new Menu();

	menu.append(new MenuItem({
		label: 'Remove',
		click: function () {
			var index = recentProjects.indexOf(project);
			recentProjects.splice(index, 1);
			createTrayMenu();
		}
	}));
	menu.append(new MenuItem({
		label: 'Refresh',
		click: function () {
			var index = recentProjects.indexOf(project);
			recentProjects.splice(index, 1);
			addRecentProject(project.path);
		}
	}));

	menu.append(new MenuItem({type: 'separator'}));

	if (project.tasks && project.tasks.length > 0) {
		project.tasks.forEach(function (task) {
			menu.append(new MenuItem({
				label: task,
				click: function () {
					runTask(project, task);
				}
			}));
		});
	} else {
		menu.append(new MenuItem({
			label: 'No task yet',
			enabled: false
		}));
	}

	return menu;
}

function createTrayMenu() {
	var menu = new Menu();

	menu.append(new MenuItem({
		label: 'Open Project',
		click: function () {
			dialog.showOpenDialog(null, {
				title: 'Pick a project',
				properties: ['openDirectory'],
				defaultPath: path.resolve(process.cwd(), '../..')
			}, function (dirs) {
				addRecentProject(dirs[0]);
			});
		}
	}));

	recentProjects.forEach(function (project) {
		menu.append(new MenuItem({
			label: project.name,
			submenu: project.menu
		}));
	});

	menu.append(new MenuItem({type: 'separator'}));
	menu.append(new MenuItem({
		label: 'Quit',
		click: app.quit
	}));

	tray.setContextMenu(menu);
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
