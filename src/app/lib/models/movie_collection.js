(function (App) {
	'use strict';

	var Q = require('q');

	var MovieCollection = App.Model.Collection.extend({
		model: App.Model.Movie,
		popid: 'imdb_id',
		type: 'movies',
		getProviders: function () {
			return {
				torrents: App.Providers.getByType('movie'),
				subtitle: App.Providers.getByType('subtitle'),
				metadata: App.Providers.getByType('metadata')
			};
		}
	});

	App.Model.MovieCollection = MovieCollection;
})(window.App);
