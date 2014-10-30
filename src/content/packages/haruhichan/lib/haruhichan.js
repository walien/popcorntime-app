'use strict';

/*
* We import our depedencies
*/
var App = require('pdk'),
    _ = require('underscore'),
    helpers = require('./helper-querytorrent'),
    querystring = require('querystring'),
    URL = 'http://ptp.haruhichan.com/';
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
        params.sort = 'popularity';
        params.limit = '50';
        params.type = 'All';
        params.page = (filters.page ? filters.page - 1 : 0);

        if (filters.keywords) {
            params.search = filters.keywords.replace(/\s/g, '% ');
        }

        var genre = filters.genre;
        if (genre && (genre !== 'All')) {
            params.genre = genre;
        }

        switch (filters.order) {
            case 1:
                params.order = 'asc';
                break;
            case -1:
                /* falls through */
            default:
                params.order = 'desc';
                break;
        }

        if (filters.sorter && filters.sorter !== 'popularity') {
            params.sort = filters.sorter;
        }

        if (filters.type && filters.type !== 'All') {
            if (filters.type === 'Movies') {
                params.type = 'movie';
            } else {
                params.type = filters.type.toLowerCase();
            }
        }

        // XXX(xaiki): haruchichan currently doesn't support filters
        var url = URL + 'list.php?' + querystring.stringify(params).replace(/%25%20/g, '%20');

        return this.call(url)
            .then(function(data) {
                return helpers.formatForPopcorn(data);
            });
    },

    /*
    * Default Function used by PT
    */
    detail: function (torrent_id, old_data) {
        var id = torrent_id.split('-')[1];
        var url = URL + 'anime.php?id=' + id;
        return this.call(url)
            .then(function(data) {
                return helpers.formatDetailForPopcorn(data,old_data);
            });      
    },    

    /*
    * Default Function used by PT
    */
    extractIds: function (items) {
        return _.pluck(items.results, 'haru_id');
    }

});