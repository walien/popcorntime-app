'use strict';

/*
* We import our depedencies
*/
var App = require('pdk'),
    _ = require('underscore'),
    helpers = require('./helper-querytorrent');

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
        return helpers.queryTorrents(filters);
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