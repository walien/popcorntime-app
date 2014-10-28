var _ = require('lodash'),
    Datastore = require('nedb'),
    path = require('path'),
    Q = require('q'),
    DatabaseManager,
    Settings = require('../settings');

process.env.TZ = 'America/New_York'; // set same api tz

var activeDatabase = [
    {name: 'settings', unique: ['key'], path: 'data/settings.db'},
    {name: 'bookmarks', unique: ['imdb_id'], path: 'data/bookmarks.db'},
    {name: 'tvshows', unique: ['imdb_id','tvdb_id'], path: 'data/shows.db'},
    {name: 'movies', unique: ['imdb_id'], path: 'data/movies.db'},
    {name: 'watched', unique: [], path: 'data/watched.db'}
];

function DatabaseManager(data_path) {
    
    var that = this;
    this.db = [];

    console.debug('Database path: ' + data_path);

    // Set our DB location
    Settings.set({databaseLocation: data_path + '/data'});

    // Create our new Datastore for each activeDatabase
    _.each(activeDatabase, function(database) {

        var _this = new Datastore({
            filename: path.join(data_path, database.path),
            autoload: true
        });

        promisifyDatastore(_this);

        _.each(database.unique, function(uniqueKey) {

            _this.ensureIndex({
                fieldName: uniqueKey,
                unique: true
            });

        });

        that.db[database.name] = _this;

    });

    this.importSettings();

}

DatabaseManager.prototype.initialize = function () {
    return;
};

// example db.add('movies', {imdb_id: 'tt736635', 'test': 'safaffs'})
DatabaseManager.prototype.add = function (database, data) {
    return this.db[database].insert(data);
};

// example db.get('movies', {imdb_id: 'tt736635'})
DatabaseManager.prototype.get = function (database, data) {
    return promisifyDb(this.db[database].findOne(data));
};

DatabaseManager.prototype.find = function (database, data) {
    data = data || {};
    return promisifyDb(this.db[database].find(data));
};

// example db.remove('movies', {imdb_id: 'tt736635'})
DatabaseManager.prototype.delete = function (database, data) {
    return this.db[database].remove(data);
};

// import settings from DB and overwrite value
DatabaseManager.prototype.importSettings = function () {
    // we overwrite all our saved settings
    this.find('settings').then(function (settings) {
        if (settings !== null) {
            _.each(settings, function(setting) {
                var value = {};
                value[setting.key] = setting.value;
                Settings.set(value);
            });
        }
    });
};

// some helper
function promisifyDatastore (datastore) {
    datastore.insert = Q.denodeify(datastore.insert, datastore);
    datastore.update = Q.denodeify(datastore.update, datastore);
    datastore.remove = Q.denodeify(datastore.remove, datastore);
};

function promisifyDb (obj) {
    return Q.Promise(function (resolve, reject) {
        obj.exec(function (error, result) {
            if (error) {
                return reject(error);
            } else {
                return resolve(result);
            }
        });
    });
};

module.exports = function(path) {
    return new DatabaseManager(path);
};