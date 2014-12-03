(function (App) {
    'use strict';

    App.View.ProviderBrowser = App.View.PCTBrowser.extend({
        collectionModel: App.Model.Collection.extend({
            popid: 'imdb_id',
            type: 'movies',
            model: Backbone.Model.extend({
                events: {
                    'change:torrents': 'updateHealth',
                },

                idAttribute: 'imdb_id',

                initialize: function () {
                    this.updateHealth();
                },

                updateHealth: function () {
                    var torrents = this.get('torrents');

                    _.each(torrents, function (torrent) {
                        torrent.health = Common.healthMap[Common.calcHealth(torrent)];
                    });

                    this.set('torrents', torrents, {
                        silent: true
                    });
                }
            }),
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
