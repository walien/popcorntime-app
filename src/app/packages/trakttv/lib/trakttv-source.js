'use strict';

/*
 * We import our depedencies
 */
var App = require('pdk'),
    _ = require('underscore'),
    helpers = require('./helpers'),
    request = require('request'),
    URI = require('URIjs'),
    Q = require('q'),
    sha1 = require('sha1');

var API_ENDPOINT = URI('https://api.trakt.tv/'),
    API_KEY = '515a27ba95fbd83f20690e5c22bceaff0dfbde7c',
    API_PLUGIN_VERSION = '0.0.2',
    PT_VERSION = '3.0.0';

/*
 * We build and export our new package
 */
module.exports = App.Providers.Metadata.extend({

    /*
     * Package config
     * as we extend from Providers, we need
     * to set detail for the source.
     */
    config: {
        auth: {
            enabled: true,
            handler: 'auth'
        }
    },

    /*
     * Package Settings
     */
    settings: {

        apiKey: {
            type: [], // not used right now
            "default": '515a27ba95fbd83f20690e5c22bceaff0dfbde7c'
        },

        username: {
            type: [], // not used right now
            "default": ''
        },

        password: {
            type: [], // not used right now
            "default": ''
        }
    },

    /*
     * Not used
     */
    hooks: {},

    /*
     * Default Function used by PT
     */
    activate: function() {

        var self = this;

        this.authenticated = false;
        this._credentials = {
            username: '',
            password: ''
        };

        this.watchlist = this.app.api.providers.get('Watchlist');

        // Login with stored credentials
        if (this.app.api.settings.get('traktUsername') !== '' && this.app.api.settings.get('traktPassword') !== '') {
            this._authenticationPromise = this.authenticate(this.app.api.settings.get('traktUsername'), this.app.api.settings.get('traktPassword'), true);
        }

        var self = this;
        // Bind all "sub" method calls to TraktTv
        _.each(this.movie, function(method, key) {
            self.movie[key] = method.bind(self);
        });

        _.each(this.show, function(method, key) {
            self.show[key] = method.bind(self);
        });

        this.app.api.vent.on('show:watched', function(show, channel) {
            console.log('Mark TV Show as watched, on channel:', channel);
            switch (channel) {
                case 'scrobble':
                    this.app.Trakt.show
                        .scrobble(show.tvdb_id, show.season, show.episode, 100);
                    break;
                case 'seen':
                    /* falls through */
                default:
                    this.app.Trakt.show
                        .episodeSeen(show.tvdb_id, show);
                    break;
            }
        });


        this.app.api.vent.on('show:unwatched', function(show, channel) {
            console.log('Mark TV Show as unwatched, on channel:', channel);
            switch (channel) {
                case 'scrobble':
                    this.app.Trakt.show
                        .scrobble(show.tvdb_id, show.season, show.episode, 0);
                    break;
                case 'seen':
                    /* falls through */
                default:
                    this.app.Trakt.show
                        .episodeUnseen(show.tvdb_id, show);
                    break;
            }
        });

        this.app.api.vent.on('movie:watched', function(movie, channel) {
            console.log('Mark Movie as watched, on channel:', channel);
            switch (channel) {
                case 'scrobble':
                    self.app.Trakt.movie
                        .scrobble(movie.imdb_id, 100);
                    break;
                case 'seen':
                    /* falls through */
                default:
                    self.app.Trakt.movie
                        .seen(movie.imdb_id);
                    break;
            }
        });

    },

    authenticate: function(username, password, preHashed) {
        preHashed = preHashed || false;

        var self = this;
        return this._authenticationPromise = this.post('account/test/{KEY}', {
            username: username,
            password: preHashed ? password : sha1(password)
        }).then(function(data) {
            if (data.status === 'success') {
                self._credentials = {
                    username: username,
                    password: preHashed ? password : sha1(password)
                };
                self.authenticated = true;
                // Store the credentials (hashed ofc)
                AdvSettings.set('traktUsername', self._credentials.username);
                AdvSettings.set('traktPassword', self._credentials.password);
                return true;
            } else {
                return false;
            }
        });
    },

    post: function(endpoint, postVariables) {
        var defer = Q.defer();

        postVariables = postVariables || {};

        if (Array.isArray(endpoint)) {
            endpoint = endpoint.map(function(val) {
                if (val === '{KEY}') {
                    return API_KEY;
                }
                return val.toString();
            });
        } else {
            endpoint = endpoint.replace('{KEY}', API_KEY);
        }

        var requestUri = API_ENDPOINT.clone()
            .segment(endpoint);

        if (postVariables.username === undefined) {
            if (this.authenticated && this._credentials.username !== '') {
                postVariables.username = this._credentials.username;
            }
        }
        if (postVariables.password === undefined) {
            if (this.authenticated && this._credentials.password !== '') {
                postVariables.password = this._credentials.password;
            }
        }

        request(requestUri.toString(), {
            method: 'post',
            body: postVariables,
            json: true
        }, function(err, res, body) {
            if (err || !body || res.statusCode >= 400) {
                defer.reject(err);
            } else {
                defer.resolve(body);
            }
        });

        return defer.promise;
    },

    isAuthenticating: function() {
        return this._authenticationPromise && this._authenticationPromise.isPending();
    },

    cache: function(key, ids, func) {
        var self = this;
        return this.fetch(ids).then(function(items) {
            var nonCachedIds = _.difference(ids, _.pluck(items, key));
            return MergePromises([
                Q(items),
                func(nonCachedIds).then(self.store.bind(self, key))
            ]);
        });
    },

    call: function(endpoint, getVariables) {
        var defer = Q.defer();

        getVariables = getVariables || {};

        if (Array.isArray(endpoint)) {
            endpoint = endpoint.map(function(val) {
                if (val === '{KEY}') {
                    return API_KEY;
                }
                return val.toString();
            });
        } else {
            endpoint = endpoint.replace('{KEY}', API_KEY);
        }

        var requestUri = API_ENDPOINT.clone()
            .segment(endpoint)
            .addQuery(getVariables);

        request(requestUri.toString(), {
            json: true
        }, function(err, res, body) {
            if (err || !body || res.statusCode >= 400) {
                defer.reject(err);
            } else {
                defer.resolve(body);
            }
        });

        return defer.promise;
    },

    sync: function() {
        var that = this;

        return Q()
            .then(function() {
                that.watchlist.inhibit(true);
            })
            .then(Q.all([this.show.sync(), this.movie.sync()])
                .then(function() {
                    that.watchlist.inhibit(false);
                })
                .then(function() {
                    that.watchlist.fetchWatchlist();
                }));
    },

    movie: {
        summary: function(id) {
            return this.call(['movie/summary.json', '{KEY}', id]);
        },
        listSummary: function(ids) {
            if (_.isEmpty(ids)) {
                return Q([]);
            }

            var self = this;
            return this.cache('imdb_id', ids, function(ids) {
                if (_.isEmpty(ids)) {
                    return Q([]);
                }
                return self.call(['movie/summaries.json', '{KEY}', ids.join(','), 'full']);
            });
        },
        scrobble: function(imdb, progress, duration) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            return this.post('movie/scrobble/{KEY}', {
                imdb_id: imdb,
                progress: progress,
                duration: duration,
                plugin_version: API_PLUGIN_VERSION,
                media_center_version: PT_VERSION
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        seen: function(movie) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            if (Array.isArray(movie)) {
                if (movie.length === 0) {
                    return Q.resolve(true);
                }

                movie = movie.map(function(val) {
                    return {
                        imdb_id: val
                    };
                });
            } else {
                movie = [{
                    imdb_id: movie
                }];
            }

            return this.post('movie/seen/{KEY}', {
                movies: movie
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        unseen: function(movie) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            if (Array.isArray(movie)) {
                if (movie.length === 0) {
                    return Q.resolve(true);
                }

                movie = movie.map(function(val) {
                    return {
                        imdb_id: val
                    };
                });
            } else {
                movie = [{
                    imdb_id: movie
                }];
            }

            return this.post('movie/unseen/{KEY}', {
                movies: movie
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        watching: function(imdb, progress, duration) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            return this.post('movie/watching/{KEY}', {
                imdb_id: imdb,
                progress: progress,
                duration: duration,
                plugin_version: API_PLUGIN_VERSION,
                media_center_version: PT_VERSION
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        cancelWatching: function() {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            return this.post('movie/cancelwatching/{KEY}')
                .then(function(data) {
                    if (data.status === 'success') {
                        return true;
                    } else {
                        return false;
                    }
                });
        },
        library: function(movie) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            if (Array.isArray(movie)) {
                if (movie.length === 0) {
                    return Q.resolve(true);
                }

                movie = movie.map(function(val) {
                    return {
                        imdb_id: val
                    };
                });
            } else {
                movie = [{
                    imdb_id: movie
                }];
            }

            return this.post('movie/library/{KEY}', {
                movies: movie
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        unLibrary: function(movie) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            if (Array.isArray(movie)) {
                if (movie.length === 0) {
                    return Q.resolve(true);
                }

                movie = movie.map(function(val) {
                    return {
                        imdb_id: val
                    };
                });
            } else {
                movie = [{
                    imdb_id: movie
                }];
            }

            return this.post('movie/unlibrary/{KEY}', {
                movies: movie
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        getWatched: function() {
            return this.call(['user/library/movies/watched.json', '{KEY}', this._credentials.username])
                .then(function(data) {
                    return data;
                });
        },

        sync: function() {
            return Q.all([this.movie.syncFrom(), this.movie.syncTo()]);
        },

        syncFrom: function() {
            return this.movie.getWatched()
                .then(function(data) {
                    var watched = [];

                    if (data) {
                        var movie;
                        for (var m in data) {
                            movie = data[m];
                            watched.push({
                                movie_id: movie.imdb_id.toString(),
                                date: new Date(),
                                type: 'movie'
                            });
                        }
                    }

                    return watched;
                })
                .then(function(traktWatched) {
                    return Database.markMoviesWatched(traktWatched);
                });
        },

        syncTo: function() {
            return Database.getMoviesWatched()
                .then(function(results) {
                    return results.map(function(item) {
                        return item.movie_id;
                    });
                })
                .then((function(movieIds) { // jshint ignore:line
                    return this.movie.seen(movieIds);
                }).bind(this));
        }
    },

    show: {
        summary: function(id) {
            return this.call(['show/summary.json', '{KEY}', id]);
        },
        listSummary: function(ids) {
            if (_.isEmpty(ids)) {
                return Q([]);
            }

            var self = this;
            return this.cache(ids, function(ids) {
                if (_.isEmpty(ids)) {
                    return Q([]);
                }
                return self.call(['show/summaries.json', '{KEY}', ids.join(','), 'full']);
            });
        },
        episodeSummary: function(id, season, episode) {
            return this.call(['show/episode/summary.json', '{KEY}', id, season, episode])
                .then(function(data) {
                    if (data.show && data.episode) {
                        return data;
                    } else {
                        return undefined;
                    }
                });
        },
        scrobble: function(tvdb, season, episode, progress, duration) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            return this.post('show/scrobble/{KEY}', {
                tvdb_id: tvdb,
                season: season,
                episode: episode,
                progress: progress,
                duration: duration,
                plugin_version: API_PLUGIN_VERSION,
                media_center_version: PT_VERSION
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        episodeSeen: function(id, episode) {
            var that = this;
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            var data = {};

            if (/^tt/.test(id)) {
                data.imdb_id = id;
            } else {
                data.tvdb_id = id;
            }

            if (!Array.isArray(episode)) {
                if (episode.length === 0) {
                    return Q.resolve(true);
                }

                episode = [{
                    season: episode.season,
                    episode: episode.episode
                }];
            }

            data.episodes = episode;

            return this.post('show/episode/seen/{KEY}', data)
                .then(function(data) {
                    if (data.status === 'success') {
                        that.watchlist.fetchWatchlist();
                        return true;
                    } else {
                        return false;
                    }
                });
        },
        episodeUnseen: function(id, episode) {
            var that = this;

            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            var data = {};

            if (/^tt/.test(id)) {
                data.imdb_id = id;
            } else {
                data.tvdb_id = id;
            }

            if (!Array.isArray(episode)) {
                if (episode.length === 0) {
                    return Q.resolve(true);
                }

                episode = [{
                    season: episode.season,
                    episode: episode.episode
                }];
            }

            data.episodes = episode;

            return this.post('show/episode/unseen/{KEY}', data)
                .then(function(data) {
                    if (data.status === 'success') {
                        that.watchlist.fetchWatchlist();
                        return true;
                    } else {
                        return false;
                    }
                });
        },
        watching: function(tvdb, season, episode, progress, duration) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            return this.post('show/watching/{KEY}', {
                tvdb_id: tvdb,
                season: season,
                episode: episode,
                progress: progress,
                duration: duration,
                plugin_version: API_PLUGIN_VERSION,
                media_center_version: PT_VERSION
            }).then(function(data) {
                if (data.status === 'success') {
                    return true;
                } else {
                    return false;
                }
            });
        },
        cancelWatching: function() {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            return this.post('show/cancelwatching/{KEY}')
                .then(function(data) {
                    if (data.status === 'success') {
                        return true;
                    } else {
                        return false;
                    }
                });
        },
        library: function(show) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            if (/^tt/.test(show)) {
                show = {
                    imdb_id: show
                };
            } else {
                show = {
                    tvdb_id: show
                };
            }

            return this.post('show/library/{KEY}', show)
                .then(function(data) {
                    if (data.status === 'success') {
                        return true;
                    } else {
                        return false;
                    }
                });
        },
        unLibrary: function(show) {
            if (!this.authenticated) {
                return Q.reject('Not Authenticated');
            }

            if (/^tt/.test(show)) {
                show = {
                    imdb_id: show
                };
            } else {
                show = {
                    tvdb_id: show
                };
            }

            return this.post('show/unlibrary/{KEY}', show)
                .then(function(data) {
                    if (data.status === 'success') {
                        return true;
                    } else {
                        return false;
                    }
                });
        },
        getWatched: function() {
            return this.call(['user/library/shows/watched.json', '{KEY}', this._credentials.username])
                .then(function(data) {
                    return data;
                });
        },

        getProgress: function() {
            if (!this.authenticated) {
                console.log('Not Authenticated');
                return Q.reject('Not Authenticated');
            }

            return this.app.Trakt.call(['user/progress/watched.json', '{KEY}', this._credentials.username])
                .then(function(data) {
                    return data;
                });
        },

        sync: function() {
            return Q.all([this.show.syncFrom(), this.show.syncTo()]);
        },

        syncFrom: function() {
            return this.show.getWatched()
                .then(function(data) {
                    // Format them for insertion
                    var watched = [];

                    if (data) {
                        var show;
                        var season;
                        for (var d in data) {
                            show = data[d];
                            for (var s in show.seasons) {
                                season = show.seasons[s];
                                for (var e in season.episodes) {
                                    watched.push({
                                        tvdb_id: show.tvdb_id.toString(),
                                        show_imdb_id: show.imdb_id.toString(),
                                        season: season.season.toString(),
                                        episode: season.episodes[e].toString(),
                                        type: 'episode',
                                        date: new Date()
                                    });
                                }
                            }
                        }
                    }

                    return watched;
                })
                .then(function(traktWatched) {
                    // Insert them locally
                    return Database.markEpisodesWatched(traktWatched);
                });
        },

        syncTo: function() {
            var self = this;

            return Database.getAllEpisodesWatched()
                .then(function(results) {
                    return results.reduce(function(prev, current) {
                        if (current.tvdb_id) {
                            if (!prev[current.tvdb_id]) {
                                prev[current.tvdb_id] = {
                                    tvdb_id: current.tvdb_id,
                                    episode: []
                                };
                            }

                            prev[current.tvdb_id].episode.push({
                                season: current.season,
                                episode: current.episode
                            });
                        }

                        return prev;
                    }, {});
                })
                .then(function(shows) {

                    var promises = Object.keys(shows).map(function(showId) {
                        var show = shows[showId];
                        return self.show.episodeSeen(show.tvdb_id, show.episode);
                    });

                    return Q.all(promises);
                });
        }
    },

    resizeImage: function(imageUrl, width) {
        var uri = URI(imageUrl),
            ext = uri.suffix(),
            file = uri.filename().split('.' + ext)[0];

        // Don't resize images that don't come from trakt
        //  eg. YTS Movie Covers
        if (uri.domain() !== 'trakt.us') {
            return imageUrl;
        }

        var existingIndex = 0;
        if ((existingIndex = file.search('-\\d\\d\\d$')) !== -1) {
            file = file.slice(0, existingIndex);
        }

        if (file === 'poster-dark') {
            return 'images/posterholder.png'.toString();
        } else {
            return uri.filename(file + '-' + width + '.' + ext).toString();
        }
    },


});

function MergePromises(promises) {
    return Q.all(promises).then(function(results) {
        return _.unique(_.flatten(results));
    });
}