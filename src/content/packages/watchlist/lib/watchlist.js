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
     * Function called immediatly when this package is loaded
     */
    onActivate: function() {
        console.log("i'm activated");
    },

    /*
     * Function called immediatly when ALL packages are activated
     * So if this package depend of something we can initialize it here.
    */
    afterActivate: function() {
      console.log("i'm ready");
    }


});
