'use strict';

/*
* We import our depedencies
*/
var App = require('popcorn-app'),
    _ = require('underscore'),
    helpers = require('./helpers');

/*
* We build and export our new package
*/
module.exports = App.Providers.extend({

    config: {
        type: 'movie'
    },

    hooks: {},

    /*
    * Default Function used by PT
    */
    fetch: function (filters) {         
        return helpers.queryTorrents(filters)
            .then(helpers.formatForPopcorn);
    },

    /*
    * Default Function used by PT
    */
    detail: function (torrent_id, old_data) {
        return helpers.queryTorrent(torrent_id, old_data);
    },    

    /*
    * Default Function used by PT
    */
    extractIds: function (items) {
        return _.pluck(items.results, 'imdb_id');
    }

});