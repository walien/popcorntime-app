var
    SettingsManager,
    defaultSettings = require('./default'),
    _ = require('lodash'),
    Database = require('../database');

function SettingsManager(dbInstance, settings) {
    var that = this;
    this._settings = {};
    this._db = dbInstance;

    if (settings && _.isObject(settings)) {
        _.merge(this._settings, settings);
    }

    // populate with DB
    this._db.find('settings')
        .then(function (settings) {
            if (settings !== null) {
                _.each(settings, function(setting) {
                    that.set(setting.key, setting.value, false);
                });
            }
        });

    this.set('databaseLocation', this._db.data_path + '/data', false);
}

SettingsManager.prototype.set = function (key, value, updateDatabase) {
    
    this._settings[key] = value;

    if(updateDatabase !== false) {
        this._db.update('settings', {key: key}, {value: value});
    }
};

SettingsManager.prototype.get = function (variable) {
        if (typeof this._settings[variable] !== 'undefined') {
            return this._settings[variable];
        }
        return false;
};

module.exports = function(dbInstance) {
    return new SettingsManager(dbInstance, defaultSettings);
};