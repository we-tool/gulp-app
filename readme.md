# gulp-app

Easily run [gulp](https://github.com/gulpjs/gulp) tasks from the tray menu and get notified when it's finished.

Forked from [sindresorhus/gulp-app](https://github.com/sindresorhus/gulp-app) to support **Windows** as well as **OSX**.

<img src="media/screenshot.png" width="315">

<img src="media-win/menu-project.png" width="408">

## Install electron

Electron is cached at `~/.electron` or `%USERPROFILE%\.electron` folder on Windows.

Download the right version from http://electron.atom.io and place the zip at the cache folder.

Add it to the PATH.

## Run the app

```plain
$ cd ./gulp-app
$ electron ./app
```

## Package the app (not work now..)

```plain
$ npm i -g electron-packager
```

```plain
$ ls ~/.electron   # to see the versions you own
$ dir %USERPROFILE%\.electron   # or on Windows
```

```plain
$ cd ./gulp-app
$ electron-packager ./app Gulp --cache=%USERPROFILE%\.electron --platform=win32 --arch=x64 --version=0.31.0   # specify the flags you need
```

## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
