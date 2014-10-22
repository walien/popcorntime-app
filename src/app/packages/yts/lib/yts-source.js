/*
* We import our depedencies
*/
var App = require('popcorn-app'),
    _ = require('underscore'),
    querystring = require('querystring'),
    request = require('request'),
    Q = require('q');

/*
* We create our new function
*/
module.exports = App.Providers.extend({

    config: {
        type: 'movie'
    },

    hooks: {},

    fetch: function (filters) {         

        return this.queryTorrents(filters)
            .then(this.formatForPopcorn);

    },

    detail: function (torrent_id, old_data) {
        return this.queryTorrent(torrent_id, old_data);
    },

    queryTorrents: function (filters) {

        var deferred = Q.defer();

        var params = {};
        params.sort = 'seeds';
        params.limit = '50';

        if (filters.keywords) {
            params.keywords = filters.keywords.replace(/\s/g, '% ');
        }

        if (filters.genre) {
            params.genre = filters.genre;
        }

        if (filters.order) {
            var order = 'desc';
            if (filters.order === 1) {
                order = 'asc';
            }
            params.order = order;
        }

        if (filters.sorter && filters.sorter !== 'popularity') {
            params.sort = filters.sorter;
        }

        if (filters.page) {
            params.set = filters.page;
        }

        //if (Settings.movies_quality !== 'all') {
        //    params.quality = Settings.movies_quality;
        //}

        var url = 'http://yts.re/api/list.json?' + querystring.stringify(params).replace(/%E2%80%99/g, '%27');

        console.log('Request to YTS API');

        request({
            url: url,
            json: true
        }, function (error, response, data) {
            if (error || response.statusCode >= 400) {
                deferred.reject(error);
            } else if (!data || (data.error && data.error !== 'No movies found')) {
                var err = data ? data.error : 'No data returned';
                console.log('YTS error:', err);
                deferred.reject(err);
            } else {
                deferred.resolve(data.MovieList || []);
            }
        });

        return deferred.promise;
    },


    queryTorrent: function (torrent_id, old_data) {
        var self = this;
        return Q.Promise(function (resolve, reject) {
            var params = {
                imdb_id: torrent_id
            };
            var url = 'http://yts.re/api/listimdb.json?' + querystring.stringify(params).replace(/%E2%80%99/g, '%27');

            request({
                url: url,
                json: true
            }, function (error, response, data) {
                if (error || response.statusCode >= 400) {
                    reject(error);
                } else if (!data || (data.error && data.error !== 'No movies found')) {
                    var err = data ? data.error : 'No data returned';
                    console.log('YTS error:', err);
                    reject(err);
                } else {
                    var ptt = self.formatForPopcorn(data.MovieList || []);
                    var torrents = ptt.results.pop().torrents || {};
                    old_data.torrents = _.extend(old_data.torrents, torrents);
                    resolve(old_data);
                }
            });
        });
    },


    formatForPopcorn: function (items) {
        var results = {};
        var movieFetch = {};
        movieFetch.results = [];
        movieFetch.hasMore = (Number(items.length) > 1 ? true : false);
        _.each(items, function (movie) {
            if (movie.Quality === '3D') {
                return;
            }
            var largeCover = movie.CoverImage.replace(/_med\./, '_large.');
            var imdb = movie.ImdbCode;

            // Calc torrent health
            var seeds = movie.TorrentSeeds;
            var peers = movie.TorrentPeers;

            var torrents = {};
            torrents[movie.Quality] = {
                url: movie.TorrentUrl,
                size: movie.SizeByte,
                filesize: movie.Size,
                seed: seeds,
                peer: peers
            };

            var ptItem = results[imdb];
            if (!ptItem) {
                ptItem = {
                    imdb_id: imdb,
                    title: movie.MovieTitleClean.replace(/\([^)]*\)|1080p|DIRECTORS CUT|EXTENDED|UNRATED|3D|[()]/g, ''),
                    year: movie.MovieYear,
                    genre: movie.Genre,
                    rating: movie.MovieRating,
                    image: largeCover,
                    torrents: torrents,
                    type: 'movie'
                };

                movieFetch.results.push(ptItem);
            } else {
                _.extend(ptItem.torrents, torrents);
            }

            results[imdb] = ptItem;
        });

        return movieFetch;
    },

    extractIds: function (items) {
        return _.pluck(items.results, 'imdb_id');
    }

});