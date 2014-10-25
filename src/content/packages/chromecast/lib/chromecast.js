'use strict';

/*
* We import our depedencies
*/
var App = require('pdk');

/*
* We build and export our new package
*/
module.exports = App.Devices.extend({

    /*
     * Default function called by package manager to activate
     */
    _activate: function() {
        console.log("chromecast init")
    }

});