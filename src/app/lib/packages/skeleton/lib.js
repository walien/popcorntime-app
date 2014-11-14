'use strict';

/*
* We import our depedencies
*/
var App = require('pdk');

/*
* We build and export our new package
*/
module.exports = App.Core.extend({

    settings: {},

    /*
     * Default function called by package manager to activate
     */
    onActivate: function() {
        console.log('Loaded !');
    }

});
