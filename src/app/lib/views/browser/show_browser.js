(function (App) {
	'use strict';

	var ShowBrowser = App.View.PCTBrowser.extend({
		collectionModel: App.Model.ShowCollection,
		filters: {
			genres: App.Settings.get('genres_tv'),
			sorters: App.Settings.get('sorters_tv')
		}
	});

	App.View.ShowBrowser = ShowBrowser;
})(window.App);
