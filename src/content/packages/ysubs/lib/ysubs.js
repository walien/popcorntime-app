'use strict';

/*
* We import our depedencies
*/
var App = require('pdk'),
    _ = require('underscore'),
    Q = require('q'),
    helpers = require('./helper-querysubtitle');

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
        cache: true
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
    fetch: function (ids) {
        var self = this;
        return this.cache(ids, function(ids) {
            if (_.isEmpty(ids)) {
                return Q([]);
            }
            return helpers.querySubtitles(ids).then(self.formatForPopcorn);
        });

    },

    formatForPopcorn: function(data) {

        var self = this;

        var allSubs = {};
        // Iterate each movie
        _.each(data.subs, function(langs, imdbId) {
            var movieSubs = {};
            // Iterate each language
            _.each(langs, function(subs, lang) {
                // Pick highest rated
                var langCode = languageMapping[lang];
                movieSubs[langCode] = prefix + _.max(subs, function(s) {
                    return s.rating;
                }).url;
            });

            // Remove unsupported subtitles
            var filteredSubtitle = movieSubs;

            allSubs[imdbId] = filteredSubtitle;
        });

        return allSubs;
    },

    cache: function(ids, func) {
        var self = this, key;
        return this._fetch(ids).then(function(items) {
            var nonCachedIds = _.difference(ids, _.pluck(items, '_id'));
            return MergePromises([
                Q(items),
                func(nonCachedIds).then(self._store.bind(self))
            ]);
        });
    },

});

function MergePromises(promises) {
    return Q.all(promises).then(function(results) {
        return _.unique(_.flatten(results));
    });
}
