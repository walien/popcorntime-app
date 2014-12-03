(function (App) {
	'use strict';

	var AnimeBrowser = App.View.PCTBrowser.extend({
		collectionModel: App.Model.AnimeCollection,
		filters: {
			genres: App.Settings.get('genres_anime'),
			sorters: App.Settings.get('sorters_tv'),
			types: App.Settings.get('types_anime')
		}
	});

	App.View.AnimeBrowser = AnimeBrowser;
})(window.App);
