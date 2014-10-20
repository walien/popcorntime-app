(function(App) {
    'use strict';

    var path = require('path'),
        _ = require('underscore'),
        fs = require('fs-plus'),
        Package = require('./lib/package'),
        __slice = [].slice,
        packagePaths;

    function PackageManager(options) {
        if (!(this instanceof PackageManager)) {
            return new PackageManager(options);
        }

        var self = this;

        this.options = _.defaults(options || {}, {
            path: App.settings.os === 'linux' ? process.execPath : process.cwd()
        });

        this.packageDirPaths = [];
        this.loadedPackages = {};
        this.activePackages = {};

        this.packageDirPaths.push(path.join(this.options.path, 'src', 'app', 'packages'));
    }

    PackageManager.prototype.getAvailablePackagePaths = function() {
        var packageDirPath,
            packageVersion,
            packageName,
            packagePath,
            packagePaths = [],
            packagesPath;

        var _ref = this.packageDirPaths;

        for (var _i in _ref) {
            packageDirPath = _ref[_i];

            var _ref1 = fs.listSync(packageDirPath);

            for (var _j in _ref1) {
                packagePath = _ref1[_j];

                if (fs.isDirectorySync(packagePath)) {
                    packagePaths.push(packagePath);
                }

            }
        }

        packagesPath = path.join(this.options.path, 'node_modules');
        var _ref2 = this.getPackageDependencies();

        for (packageName in _ref2) {
            packageVersion = _ref2[packageName];
            packagePath = path.join(packagesPath, packageName);

            if (fs.isDirectorySync(packagePath)) {
                packagePaths.push(packagePath);
            }

        }

        return _.uniq(packagePaths);
    };

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

    PackageManager.prototype.isPackageDisabled = function(name) {
        return false;
    };

    PackageManager.prototype.getLoadedPackages = function() {
        return _.values(this.loadedPackages);
    };

    PackageManager.prototype.getLoadedPackage = function(name) {
        return this.loadedPackages[name];
    };

    PackageManager.prototype.resolvePackagePath = function(name) {
        var packagePath;
        if (fs.isDirectorySync(name)) {
            return name;
        }
        packagePath = fs.resolve.apply(fs, __slice.call(this.packageDirPaths).concat([name]));

        if (fs.isDirectorySync(packagePath)) {
            return packagePath;
        }

        packagePath = path.join(this.resourcePath, 'node_modules', name);
        if (this.hasAtomEngine(packagePath)) {
            return packagePath;
        }
    };

    PackageManager.prototype.loadPackages = function() {
        var _i, _len, packagePath;

        console.log('Load All Packages');

        packagePaths = this.getAvailablePackagePaths();

        packagePaths = packagePaths.filter((function(_this) {
            return function(packagePath) {
                return !_this.isPackageDisabled(path.basename(packagePath));
            };
        })(this));

        packagePaths = _.uniq(packagePaths, function(packagePath) {
            return path.basename(packagePath);
        });

        for (_i = 0, _len = packagePaths.length; _i < _len; _i++) {
            packagePath = packagePaths[_i];
            this.loadPackage(packagePath);
        }

    };

    PackageManager.prototype.loadPackage = function(nameOrPath) {
        var error, metadata, name, pack, packagePath, _ref, _ref1;
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

    App.PackageManager = PackageManager;

})(window.App);