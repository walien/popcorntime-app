var helpers = {},
    querystring = require('querystring'),
    request = require('request'),
    Q = require('q')
_ = require('underscore'),
    EZTVAPIURL = 'http://eztvapi.re/',
    languageMapping = {
        'albanian': 'sq',
        'arabic': 'ar',
        'bengali': 'bn',
        'brazilian-portuguese': 'pt-br',
        'bulgarian': 'bg',
        'bosnian': 'bs',
        'chinese': 'zh',
        'croatian': 'hr',
        'czech': 'cs',
        'danish': 'da',
        'dutch': 'nl',
        'english': 'en',
        'estonian': 'et',
        'farsi-persian': 'fa',
        'finnish': 'fi',
        'french': 'fr',
        'german': 'de',
        'greek': 'el',
        'hebrew': 'he',
        'hungarian': 'hu',
        'indonesian': 'id',
        'italian': 'it',
        'japanese': 'ja',
        'korean': 'ko',
        'lithuanian': 'lt',
        'macedonian': 'mk',
        'malay': 'ms',
        'norwegian': 'no',
        'polish': 'pl',
        'portuguese': 'pt',
        'romanian': 'ro',
        'russian': 'ru',
        'serbian': 'sr',
        'slovenian': 'sl',
        'spanish': 'es',
        'swedish': 'sv',
        'thai': 'th',
        'turkish': 'tr',
        'urdu': 'ur',
        'ukrainian': 'uk',
        'vietnamese': 'vi'
    },
    baseUrl = 'http://api.yifysubtitles.com/subs/',
    mirrorUrl = 'http://api.ysubs.com/subs/',
    prefix = 'http://www.yifysubtitles.com',
    TTL = 1000 * 60 * 60 * 4; // 4 hours    

/*
 * Function used to query all torents using PT filters
 */
helpers.querySubtitles = function(imdbIds) {

    var deferred = Q.defer();
    
    if (_.isEmpty(imdbIds)) {
        return {};
    }

    var url = baseUrl + _.map(imdbIds.sort(), function(id) {
        return id;
    }).join('-');
    var mirrorurl = mirrorUrl + _.map(imdbIds.sort(), function(id) {
        return id;
    }).join('-');

    

    console.log("Request to: " + url);

    request({
        url: url,
        json: true
    }, function(error, response, data) {
        if (error || response.statusCode >= 400 || !data || !data.success) {
            request({
                url: mirrorurl,
                json: true
            }, function(error, response, data) {
                if (error || response.statusCode >= 400 || !data || !data.success) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(data);
                }
            });
        } else {
            deferred.resolve(data);
        }
    });

    return deferred.promise;
};

module.exports = helpers;