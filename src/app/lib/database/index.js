var _ = require('lodash'),
    Datastore = require('nedb'),
    path = require('path'),
    Q = require('q'),
    fs = require('fs'),
    DatabaseManager;

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
    this.data_path = data_path;

    console.debug('Database path: ' + data_path);

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

// example db.update('movies', {imdb_id: 'tt736635'}, {test: '1111'})
// or
// example db.update('settings', {key: 'myKey'}, {value: 'ssss'})
// 
// the key represent the unique ID 
DatabaseManager.prototype.update = function (database, key, data) {
    var that = this;
    return this.get('settings', key)
        .then(function (result) {
            if (result) {
                return that.db[database].update(key, {
                    $set: data
                }, {});
            } else {
                return that.db[database].insert(_.merge(key, data));
            }
        });
};

// example db.remove('movies', {imdb_id: 'tt736635'})
DatabaseManager.prototype.delete = function (database, data) {
    return this.db[database].remove(data);
};

// TODO MAYBE ADD A WAY TO CLEAR INDEXDB?
DatabaseManager.prototype.deleteDatabase = function () {

    return Q.Promise(function (resolve, reject) {

        _.each(activeDatabase, function(database) {
            fs.unlinkSync(path.join(that.data_path, database.path));
        });

        var req = indexedDB.deleteDatabase(App.Config.cache.name);
        req.onsuccess = function () {
            resolve();
        };
        req.onerror = function () {
            resolve();
        };
        req.onblocked = function () {
            resolve();
        };

        return resolve();
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