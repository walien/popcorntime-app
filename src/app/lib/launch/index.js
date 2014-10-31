var
    Launcher,
    Q = require('q'),
    Events,
    gui,
    tls = require('tls'),
    URI = require('URIjs'),
    _ = require('lodash'),
    request = require('request');

function Launcher(App) {
    Events = require('../events')(App);
    this.app = App;
}

Launcher.prototype.init = function() {
    var that = this;
    this.app.vent.trigger('initHttpApi');
    return this.checkEndpoint()
        .then(function() {
            return that.compareVersion();
        })
        .then(function() {
            return that.loadUserInfo();
        })
        .then(function() {

            // set user language
            // TODO: reworks on language.js as a module...
            //detectLanguage(that.app.Settings.get('language'));

            // load packages (final phase)
            return that.loadPackages();
        });
};

Launcher.prototype.checkEndpoint = function() {

    var that = this;

    var allApis = [{
        original: 'yifyApiEndpoint',
        mirror: 'yifyApiEndpointMirror',
        fingerprint: 'D4:7B:8A:2A:7B:E1:AA:40:C5:7E:53:DB:1B:0F:4F:6A:0B:AA:2C:6C'
    }];

    var promises = allApis.map(function(apiCheck) {
        return Q.Promise(function(resolve, reject) {
            var hostname = URI(that.app.Settings.get(apiCheck.original)).hostname();

            tls.connect(443, hostname, {
                servername: hostname,
                rejectUnauthorized: false
            }, function() {
                if (!this.authorized || this.authorizationError || this.getPeerCertificate().fingerprint !== apiCheck.fingerprint) {
                    // "These are not the certificates you're looking for..."
                    // Seems like they even got a certificate signed for us :O
                    that.app.Settings.set(apiCheck.original, that.app.Settings.get(apiCheck.mirror), false);
                }
                this.end();
                resolve();
            }).on('error', function() {
                // No SSL support. That's convincing >.<
                that.app.Settings.set(apiCheck.original, that.app.Settings.get(apiCheck.mirror), false);
                this.end();
                resolve();
            }).on('timeout', function() {
                // Connection timed out, we'll say its not available
                that.app.Settings.set(apiCheck.original, that.app.Settings.get(apiCheck.mirror), false);
                this.end();
                resolve();
            }).setTimeout(10000); // Set 10 second timeout
        });
    });

    return Q.all(promises);
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