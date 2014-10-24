var helpers = {},
    querystring = require('querystring'),
    request = require('request'),
    Q = require('q')
    _ = require('underscore'),
    EZTVAPIURL = 'http://eztvapi.re/';

/*
* Function used to query all torents using PT filters 
*/
helpers.queryTorrents = function(filters) {

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
        params.order = filters.order;
    }

    if (filters.sorter && filters.sorter !== 'popularity') {
        params.sort = filters.sorter;
    }

    var url = EZTVAPIURL + 'shows/' + filters.page + '?' + querystring.stringify(params).replace(/%25%20/g, '%20');
    console.log('Request to EZTV API');
    console.log(url);
    request({
        url: url,
        json: true
    }, function(error, response, data) {
        if (error || response.statusCode >= 400) {
            deferred.reject(error);
        } else if (!data || (data.error && data.error !== 'No movies found')) {
            var err = data ? data.error : 'No data returned';
            win.error('API error:', err);
            deferred.reject(err);
        } else {
            data.forEach(function(entry) {
                entry.type = 'show';
            });
            deferred.resolve({
                results: data,
                hasMore: true
            });
        }
    });

    return deferred.promise;
};

// Single element query
helpers.queryTorrent = function(torrent_id, old_data) {
    return Q.Promise(function(resolve, reject) {
        var url = EZTVAPIURL + 'show/' + torrent_id;

        console.log('Request to EZTV API');
        console.log(url);
        request({
            url: url,
            json: true
        }, function(error, response, data) {
            if (error || response.statusCode >= 400) {
                reject(error);
            } else if (!data || (data.error && data.error !== 'No data returned')) {

                var err = data ? data.error : 'No data returned';
                win.error('API error:', err);
                resolve(false);

            } else {
                // we cache our new element
                resolve(data);
            }
        });
    });
};

module.exports = helpers;