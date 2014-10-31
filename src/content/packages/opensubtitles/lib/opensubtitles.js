'use strict';

/*
* We import our depedencies
*/
var App = require('pdk'),
    _ = require('underscore'),
    Q = require('q'),
    Subtitles = require('popcorn-opensubtitles');

/*
* We build and export our new package
*/
module.exports = App.Providers.Subtitle.extend({

    /*
    * Package config
    * as we extend from Providers, we need
    * to set detail for the source.
    */
    config: {
        cache: false
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
    fetch: function (queryParams) {
        return this.querySubtitles(queryParams)
            .then(this.formatForPopcorn);
    },

    formatForPopcorn: function(data) {

        for (var lang in data) {
            data[lang] = data[lang].url;
        }
        return data;
    },

    querySubtitles: function (queryParams) {
        return Subtitles.searchEpisode(queryParams);
    }

});
