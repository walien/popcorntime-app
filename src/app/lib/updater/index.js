var
	Updater,
	_ = require('lodash'),
	semver = require('semver'),
	fs = require('fs'),
	Q = require('q'),
	rm = require('rimraf'),
	path = require('path'),
	crypto = require('crypto'),
	request = require('request'),
	zip = require('adm-zip'),
	spawn = require('child_process').spawn,
	UPDATE_ENDPOINT,
	CHANNELS = ['stable', 'beta', 'nightly'],
	FILENAME = 'package.nw.new',
	VERIFY_PUBKEY =
	'-----BEGIN PUBLIC KEY-----\n' +
	'MIIBtjCCASsGByqGSM44BAEwggEeAoGBAPNM5SX+yR8MJNrX9uCQIiy0t3IsyNHs\n' +
	'HWA180wDDd3S+DzQgIzDXBqlYVmcovclX+1wafshVDw3xFTJGuKuva7JS3yKnjds\n' +
	'NXbvM9CrJ2Jngfd0yQPmSh41qmJXHHSwZfPZBxQnspKjbcC5qypM5DqX9oDSJm2l\n' +
	'fM/weiUGnIf7AhUAgokTdF7G0USfpkUUOaBOmzx2RRkCgYAyy5WJDESLoU8vHbQc\n' +
	'rAMnPZrImUwjFD6Pa3CxhkZrulsAOUb/gmc7B0K9I6p+UlJoAvVPXOBMVG/MYeBJ\n' +
	'19/BH5UNeI1sGT5/Kg2k2rHVpuqzcvlS/qctIENgCNMo49l3LrkHbJPXKJ6bf+T2\n' +
	'8lFWRP2kVlrx/cHdqSi6aHoGTAOBhAACgYBTNeXBHbWDOxzSJcD6q4UDGTnHaHHP\n' +
	'JgeCrPkH6GBa9azUsZ+3MA98b46yhWO2QuRwmFQwPiME+Brim3tHlSuXbL1e5qKf\n' +
	'GOm3OxA3zKXG4cjy6TyEKajYlT45Q+tgt1L1HuGAJjWFRSA0PP9ctC6nH+2N3HmW\n' +
	'RTcms0CPio56gg==\n' +
	'-----END PUBLIC KEY-----\n',
	_jQuery;

function forcedBind(func, thisVar) {
	return function () {
		return func.apply(thisVar, arguments);
	};
}

function Updater(settingsInstance, __jQuery, options) {
	var that = this;
	this.settings = settingsInstance;

	var self = this;
	UPDATE_ENDPOINT = this.settings.get('updateApiEndpoint') + 'update.json';

	this.options = _.defaults(options || {}, {
		endpoint: UPDATE_ENDPOINT,
		channel: 'beta'
	});

	this.outputDir = this.settings.get('os') === 'linux' ? process.execPath : process.cwd();
	this.updateData = null;

	_jQuery = __jQuery;

	// check for update
	this.update();
}


Updater.prototype.check = function () {
	var defer = Q.defer();
	var promise = defer.promise;
	var self = this;

	if (!(!_.contains(fs.readdirSync('.'), '.git') || // Test Development
			( // Test Windows
				self.settings.get('os') === 'windows' &&
				process.cwd().indexOf(process.env.APPDATA) !== -1
			) ||
			( // Test Linux
				self.settings.get('os') === 'linux' &&
				_.contains(fs.readdirSync('.'), 'package.nw')
			) ||
			( // Test Mac OS X
				self.settings.get('os') === 'mac' &&
				process.cwd().indexOf('Resources/app.nw') !== -1
			))) {
		console.debug('Not updating because we are running in a development environment');
		defer.resolve(false);
		return defer.promise;
	}

	request(this.options.endpoint, {
		json: true
	}, function (err, res, data) {
		if (err || !data) {
			defer.reject(err);
		} else {
			defer.resolve(data);
		}
	});

	return promise.then(function (data) {
		if (!_.contains(Object.keys(data), self.settings.get('os'))) {
			// No update for this OS, FreeBSD or SunOS.
			// Must not be an official binary
			return false;
		}

		var updateData = data[self.settings.get('os')];
		var currentVersion = self.settings.get('version');

		// arch
		if (self.settings.get('os') === 'linux') {
			updateData = updateData[self.settings.get('arch')];
		}

		// Normalize the version number
		if (!updateData.version.match(/-\d+$/)) {
			updateData.version += '-0';
		}

		if (!currentVersion.match(/-\d+$/)) {
			currentVersion += '-0';
		}

		if (semver.gt(updateData.version, currentVersion)) {
			console.debug('Updating to version %s', updateData.version);
			self.updateData = updateData;
			return true;
		}

		console.debug('Not updating because we are running the latest version');
		return false;
	});
};

Updater.prototype.download = function (source, output) {
	var defer = Q.defer();
	var downloadStream = request(source);
	downloadStream.pipe(fs.createWriteStream(output));
	downloadStream.on('complete', function () {
		defer.resolve(output);
	});
	return defer.promise;
};

Updater.prototype.verify = function (source) {
	var defer = Q.defer();
	var self = this;

	var hash = crypto.createHash('SHA1'),
		verify = crypto.createVerify('DSA-SHA1');

	var readStream = fs.createReadStream(source);
	readStream.pipe(hash);
	readStream.pipe(verify);
	readStream.on('end', function () {
		hash.end();
		if (
			self.updateData.checksum !== hash.read().toString('hex') ||
			verify.verify(VERIFY_PUBKEY, self.updateData.signature, 'base64') === false
		) {
			defer.reject('invalid hash or signature');
		} else {
			defer.resolve(source);
		}
	});
	return defer.promise;
};

function installWindows(downloadPath, updateData) {
	var installDir = path.dirname(downloadPath);
	var defer = Q.defer();

	var pack = new zip(downloadPath);
	pack.extractAllToAsync(installDir, true, function (err) {
		if (err) {
			defer.reject(err);
		} else {
			fs.unlink(downloadPath, function (err) {
				if (err) {
					defer.reject(err);
				} else {
					defer.resolve();
				}
			});
		}
	});

	return defer.promise;
}

function installLinux(downloadPath, updateData) {
	var outputDir = path.dirname(downloadPath),
		packageFile = path.join(outputDir, 'package.nw');
	var defer = Q.defer();

	fs.rename(packageFile, path.join(outputDir, 'package.nw.old'), function (err) {
		if (err) {
			defer.reject(err);
		} else {
			fs.rename(downloadPath, packageFile, function (err) {
				if (err) {
					// Sheeet! We got a booboo :'(
					// Quick! Lets erase it before anyone realizes!
					if (fs.existsSync(downloadPath)) {
						fs.unlink(downloadPath, function (err) {
							if (err) {
								defer.reject(err);
							} else {
								fs.rename(path.join(outputDir, 'package.nw.old'), packageFile, function (err) {
									// err is either an error or undefined, so its fine not to check!
									defer.reject(err);
								});
							}
						});
					} else {
						defer.reject(err);
					}
				} else {
					fs.unlink(path.join(outputDir, 'package.nw.old'), function (err) {
						if (err) {
							// This is a non-fatal error, should we reject?
							defer.reject(err);
						} else {
							defer.resolve();
						}
					});
				}
			});
		}
	});

	return defer.promise;
}

function installOSX(downloadPath, updateData) {
	var outputDir = path.dirname(downloadPath),
		installDir = path.join(outputDir, 'app.nw');
	var defer = Q.defer();

	rm(installDir, function (err) {
		if (err) {
			defer.reject(err);
		} else {
			var pack = new zip(downloadPath);
			pack.extractAllToAsync(installDir, true, function (err) {
				if (err) {
					defer.reject(err);
				} else {
					fs.unlink(downloadPath, function (err) {
						if (err) {
							defer.reject(err);
						} else {
							defer.resolve();
						}
					});
				}
			});
		}
	});

	return defer.promise;
}

Updater.prototype.install = function (downloadPath) {
	var os = this.settings.get('os');
	var promise;
	if (os === 'windows') {
		promise = installWindows;
	} else if (os === 'linux') {
		promise = installLinux;
	} else if (os === 'mac') {
		promise = installOSX;
	} else {
		return Q.reject('Unsupported OS');
	}

	return promise(downloadPath, this.updateData);
};

Updater.prototype.displayNotification = function () {
	var self = this;
	var $el = _jQuery('#notification');

	$el.html(
		'<h1>' + this.updateData.title + ' Installed</h1>' +
		'<p>&nbsp;- ' + this.updateData.description + '</p>' +
		'<span class="btn-grp">' +
		'<a class="btn chnglog">Changelog</a>' +
		'<a class="btn restart">Restart Now</a>' +
		'</span>'
	).addClass('blue');

	var $restart = _jQuery('.btn.restart'),
		$chnglog = _jQuery('.btn.chnglog');

	$restart.on('click', function () {
		var argv = gui.App.fullArgv;
		argv.push(self.outputDir);
		spawn(process.execPath, argv, {
			cwd: self.outputDir,
			detached: true,
			stdio: ['ignore', 'ignore', 'ignore']
		}).unref();
		gui.App.quit();
	});

	$chnglog.on('click', function () {
		var $changelog = _jQuery('#changelog-container').html(_.template(_jQuery('#changelog-tpl').html())(this.updateData));
		$changelog.find('.btn-close').on('click', function () {
			$changelog.hide();
		});
		$changelog.show();
	});

	_jQuery('body').addClass('has-notification');
};

Updater.prototype.update = function () {
	var outputFile = path.join(path.dirname(this.outputDir), FILENAME);

	if (this.updateData) {
		// If we have already checked for updates...
		return this.download(this.updateData.updateUrl, outputFile)
			.then(forcedBind(this.verify, this))
			.then(forcedBind(this.install, this))
			.then(forcedBind(this.displayNotification, this));
	} else {
		// Otherwise, check for updates then install if needed!
		var self = this;
		return this.check().then(function (updateAvailable) {
			if (updateAvailable) {
				return self.download(self.updateData.updateUrl, outputFile)
					.then(forcedBind(self.verify, self))
					.then(forcedBind(self.install, self))
					.then(forcedBind(self.displayNotification, self));
			} else {
				return false;
			}
		});
	}
};

module.exports = function (settingsInstance, jQuery, options) {
	return new Updater(settingsInstance, jQuery, options);
};
