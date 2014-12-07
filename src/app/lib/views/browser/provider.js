(function (App) {
	'use strict';

	App.View.ProviderBrowser = App.View.PCTBrowser.extend({
		collectionModel: App.Model.Collection.extend({
			getProviders: function () {
				var subtitles = false,
					metadata = false;

				if (App.ActiveProvider.config.subtitle !== false) {
					subtitles = App.Providers.get(App.ActiveProvider.config.subtitle);
				}

				if (App.ActiveProvider.config.metadata !== false) {
					metadata = App.Providers.get(App.ActiveProvider.config.metadata);
				}

				return {
					torrents: [App.ActiveProvider],
					subtitle: subtitles,
					metadata: metadata
				};
			}
		})
	});

})(window.App);
