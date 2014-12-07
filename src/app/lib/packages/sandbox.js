var path = require('path'),
	Module = require('module'),
	_ = require('lodash');

function AppSandbox(options) {
	this.options = _.defaults(options || {}, AppSandbox.defaults);
}

AppSandbox.prototype.loadApp = function loadAppSandboxed(packagePath) {
	var packageFile = require.resolve(packagePath),
		appBase = path.dirname(packageFile);

	this.options.appRoot = process.cwd();
	return this.loadModule(packagePath);
};

AppSandbox.prototype.loadModule = function loadModuleSandboxed(modulePath) {

	var self = this,
		moduleDir = path.dirname(modulePath),
		parentModulePath = self.options.parent || module.parent,
		appRoot = self.options.appRoot || moduleDir,
		currentModule,
		nodeRequire;


	modulePath = Module._resolveFilename(modulePath, parentModulePath);
	currentModule = new Module(modulePath, parentModulePath);

	nodeRequire = currentModule.require;

	currentModule.require = function requireProxy(module) {
		// check whitelist, plugin config, etc.
		if (_.contains(self.options.blacklist, module)) {
			throw new Error('Unsafe App require: ' + module);
		}

		var firstTwo = module.slice(0, 2),
			resolvedPath,
			relPath,
			innerBox,
			newOpts;

		// load relative modules with their own sandbox
		if (firstTwo === './' || firstTwo === '..') {
			// Get the path relative to the modules directory
			resolvedPath = path.resolve(moduleDir, module);

			//console.log(moduleDir);
			//console.log(module);

			// Check relative path from the appRoot for outside requires
			relPath = path.relative(appRoot, resolvedPath);
			if (relPath.slice(0, 2) === '..') {
				throw new Error('Unsafe App require: ' + relPath);
			}

			// Assign as new module path
			module = resolvedPath;

			newOpts = _.extend({}, self.options);

			newOpts.appRoot = appRoot;
			newOpts.parent = currentModule.parent;

			innerBox = new AppSandbox(newOpts);
			try {
				return innerBox.loadModule(module);
			} catch (e) {
				throw e;
			}
		}

		// original require method for listed named modules
		return nodeRequire.call(currentModule, module);
	};

	try {
		currentModule.load(currentModule.id);
		return currentModule.exports;
	} catch (e) {
		throw e;
	}
};

AppSandbox.defaults = {
	blacklist: ['fs']
};

module.exports = AppSandbox;
