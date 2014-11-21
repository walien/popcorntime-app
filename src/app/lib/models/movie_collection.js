(function (App) {
	'use strict';

	var Q = require('q');

	var MovieCollection = App.Model.Collection.extend({
		model: App.Model.Movie,
		popid: 'imdb_id',
		type: 'movie',
		getProviders: function () {
			return {
				torrents: App.Config.getProvider('movie'),
				subtitle: App.Config.getProvider('subtitle'),
				metadata: App.Config.getProvider('metadata')
			};
		}
	});

	App.Model.MovieCollection = MovieCollection;
})(window.App);
