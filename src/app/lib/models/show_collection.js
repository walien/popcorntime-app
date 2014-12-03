(function (App) {
	'use strict';

	var ShowCollection = App.Model.Collection.extend({
		model: App.Model.Movie,
		popid: 'imdb_id',
		type: 'shows',
		getProviders: function () {
			return {
				torrents: App.Providers.getByType('tvshow'),
				//         subtitle: App.Providers.getByType('subtitle'),
				//         metadata: App.Trakt
			};
		},
	});

	App.Model.ShowCollection = ShowCollection;
})(window.App);
