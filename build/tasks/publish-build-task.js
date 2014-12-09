// Github helper to upload CI release

var GitHub, async, child_process, commitSha, defaultHeaders, deleteExistingAssets, deleteRelease, fs, getAssets, getAtomDraftRelease, grunt, logError, path, request, token, uploadAssets, zipAssets, _,
	__slice = [].slice,
	__indexOf = [].indexOf || function(item) {
		for (var i = 0, l = this.length; i < l; i++) {
			if (i in this && this[i] === item) return i;
		}
		return -1;
	};

child_process = require('child_process');
path = require('path');
_ = require('lodash');
async = require('async');
fs = require('fs-plus');
GitHub = require('github-releases');
request = require('request');
grunt = null;
token = process.env.POPCORNTIME_ACCESS_TOKEN;

defaultHeaders = {
	Authorization: "token " + token,
	'User-Agent': 'PopcornTime'
};

module.exports = function(gruntObject) {
	var cp;
	grunt = gruntObject;
	cp = require('./task-helper')(grunt).cp;

	grunt.registerTask('publish-build', 'Publish the built app', function() {
		return grunt.task.run('upload-assets');
	});

	return grunt.registerTask('upload-assets', 'Upload the assets to a GitHub release', function() {
		var assets, buildDir, done, doneCallback, startTime;
		doneCallback = this.async();
		startTime = Date.now();
		done = function() {
			var args, elapsedTime;
			args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
			elapsedTime = Math.round((Date.now() - startTime) / 100) / 10;
			grunt.log.ok("Upload time: " + elapsedTime + "s");
			return doneCallback.apply(null, args);
		};
		if (!token) {
			return done(new Error('POPCORNTIME_ACCESS_TOKEN environment variable not set'));
		}
		buildDir = grunt.config.get('popcorntime.buildDir');
		assets = getAssets();

		return zipAssets(buildDir, assets, function(error) {
			if (error != null) {
				return done(error);
			}
			return getRelease(function(error, release) {
				var asset, assetNames;
				if (error != null) {
					return done(error);
				}
				assetNames = (function() {
					var _i, _len, _results;
					_results = [];
					for (_i = 0, _len = assets.length; _i < _len; _i++) {
						asset = assets[_i];
						_results.push(asset.assetName);
					}
					return _results;
				})();
				return deleteExistingAssets(release, assetNames, function(error) {
					if (error != null) {
						return done(error);
					}
					return uploadAssets(release, buildDir, assets, done);
				});
			});
		});
	});
};

getAssets = function() {
	switch (process.platform) {
		case 'darwin':
			return [{
				assetName: 'popcorn-time-mac.zip',
				sourcePath: 'Popcorn-Time.app'
			}];
			break;
		case 'win32':
			return [{
				assetName: 'popcorn-time-windows.zip',
				sourcePath: 'Popcorn-Time'
			}];
			break;
		case 'linux':
			return [{
				assetName: 'popcorn-time-linux' + process.arch.replace(/;ia|;x|;arm/, "") + '.zip',
				sourcePath: 'Popcorn-Time'
			}];
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

zipAssets = function(buildDir, assets, callback) {
	var assetName, sourcePath, tasks, zip, _i, _len, _ref;
	zip = function(directory, sourcePath, assetName, callback) {
		var options, zipCommand;
		if (process.platform === 'win32') {
			zipCommand = "C:/psmodules/7z.exe a -r " + assetName + " " + sourcePath;
		} else {
			zipCommand = "zip -r --symlinks " + assetName + " " + sourcePath;
		}
		options = {
			cwd: directory,
			maxBuffer: Infinity
		};
		return child_process.exec(zipCommand, options, function(error, stdout, stderr) {
			if (error != null) {
				logError("Zipping " + sourcePath + " failed", error, stderr);
			}
			return callback(error);
		});
	};
	tasks = [];
	for (_i = 0, _len = assets.length; _i < _len; _i++) {
		_ref = assets[_i], assetName = _ref.assetName, sourcePath = _ref.sourcePath;
		if (!(path.extname(assetName) === '.zip')) {
			continue;
		}
		fs.removeSync(path.join(buildDir, assetName));
		tasks.push(zip.bind(this, buildDir, sourcePath, assetName));
	}
	return async.parallel(tasks, callback);
};

getRelease = function(callback) {
	var popcornRepo = new GitHub({
		repo: 'popcorn-official/nightly',
		token: token
	});
	return popcornRepo.getReleases(function(error, releases) {
		var firstDraft, options;
		if (releases == null) {
			releases = [];
		}
		if (error != null) {
			logError('Fetching popcorn-official/nightly releases failed', error, releases);
			return callback(error);
		} else {
			firstDraft = releases[0];
			if (firstDraft != null) {
				options = {
					uri: firstDraft.assets_url,
					method: 'GET',
					headers: defaultHeaders,
					json: true
				};
				return request(options, function(error, response, assets) {
					if (assets == null) {
						assets = [];
					}
					if ((error != null) || response.statusCode !== 200) {
						logError('Fetching draft release assets failed', error, assets);
						return callback(error != null ? error : new Error(response.statusCode));
					} else {
						firstDraft.assets = assets;
						return callback(null, firstDraft);
					}
				});
			} else {
				return callback(new Error('No release in popcorn-official/nightly repo'));
			}
		}
	});
};

deleteRelease = function(release) {
	var options;
	options = {
		uri: release.url,
		method: 'DELETE',
		headers: defaultHeaders,
		json: true
	};
	return request(options, function(error, response, body) {
		if (body == null) {
			body = '';
		}
		if ((error != null) || response.statusCode !== 204) {
			return logError('Deleting release failed', error, body);
		}
	});
};

deleteExistingAssets = function(release, assetNames, callback) {
	var asset, deleteAsset, tasks, _i, _len, _ref, _ref1, _ref2;
	if (callback == null) {
		_ref = [assetNames, callback], callback = _ref[0], assetNames = _ref[1];
	}
	deleteAsset = function(url, callback) {
		var options;
		options = {
			uri: url,
			method: 'DELETE',
			headers: defaultHeaders
		};
		return request(options, function(error, response, body) {
			if (body == null) {
				body = '';
			}
			if ((error != null) || response.statusCode !== 204) {
				logError('Deleting existing release asset failed', error, body);
				return callback(error != null ? error : new Error(response.statusCode));
			} else {
				return callback();
			}
		});
	};

	tasks = [];
    _.each(release.assets, function(asset) {
        if ((assetNames == null) || (_ref2 = asset.name, __indexOf.call(assetNames, _ref2) >= 0)) {
			tasks.push(deleteAsset.bind(this, asset.url));
		}
    });
	return async.parallel(tasks, callback);
};

uploadAssets = function(release, buildDir, assets, callback) {
	var assetName, assetPath, tasks, upload, _i, _len;
	upload = function(release, assetName, assetPath, callback) {
		var assetRequest, options;
		options = {
			uri: release.upload_url.replace(/\{.*$/, "?name=" + assetName),
			method: 'POST',
			headers: _.extend({
				'Content-Type': 'application/zip',
				'Content-Length': fs.getSizeSync(assetPath)
			}, defaultHeaders)
		};
		assetRequest = request(options, function(error, response, body) {
			if (body == null) {
				body = '';
			}
			if ((error != null) || response.statusCode >= 400) {
				logError("Upload release asset " + assetName + " failed", error, body);
				return callback(error != null ? error : new Error(response.statusCode));
			} else {
				return callback(null, release);
			}
		});
		return fs.createReadStream(assetPath).pipe(assetRequest);
	};
	tasks = [];
	for (_i = 0, _len = assets.length; _i < _len; _i++) {
		assetName = assets[_i].assetName;
		assetPath = path.join(buildDir, assetName);
		tasks.push(upload.bind(this, release, assetName, assetPath));
	}
	return async.parallel(tasks, callback);
};
