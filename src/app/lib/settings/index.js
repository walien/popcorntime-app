var
    SettingsManager,
    defaultSettings = require('./default'),
    _ = require('lodash');

function SettingsManager(settings) {
    this._settings = {};
    if (settings && _.isObject(settings)) {
        this.set(settings);
    }
}

SettingsManager.prototype.set = function (settings) {
    _.merge(this._settings, settings);
};

SettingsManager.prototype.get = function (variable) {
        if (typeof this._settings[variable] !== 'undefined') {
            return this._settings[variable];
        }
        return false;
};

module.exports = new SettingsManager(defaultSettings);