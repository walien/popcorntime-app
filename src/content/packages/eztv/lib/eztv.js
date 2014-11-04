'use strict';

/*
* We import our depedencies
*/
var App = require('pdk'),
    _ = require('lodash'),
    querystring = require('querystring'),
    apiUrl = 'http://eztvapi.re/shows/';

/*
* We build and export our new package
*/
module.exports = App.Providers.Source.extend({

    /*
    * Package config
    * as we extend from Providers, we need
    * to set detail for the source.
    */
    config: {
        type: 'movies'
    },

    /*
    * Package Settings
    */
    settings: {},

    /*
    * Not used
    */
    hooks: {},

    /*
    * Default Function used by PT
    */
    fetch: function (filters) {
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

        var url = apiUrl + filters.page + '?' + querystring.stringify(params).replace(/%25%20/g, '%20');
        return this.call(url)
            .then(function(data) {

                data.forEach(function(entry) {
                    entry.type = 'show';
                });

                return {results: data, hasMore: true};
            });
    },

    /*
    * Default Function used by PT
    */
    detail: function (torrent_id, old_data) {

        return this.call(apiUrl + 'show/' + torrent_id)
            .then(function(data) {
                return data;
            });
    },

    /*
    * Default Function used by PT
    */
    extractIds: function (items) {
        return _.pluck(items.results, 'imdb_id');
    }

});
