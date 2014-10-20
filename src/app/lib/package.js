var CSON = require('season'),
    path = require('path'),
    fs = require('fs-plus'),
    Package;

/*
  Section: Construction
*/
function Package(path, metadata) {
    var _ref1, _ref2;
    this.path = path;
    this.metadata = metadata;

    if (this.metadata == null) {
        this.metadata = Package.loadMetadata(this.path);
    }

    this.name = (_ref1 = (_ref2 = this.metadata) != null ? _ref2.name : void 0) != null ? _ref1 : path.basename(this.path);
    console.log('Loading package: ' + this.name);
}

Package.prototype.keymaps = null;

Package.prototype.menus = null;

/*
  Load Meta Data from package.json
*/
Package.loadMetadata = function(packagePath, ignoreErrors) {

    var error, metadata, metadataPath;
    if (ignoreErrors == null) {
        ignoreErrors = false;
    }
    if (metadataPath = CSON.resolve(path.join(packagePath, 'package'))) {

        try {
            metadata = CSON.readFileSync(metadataPath);
        } catch (_error) {

            error = _error;
            if (!ignoreErrors) {
                throw error;
            }

        }
    }

    if (metadata == null) {
        metadata = {};
    }

    metadata.name = path.basename(packagePath);
    console.debug(metadata);
    return metadata;
};

Package.prototype.measure = function(key, fn) {
    var startTime, value;
    startTime = Date.now();
    value = fn();
    this[key] = Date.now() - startTime;
    return value;
};

Package.prototype.load = function() {

    this.measure('loadTime', (function(_this) {
        return function() {
            var error, _ref1;
            try {

                // do all we need here
                _this.loadKeymaps();

            } catch (_error) {
                error = _error;
                return console.log('Failed to load package named ' + _this.name, (_ref1 = error.stack) != null ? _ref1 : error);
            }
        };
    })(this));

    console.log(this.keymaps);
    return this;

};

Package.prototype.loadKeymaps = function() {
    return this.keymaps = this.getKeymapPaths().map(function(keymapPath) {
        return [keymapPath, CSON.readFileSync(keymapPath)];
    });
};

Package.prototype.getKeymapPaths = function() {
    var keymapsDirPath;
    keymapsDirPath = path.join(this.path, 'keymaps');
    if (this.metadata.keymaps) {
        return this.metadata.keymaps.map(function(name) {
            return fs.resolve(keymapsDirPath, name, ['json', 'cson', '']);
        });
    } else {
        return fs.listSync(keymapsDirPath, ['cson', 'json']);
    }
};

Package.prototype.hasActivationCommands = function() {
    return false;
};

module.exports = Package;