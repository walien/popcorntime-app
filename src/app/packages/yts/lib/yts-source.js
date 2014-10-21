/*
* We import our depedencies
*/
var App = require('popcorn-app'),
    _ = require('underscore'),
    querystring = require('querystring'),
    request = require('request'),
    Q = require('q'),
    YTSProvider;

/*
* We create our new function
*/
YTSProvider = App.extend({

    hooks: {
        registerProvider: {
            type: 'movie', // tvshow/movie
            handleProvider: this.handleProvider
        }
    },

    handleProvider: function (filters) {
        console.log("YEAH! WE CAN HANDLE NOW :D")
        return false;
    }

});

module.exports = YTSProvider;