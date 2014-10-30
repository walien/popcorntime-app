var helpers = {},
    _ = require('underscore');
/*
* Format the items to be redeable by PT
*/
helpers.formatForPopcorn = function(items) {
    var results = {};
    var movieFetch = {};
    movieFetch.results = [];
    movieFetch.hasMore = (Number(items.length) > 1 ? true : false);
    _.each(items, function(movie) {
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
};

module.exports = helpers;