(function (App) {
	'use strict';

	var MovieBrowser = App.View.PCTBrowser.extend({
		collectionModel: App.Model.MovieCollection,
		filters: {
			genres: App.Settings.get('genres'),
			sorters: App.Settings.get('sorters')
		}
	});

	App.View.MovieBrowser = MovieBrowser;
})(window.App);
