/*
* We import our depedencies
*/
var App = require('popcorntime-app'),
    _ = require('underscore'),
    querystring = require('querystring'),
    request = require('request'),
    Q = require('q'),
    YTSProvider;

/*
* We create our new function
*/
YTSProvider = App.extend({

    /*
    * Used function by the popcorntime-app
    */
    
    activate: function () {
        
        // register our package as the movie provider
        App.trigger('provider:activate', {
            type: 'movie', // tvshow/movie
            handleProvider: YTSProvider.handleProvider // function used to handle the provider
        });

        // register a global hook used by keymap
        App.command(
          'yts:about', YTSProvider.about);
        
    },  

    /*
    * We handle our request including the 
    * filters from the app
    */
    handleProvider: function (filters) {
        return queryTorrents(filters)
            .then(formatForPopcorn);
    },

    /*
    * We get our content compatible with PT
    */
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

        var url = 'https://yts.re/api/list.json?' + querystring.stringify(params).replace(/%E2%80%99/g, '%27');

        win.info('Request to YTS API');
        win.debug(url);
        request({
            url: url,
            json: true
        }, function (error, response, data) {
            if (error) {
                deferred.reject(error);
            } else if (!data || (data.error && data.error !== 'No movies found')) {
                var err = data ? data.error : 'No data returned';
                win.error('YTS error:', err);
                deferred.reject(err);
            } else {
                deferred.resolve(data.MovieList || []);
            }
        });

        return deferred.promise;
    },

    formatForPopcorn: function (items) {
        var movies = {};
        var movieFetch = {};
        movieFetch.movies = [];
        movieFetch.hasMore = (items.length === 50 ? true : false);
        _.each(items, function (movie) {
            if (movie.Quality === '3D') {
                return;
            }
            var largeCover = movie.CoverImage.replace(/_med\./, '_large.');
            var imdb = movie.ImdbCode.replace('tt', '');

            // Calc torrent health
            var seeds = movie.TorrentSeeds;
            var peers = movie.TorrentPeers;

            var torrents = {};
            torrents[movie.Quality] = {
                url: movie.TorrentUrl,
                size: movie.SizeByte,
                seed: seeds,
                peer: peers
            };

            var ptItem = movies[imdb];
            if (!ptItem) {
                ptItem = {
                    imdb: imdb,
                    title: movie.MovieTitleClean.replace(/\([^)]*\)|1080p|DIRECTORS CUT|EXTENDED|UNRATED|3D|[()]/g, ''),
                    year: movie.MovieYear,
                    rating: movie.MovieRating,
                    image: largeCover,
                    torrents: torrents
                };

                movieFetch.movies.push(ptItem);
            } else {
                _.extend(ptItem.torrents, torrents);
            }

            movies[imdb] = ptItem;
        });
        return movieFetch;
    },

    /*
    * Test for keymap
    */
    about: function () {
        alert('Test!');
    }

});


module.exports = YTSProvider;