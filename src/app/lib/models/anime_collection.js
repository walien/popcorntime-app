(function (App) {
	'use strict';

	var AnimeCollection = App.Model.Collection.extend({
		model: App.Model.Movie,
		popid: 'mal_id',
		type: 'animes',
		getProviders: function () {
			return {
				torrents: App.Providers.getByType('anime'),
				//         subtitle: App.Providers.getByType('subtitle'),
				//         metadata: App.Trakt
			};
		},
	});

	App.Model.AnimeCollection = AnimeCollection;
})(window.App);
