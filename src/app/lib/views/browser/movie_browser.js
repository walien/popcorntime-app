(function (App) {
	'use strict';

	var MovieBrowser = App.View.PCTBrowser.extend({
		collectionModel: App.Model.MovieCollection,
		filters: {
			genres: App.Config.genres,
			sorters: App.Config.sorters,
			qualities: App.Config.qualities
		}
	});

	App.View.MovieBrowser = MovieBrowser;
})(window.App);
