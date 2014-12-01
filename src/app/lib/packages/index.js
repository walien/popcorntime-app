var Q = require('q'),
	path = require('path'),
	_ = require('underscore'),
	fs = require('fs-plus'),
	Package = require('./package'),
	__slice = [].slice,
	packagePaths;

/*
 * Construction
 */
function PackageManager(options) {

	if (!(this instanceof PackageManager)) {
		return new PackageManager(options);
	}

	var self = this;

	this.options = _.defaults(options || {}, {
		path: process.cwd()
	});

	this.packageDirPaths = [];
	this.loadedPackages = {};
	this.activePackages = {};

	this.packageDirPaths.push(path.join(this.options.path, 'src', 'content', 'packages'));

}

/*
 * Paths
 */
PackageManager.prototype.getAvailablePackagePaths = function () {
	var packagePaths = [];

	// return our packages paths
	_.each(this.packageDirPaths, function(packageDirPath) {
		_.each(fs.listSync(packageDirPath), function(packagePath) {
			if (fs.isDirectorySync(packagePath)) {
				packagePaths.push(packagePath);
			}
		})
	});

	return _.uniq(packagePaths);
};

/*
 * Load all packages
 */
PackageManager.prototype.loadPackages = function (callback) {
	var self = this;

	return Q.Promise(function (resolve, reject) {
		packagePaths = self.getAvailablePackagePaths();

		_.each(packagePaths, function (packagePath) {
			try {
				self.loadPackage(packagePath);
			} catch (error) {
				return console.log('Failed to load package ' + (path.basename(packagePath)), error);
			}
		});

		// once all packages are loaded we trigger the
		// afterActivate event available
		_.each(this.loadedPackages, function (myPackage) {
			if (_.isFunction(myPackage.bundledPackage.afterActivate)) {
				myPackage.bundledPackage.afterActivate();
			}
		});

		return resolve();
	});
};

/*
 * Load Package using name or path
 */
PackageManager.prototype.loadPackage = function (nameOrPath) {
	var error, metadata, name, pack, packagePath, _ref, _ref1;

	// already loaded?
	if (pack = this.getLoadedPackage(nameOrPath)) {
		return pack;
	}

	if (packagePath = this.resolvePackagePath(nameOrPath)) {
		name = path.basename(nameOrPath);
		if (pack = this.getLoadedPackage(name)) {
			return pack;
		}
		try {

			metadata = (_ref = Package.loadMetadata(packagePath)) != null ? _ref : {};

			pack = new Package(packagePath, metadata);

			pack.load();
			pack.activate();

			//console.log('Loaded ' + name + ' in ' + pack.loadTime + 's');

			this.loadedPackages[pack.name] = pack;
			return pack;

		} catch (_error) {
			error = _error;
			return console.log('Failed to load package.json ' + (path.basename(packagePath)), (_ref1 = error.stack) != null ? _ref1 : error);
		}
	} else {
		throw new Error('Could not resolve ' + nameOrPath + ' to a package path');
	}
};

/*
 * Helper functions
 */

PackageManager.prototype.getLoadedPackages = function () {
	return _.values(this.loadedPackages);
};

PackageManager.prototype.getLoadedPackage = function (name) {
	return this.loadedPackages[name];
};

PackageManager.prototype.resolvePackagePath = function (name) {
	var packagePath;
	if (fs.isDirectorySync(name)) {
		return name;
	}
	packagePath = fs.resolve.apply(fs, __slice.call(this.packageDirPaths).concat([name]));

	if (fs.isDirectorySync(packagePath)) {
		return packagePath;
	}
};

PackageManager.prototype.generatePackage = function (name) {

	// we check if path exist
	var newPath = path.join(_.first(this.packageDirPaths), name);
	if (!fs.isDirectorySync(newPath)) {

		fs.mkdir(newPath,function(e){

			var template = {};

			// create lib path
			fs.mkdirSync(path.join(newPath, 'lib'));

			// build our skeleton
			fs.writeFileSync(path.join(newPath, 'README.md'), '# ' + name);
			fs.writeFileSync(path.join(newPath, 'package.json'), JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, 'skeleton/package.json'), 'utf8')), null, 4).replace(/{{name}}/g, name) + '\n');
			fs.writeFileSync(path.join(newPath, '/lib/' + name + '.js'), fs.readFileSync(path.join(__dirname, 'skeleton/lib.js')));

			// open the new created package
			window.App.gui.Shell.openItem(newPath);
		});

	} else {
		window.alert('This package name already exist...');
	}

};


/*
 * Deps
 * Not supported in 0.0.1

PackageManager.prototype.getPackageDependencies = function() {
    var metadataPath, _ref;

    if (this.packageDependencies == null) {
        try {

            metadataPath = path.join(this.options.path, 'package.json');
            this.packageDependencies = ((_ref = JSON.parse(fs.readFileSync(metadataPath))) != null ? _ref : {}).packageDependencies;

        } catch (_error) {}

        if (this.packageDependencies == null) {
            this.packageDependencies = {};
        }
    }

    return this.packageDependencies;
};
 */

module.exports = new PackageManager();
