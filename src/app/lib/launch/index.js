var
    Launcher,
    Q = require('q'),
    Events,
    gui,
    i18n = require('i18n'),
    _ = require('lodash');

function Launcher(App) {
    Events = require('../events')(App);
    this.app = App;
}

Launcher.prototype.init = function() {
    var that = this;
    this.app.vent.trigger('initHttpApi');
    return this.compareVersion()
        .then(function() {
            return that.loadUserInfo();
        })
        .then(function() {
            // maybe we should set user language? :D
            i18n.setLocale(that.app.Settings.get('language'));
        })
        .then(function() {
            // load packages (final phase)
            return that.loadPackages();
        });
};

Launcher.prototype.compareVersion = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {
        var currentVersion = that.app.gui.App.manifest.version;

        /*
        if (currentVersion !== that.app.Settings.get('version')) {
            // we should clear indexDb ?
            that.app.CacheV2.deleteDatabase()
                .then(function() {
                    that.app.Settings.set('version', currentVersion);

                // TODO: Ask user to restart OR reinit the cache ?
                });

        }
        */

        that.app.Settings.set('version', currentVersion);
        that.app.Settings.set('releaseName', that.app.gui.App.manifest.releaseName);

        return resolve();
    });
};

Launcher.prototype.loadUserInfo = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {

        that.loadBookmarks()
            .then(function (bookmarks) {
                that.app.userBookmarks = bookmarks;
                return that.loadWatchedMovies();
            })
            .then(function (watchedMovies) {
                that.app.watchedMovies = watchedMovies;
                return that.loadWatchedEpisodes();
            })
            .then(function (watchedShows) {
                that.app.watchedShows = watchedShows;

                // we have everything what we need
                // we return it as a promise
                return resolve();
            });

    });
};

Launcher.prototype.loadBookmarks = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {
        return that.app.Database.find('bookmarks', {})
            .then(function (data) {
                var bookmarks = [];
                if (data) {
                    bookmarks = _.pluck(data, 'imdb_id');
                }
                return resolve(bookmarks);
            });
    });
};


Launcher.prototype.loadWatchedMovies = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {
        return that.app.Database.find('watched', {type: 'movie'})
            .then(function (data) {
                var watchedMovies = [];
                if (data) {
                    watchedMovies = _.pluck(data, 'movie_id');
                }
                return resolve(watchedMovies);
            });
    });
};

Launcher.prototype.loadWatchedEpisodes = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {
        return that.app.Database.find('watched', {type: 'episode'})
            .then(function (data) {
                var watchedEpisodes = [];
                if (data) {
                    watchedEpisodes = _.pluck(data, 'imdb_id');
                }
                return resolve(watchedEpisodes);
            });
    });
};

Launcher.prototype.loadPackages = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {
        that.app.PackagesManager.loadPackages(function(error, result) {
            if (error) {
                return reject(error);
            } else {
                return resolve();
            }
        });
    });
};

module.exports = function(App) {
    return new Launcher(App);
};
