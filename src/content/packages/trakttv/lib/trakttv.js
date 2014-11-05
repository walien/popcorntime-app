'use strict';

/*
 * We import our depedencies
 */
var App = require('pdk'),
    _ = require('underscore'),
    request = require('request'),
    URI = require('URIjs'),
    Q = require('q'),
    sha1 = require('sha1'),
    formatForPopcorn = require('./helper-format');

var API_ENDPOINT = URI('https://api.trakt.tv/'),
    API_KEY = '515a27ba95fbd83f20690e5c22bceaff0dfbde7c',
    API_PLUGIN_VERSION = '0.0.2',
    PT_VERSION = '3.0.0';

/*
 * We build and export our new package
 */
module.exports = App.Providers.Metadata.extend({

    /*
     * Package Authentification
     */
    authentification: {},

    /*
     * Not used
     */
    hooks: {},

    /*
     * Default Function used by PT
     */
    onActivate: function() {},

    cache: function(key, ids, func) {
        var self = this;
        return this.fetch(ids).then(function(items) {
            var nonCachedIds = _.difference(ids, _.pluck(items, key));
            return MergePromises([
                Q(items),
                func(nonCachedIds).then(self.store.bind(self, key))
            ]);
        });
    },

    call: function(endpoint, getVariables) {
        var defer = Q.defer();

        getVariables = getVariables || {};

        if (Array.isArray(endpoint)) {
            endpoint = endpoint.map(function(val) {
                if (val === '{KEY}') {
                    return API_KEY;
                }
                return val.toString();
            });
        } else {
            endpoint = endpoint.replace('{KEY}', API_KEY);
        }

        var requestUri = API_ENDPOINT.clone()
            .segment(endpoint)
            .addQuery(getVariables);

        request(requestUri.toString(), {
            json: true
        }, function(err, res, body) {
            if (err || !body || res.statusCode >= 400) {
                defer.reject(err);
            } else {
                defer.resolve(body);
            }
        });

        return defer.promise;
    },

    movie: {
        summary: function(id) {
            return this.call(['movie/summary.json', '{KEY}', id]);
        },
        listSummary: function(ids) {
            if (_.isEmpty(ids)) {
                return Q([]);
            }

            var self = this;
            return this.cache('imdb_id', ids, function(ids) {
                if (_.isEmpty(ids)) {
                    return Q([]);
                }
                return self.call(['movie/summaries.json', '{KEY}', ids.join(','), 'full'])
                  .then(function(data) {
                    return formatForPopcorn(data);
                  });
            });
        }
    },

    show: {
        summary: function(id) {
            return this.call(['show/summary.json', '{KEY}', id]);
        },
        listSummary: function(ids) {
            if (_.isEmpty(ids)) {
                return Q([]);
            }

            var self = this;
            return this.cache(ids, function(ids) {
                if (_.isEmpty(ids)) {
                    return Q([]);
                }
                return self.call(['show/summaries.json', '{KEY}', ids.join(','), 'full']);
            });
        }
    },

    // to be removed
    resizeImage: function(imageUrl, width) {
        var uri = URI(imageUrl),
            ext = uri.suffix(),
            file = uri.filename().split('.' + ext)[0];

        // Don't resize images that don't come from trakt
        //  eg. YTS Movie Covers
        if (uri.domain() !== 'trakt.us') {
            return imageUrl;
        }

        var existingIndex = 0;
        if ((existingIndex = file.search('-\\d\\d\\d$')) !== -1) {
            file = file.slice(0, existingIndex);
        }

        if (file === 'poster-dark') {
            return 'images/posterholder.png'.toString();
        } else {
            return uri.filename(file + '-' + width + '.' + ext).toString();
        }
    },

});

function MergePromises(promises) {
    return Q.all(promises).then(function(results) {
        return _.unique(_.flatten(results));
    });
}
