
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

	grunt.registerTask('create-releases', 'Create the releases', function() {
		return grunt.task.run('zip-assets');
	});

	return grunt.registerTask('zip-assets', 'ZIP the assets', function() {

		var done = this.async();

		return zipAssets(grunt.config.get('popcorntime.buildDir'), getAssets(), function(error) {

			if (error) {
				return done(error);
			}

			return done();
		});
	});
};

getAssets = function() {
	var buildDir = grunt.config.get('popcorntime.buildDir');
	var rootPath = grunt.config.get('popcorntime.rootPath');
	var cacheDir = grunt.config.get('popcorntime.cacheDir');

	var cp = require('./task-helper')(grunt).cp;

	// copy ppm to be packaged as well
	var sourcePath = path.join(cacheDir, 'ppm');
	cp(sourcePath, path.join(buildDir, 'ppm'));

	switch (process.platform) {
		case 'darwin':
			return [{
				assetName: 'popcorn-time-mac.zip',
				sourcePath: 'Popcorn-Time.app'
			},{
				assetName: 'ppm-mac.zip',
				sourcePath: 'ppm'
			}];
			break;
		case 'win32':
			return [{
				assetName: 'popcorn-time-windows.zip',
				sourcePath: 'Popcorn-Time'
			},{
				assetName: 'ppm-windows.zip',
				sourcePath: path.join(buildDir, 'ppm', '*')
			}];
			break;
		case 'linux':
			var version = grunt.file.readJSON(path.join(rootPath, 'package.json')).version;

			var arch;
			if (process.arch === 'ia32') {
				arch = 'i386';
			} else {
				arch = 'x86_64';
			}

			// default file
			var files = [{
				assetName: 'popcorn-time-linux-' + arch + '.zip',
				sourcePath: 'Popcorn-Time'
			},{
				assetName: 'ppm-linux-' + arch + '.zip',
				sourcePath: 'ppm'
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

logError = function(message, error, details) {
	grunt.log.error(message);
	if (error) {
		grunt.log.error(error);
	}
	if (details) {
		return grunt.log.error(details);
	}
};

// zip assets
zipAssets = function(buildDir, assets, callback) {
	var buildDir = grunt.config.get('popcorntime.buildDir');

	var zip = function(directory, sourcePath, assetName, callback) {
		var zipCommand;

		if (process.platform === 'win32') {
			zipCommand = "C:/psmodules/7z.exe a -r " + assetName + " " + sourcePath;
		} else {
			zipCommand = "zip -r --symlinks " + assetName + " " + sourcePath;
		}

		var options = {
			cwd: directory,
			maxBuffer: Infinity
		};

		console.log(zipCommand);

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

		// skip zip file
		if (path.extname(assetName) !== '.zip') {
			fs.removeSync(path.join(buildDir, assetName));
			tasks.push(zip.bind(this, buildDir, sourcePath, assetName));
		}

	});

	return async.parallel(tasks, callback);
};
