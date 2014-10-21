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

    config: {
        type: 'provider:movie'
    },

    hooks: {
        handleProvider: 'handleMovies'
    },

    handleMovies: function (filters) {        
        console.log("YEAH! WE CAN HANDLE NOW :D");
        process.exit();
    }

});

module.exports = YTSProvider;