var
    SettingsManager,
    App,
    Database = require('../lib/database'),
    Settings = require('../lib/settings'),
    _ = require('lodash');

App.vent.on('show:watched', _.bind(Database.markEpisodeAsWatched, this));
App.vent.on('show:unwatched', _.bind(Database.markEpisodeAsNotWatched, this));
App.vent.on('movie:watched', _.bind(Database.markMovieAsWatched, this));