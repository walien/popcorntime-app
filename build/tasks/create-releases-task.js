
var child_process = require('child_process');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var fs = require('fs-plus');
var grunt;

module.exports = function(gruntObject) {
	// expose grunt for the whole task
	grunt = gruntObject;

	var cp = require('./task-helper')(grunt).cp;
	var rm = require('./task-helper')(grunt).rm;

	grunt.registerTask('create-releases', 'Create the releases', function() {
		var done = this.async();

		return zipAssets(grunt.config.get('popcorntime.buildDir'), getAssets(), function(error) {

			if (error) {
				return done(error);
			}
			var buildDir = grunt.config.get('popcorntime.buildDir');

			// we don't need the generic .nw
			rm(path.resolve(buildDir, '..', 'Popcorn-Time.nw'));

			return done();
		});
	});

};

var getAssets = function() {
	var buildDir = grunt.config.get('popcorntime.buildDir');
	var rootPath = grunt.config.get('popcorntime.rootPath');
	var cacheDir = grunt.config.get('popcorntime.cacheDir');

	var cp = require('./task-helper')(grunt).cp;
	var rm = require('./task-helper')(grunt).rm;

	// copy ppm to be packaged as well
	var sourcePath = path.join(cacheDir, 'ppm');
	cp(sourcePath, path.join(buildDir, 'ppm'));

	switch (process.platform) {

		case 'darwin':

			// updater
			cp(cacheDir, path.join(buildDir, 'updater'));
			cp(path.join(buildDir, 'updater'), path.join(buildDir, 'updater-without-ppm'));
			rm(path.join(buildDir, 'updater-without-ppm', 'ppm'));

			return [{
				assetName: 'popcorn-time-mac.zip',
				sourcePath: 'Popcorn-Time.app'
			},{
				assetName: 'ppm-mac.zip',
				sourcePath: '.',
				cwd: path.join(buildDir, 'ppm')
			},{
				assetName: 'update-mac.nw',
				sourcePath: '.',
				cwd: path.join(buildDir, 'updater')
			},{
				assetName: 'update-without-ppm-mac.nw',
				sourcePath: '.',
				cwd: path.join(buildDir, 'updater-without-ppm')
			}];
			break;
		case 'win32':

			// updater
			// win need to be in Popcorn-Time/
			cp(cacheDir, path.join(buildDir, 'updater', 'Popcorn-Time'));
			cp(path.join(buildDir, 'updater'), path.join(buildDir, 'updater-without-ppm'));
			rm(path.join(buildDir, 'updater-without-ppm', 'Popcorn-Time', 'ppm'));

			return [{
				assetName: 'popcorn-time-windows.zip',
				sourcePath: 'Popcorn-Time'
			},{
				assetName: 'ppm-windows.zip',
				sourcePath: '.',
				cwd: path.join(buildDir, 'ppm')
			},{
				assetName: 'update-windows.nw',
				sourcePath: '.',
				cwd: path.join(buildDir, 'updater')
			},{
				assetName: 'update-without-ppm-windows.nw',
				sourcePath: '.',
				cwd: path.join(buildDir, 'updater-without-ppm')
			}];
			break;
		case 'linux':
			var version = grunt.file.readJSON(path.join(rootPath, 'package.json')).version;

			// updater
			cp(cacheDir, path.join(buildDir, 'updater'));
			cp(path.join(buildDir, 'updater'), path.join(buildDir, 'updater-without-ppm'));
			rm(path.join(buildDir, 'updater-without-ppm', 'ppm'));

			var arch;
			if (process.arch === 'ia32') {
				arch = 'i386';
			} else {
				arch = 'x86_64';
			}

			// linux installer
			cp(path.join(rootPath, 'dist','linux', 'linux-installer'), path.join(buildDir, 'linux-installer'));

			// default file
			var files = [{
				assetName: 'popcorn-time-linux-' + arch + '.tar.xz',
				sourcePath: 'Popcorn-Time'
			},{
				assetName: 'ppm-linux-' + arch + '.tar.xz',
				sourcePath: 'ppm'
			},{
				assetName: 'linux-installer',
				sourcePath: 'linux-installer'
			},{
				assetName: 'update-linux-' + arch + '.nw',
				sourcePath: '.',
				cwd: path.join(buildDir, 'updater')
			},{
				assetName: 'update-without-ppm-linux-' + arch + '.nw',
				sourcePath: '.',
				cwd: path.join(buildDir, 'updater-without-ppm')
			}];

			sourcePath = path.join(buildDir, 'popcorntime-' + version + '-' + arch + '.deb');
      		assetName = 'popcorntime-' + arch +'.deb';

			if (fs.isFileSync(sourcePath)) {

				cp(sourcePath, path.join(buildDir, assetName));

				files.push({
					assetName: assetName,
					sourcePath: sourcePath
				});
			}

			return files;
			break;
	}
};

// log errors
var logError = function(message, error, details) {
	grunt.log.error(message);
	if (error) {
		grunt.log.error(error);
	}
	if (details) {
		return grunt.log.error(details);
	}
};

// zip assets
var zipAssets = function(buildDir, assets, callback) {

	var buildDir = grunt.config.get('popcorntime.buildDir');

	var zip = function(directory, sourcePath, assetName, callback) {
		var zipCommand;

		if (process.platform === 'win32') {
			zipCommand = "C:/psmodules/7z.exe a -r " + assetName + " " + sourcePath;
		} else if (process.platform === 'linux' && path.extname(assetName) != '.nw') {
			zipCommand = "tar --exclude-vcs -caf " + assetName + " " + sourcePath;
		} else {
			zipCommand = "zip -r --symlinks " + assetName + " " + sourcePath;
		}

		var options = {
			cwd: directory,
			maxBuffer: Infinity
		};

		console.log(zipCommand + " @ " + directory);

		return child_process.exec(zipCommand, options, function(error, stdout, stderr) {
			if (error) {
				logError("Zipping " + sourcePath + " failed", error, stderr);
			}
			return callback(error);
		});
	};

	var tasks = [];
	_.each(assets, function(asset) {

		var assetName = asset.assetName;
		var sourcePath = asset.sourcePath;

		// zip file
		if (path.extname(assetName) === '.zip' || path.extname(assetName) === '.xz' || path.extname(assetName) === '.nw') {
			// make it available for jenkins


			var dir;
			if (asset.cwd) {
				dir = asset.cwd;
				assetName = path.join('..', '..', assetName);
			} else {
				dir = buildDir;
				assetName = path.join('..', assetName);
			}


			fs.removeSync(path.join(buildDir, assetName));
			tasks.push(zip.bind(this, dir, sourcePath, assetName));
		}

	});

	return async.parallel(tasks, callback);
};
