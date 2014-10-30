var
    Q = require('q'),
    _ = require('lodash'),
    Common;

function Events(App) {

    Common = require('../common')(App);

    App.vent.on('show:watched', _.bind(Common.markEpisodeAsWatched, this));
    //App.vent.on('show:unwatched', _.bind(this.markEpisodeAsNotWatched, this));
    //App.vent.on('movie:watched', _.bind(Common.markMovieAsWatched, this));

}


module.exports = function(App) {
    return new Events(App);
};