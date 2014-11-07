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
	this.name = this.settings.get('enabledTheme');

	this.themePath = path.join('/', 'src', 'content', 'themes', this.name);
	this.themeDirPaths = path.join(process.cwd(), this.themePath);
	this.config = this.themeDirPaths + '/package.json';

	if (fs.existsSync(this.themeDirPaths) && fs.existsSync(this.config)) {
		this.config = require(this.config);
		this.settings.set('theme_path', path.join(this.themePath), false);
	} else {
		console.log('unable to initialize the theme ' + this.name);
		process.exit();
	}

}

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

module.exports = function (settingsInstance) {
	return new ThemeManager(settingsInstance);
};
