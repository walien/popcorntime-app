(function (App) {
	'use strict';
	var Q = require('q');

	var Favorites = function () {};
	Favorites.prototype.constructor = Favorites;

	var queryTorrents = function (filters) {

		var page = filters.page - 1;
		var byPage = 30;
		var offset = page * byPage;
		var query = {};

		return App.Database.find('bookmarks', {}, offset, byPage)
			.then(function (data) {
					return data;
				},
				function (error) {
					return [];
				});
	};

	var formatForPopcorn = function (items) {
		var movieList = [];

		items.forEach(function (movie) {

			var deferred = Q.defer();
			// we check if its a movie
			// or tv show then we extract right data
			if (movie.type === 'movie') {
				// its a movie
				App.Database.get('movies', {
						imdb_id: movie.imdb_id
					})
					.then(function (data) {
							data.type = 'bookmarkedmovie';
							deferred.resolve(data);
						},
						function (err) {
							deferred.reject(err);
						});
			} else {
				// its a tv show
				App.Database.get('tvshows', {
						imdb_id: movie.imdb_id
					})
					.then(function (data) {
						data.type = 'bookmarkedshow';
						data.image = data.images.poster;
						data.imdb = data.imdb_id;
						// Fallback for old bookmarks without provider in database
						if (typeof (data.provider) === 'undefined') {
							data.provider = 'eztv';
						}
						deferred.resolve(data);
					}, function (err) {
						deferred.reject(err);
					});
			}

			movieList.push(deferred.promise);
		});

		return Q.all(movieList);
	};

	Favorites.prototype.extractIds = function (items) {
		return _.pluck(items, 'imdb_id');
	};

	Favorites.prototype.fetch = function (filters) {
		return queryTorrents(filters)
			.then(formatForPopcorn);
	};

	App.Providers.Favorites = Favorites;

})(window.App);
