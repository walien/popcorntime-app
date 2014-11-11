var path = require('path'),
	_ = require('underscore'),
	fs = require('fs');

/*
 * Construction
 */
function ThemeManager(settingsInstance) {

	if (!(this instanceof ThemeManager)) {
		return new ThemeManager(settingsInstance);
	}

	var self = this;

	this.activeTheme = {};
	this.settings = settingsInstance;
	this.name = this.settings.get('activeTheme');
	this.rootPath = path.join('/', 'src', 'content', 'themes');

	this.loadTheme();
}

ThemeManager.prototype.loadTheme = function () {
	this.themePath = path.join(this.rootPath, this.name);
	this.themeDirPaths = path.join(process.cwd(), this.themePath);
	this.config = this.themeDirPaths + '/package.json';

	if (fs.existsSync(this.themeDirPaths) && fs.existsSync(this.config)) {
		this.config = require(this.config);
		this.settings.set('theme_path', path.join(this.themePath), false);
	} else {
		console.log('unable to initialize the theme ' + this.name);
		process.exit();
	}
};

ThemeManager.prototype.getTemplates = function (callback) {
	// we read the package.json

	var templates = [];
	var self = this;

	_.each(this.config.templates, function (file, key) {
		templates.push({
			key: key + '-tpl',
			path: path.join(self.themePath, file)
		});
	});

	callback(templates);
};

ThemeManager.prototype.getAllCss = function (callback) {
	// we read the package.json

	var css = [];
	var self = this;

	_.each(this.config.css, function (file, key) {
		css.push({
			key: key,
			path: path.join(self.themePath, file)
		});
	});

	return css;
};

ThemeManager.prototype.getAllThemes = function (callback) {
	// we simply list the dir for now
	// maybe we can read the package.json and make it more nice
	return fs.readdirSync(path.join(process.cwd(), this.rootPath));
};

ThemeManager.prototype.getActiveCss = function (callback) {
	var self = this;

	if (self.settings.get('activeCss')) {
		var cssKey = self.settings.get('activeCss');
		// we check if this css is still valid... for this theme
		if (self.config.css[cssKey]) {
			callback({
				key: cssKey,
				path: path.join(self.themePath, self.config.css[cssKey])
			});
			return;
		}
	}

	// send the first css found in package.json
	var newCss = {
		key: Object.keys(self.config.css)[0],
		path: path.join(self.themePath, self.config.css[Object.keys(self.config.css)[0]])
	};

	self.settings.set('activeCss', newCss.key);
	callback(newCss);
	return;
};

module.exports = function (settingsInstance) {
	return new ThemeManager(settingsInstance);
};
