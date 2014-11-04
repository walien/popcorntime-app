'use strict';

/*
* We import our depedencies
*/
var App = require('pdk');

/*
* We build and export our new package
*/
module.exports = App.Providers.extend({

    /*
     * Default function called by package manager to activate
     */
    onActivate: function() {
        console.log("wo0t");
    }


});
