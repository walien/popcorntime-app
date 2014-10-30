var helpers = {},
    _ = require('lodash'),
    statusMap = {
        0: 'Not Airing Yet',
        1: 'Currently Airing',
        2: 'Ended'
    };

helpers.formatForPopcorn = function(items) {
    var results = _.map(items, function(item) {
        var img = item.malimg;
        var type = (item.type === 'Movie') ? 'movie' : 'show';

        var ret = {
            images: {
                poster: img,
                fanart: img,
                banner: img
            },
            mal_id: item.MAL,
            haru_id: item.id,
            tvdb_id: 'mal-' + item.id,
            imdb_id: 'mal-' + item.id,
            slug: item.name.toLowerCase().replace(/\s/g, '-'),
            title: item.name,
            year: item.year,
            type: type,
            item_data: item.type
        };
        return ret;
    });

    return {
        results: results,
        hasMore: true
    };
};

helpers.formatDetailForPopcorn = function(item, prev) {
    var img = item.malimg;
    var type = prev.type;
    var genres = item.genres.split(', ');
    var ret = _.extend(prev, {
        country: 'Japan',
        genre: genres.join(' - '),
        genres: genres,
        num_seasons: 1,
        runtime: parseTime(item.duration),
        status: statusMap[item.status],
        synopsis: item.synopsis,
        network: item.producers, //FIXME
        rating: { // FIXME
            hated: 0,
            loved: 0,
            votes: 0,
            percentage: item.score
        },
        images: {
            poster: img,
            fanart: img,
            banner: img
        },
        year: item.aired.split(', ')[1].replace(/ to.*/, ''),
        type: type
    });

    if (type === 'movie') {
        ret = _.extend(ret, {
            rating: 0,
            subtitle: undefined,
            torrents: movieTorrents(item.id, item.episodes),
        });
    } else {
        ret = _.extend(ret, {
            episodes: showTorrents(item.id, item.episodes)
        });
    }

    return ret;
};

var movieTorrents = function(id, dl) {
    var torrents = {};
    _.each(dl, function(item) {
        var quality = item.quality.match(/[0-9]+p/)[0];
        torrents[quality] = {
            seeds: 0,
            peers: 0,
            url: item.magnet,
            health: 'good'
        };
    });

    return torrents;
};

var showTorrents = function(id, dl) {
    var torrents = {};
    _.each(dl, function(item) {
        var quality = item.quality.match(/[0-9]+p/)[0];
        var match = item.name.match(/[\s_]([0-9]+(-[0-9]+)?|CM|OVA)[\s_]/);
        if (!match) {
            console.error('could not match', item.name);
            return;
        }
        var episode = match[1];
        if (!torrents[episode]) {
            torrents[episode] = {};
        }
        torrents[episode][quality] = {
            seeds: 0,
            peers: 0,
            url: item.magnet,
            health: 'good'
        };
    });
    return _.map(torrents, function(torrents, s) {
        return {
            title: 'Episode ' + s,
            torrents: torrents,
            season: 1,
            episode: Number(s.split('-')[0]),
            overview: 'we still don\'t have single episodes overview for anime… sorry',
            tvdb_id: id + '-1-' + s
        };
    });
};

var parseTime = function(duration) {
    var time = duration.match(/(?:([0-9]+) h)?.*?(?:([0-9]+) min)/);
    if (!time) {
        return console.error('couldn\'t parse time:', time);
    }
    return (time[1] ? time[1] : 0) * 60 + Number(time[2]);
};

module.exports = helpers;