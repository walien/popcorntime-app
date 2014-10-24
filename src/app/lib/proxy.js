(function(App) {
    'use strict';

    var AppProxy,
        _ = require('underscore');

    function AppProxy(options) {
        if (!options.name) {
            throw new Error('Must provide an app name for api context');
        }

        if (!options.permissions) {
            throw new Error('Must provide app permissions');
        }

        _.extend(this, generateProxyFunctions(options.name, options.permissions));
    }

    function generateProxyFunctions(name, permissions) {

        var passThruAppContextToApi = function(perm, apiMethods) {
                var appContext = {
                    app: name
                };

                return _.reduce(apiMethods, function(memo, apiMethod, methodName) {
                    memo[methodName] = function() {
                        var args = _.toArray(arguments),
                            options = args[args.length - 1];

                        if (_.isObject(options)) {
                            options.context = _.clone(appContext);
                        }
                        return apiMethod.apply({}, args);
                    };

                    return memo;
                }, {});
        };

        /*
         * It's here we define the 'mapping' of available 
         * class / functions via the PDK
         * The are accessible after an extend from one of the main class
         *
         * Example
         * this.app.api.settings.set will be mapped to App.AdvSettings
         */

        return {
            api: {

                settings: passThruAppContextToApi('settings',
                    _.pick(App.advsettings, 'get', 'set')
                ),

                providers: passThruAppContextToApi('providers',
                    _.pick(App.Providers, 'get', 'set')
                ),

                localization: passThruAppContextToApi('providers',
                    _.pick(App.Localization, 'filterSubtitle')
                ),

                vent: App.vent
            },

            cache: {
                providers: App.Providers.CacheProviderV2,
            },

            views: {
                player: App.PlayerView,
            }
        };

    };

    App.Proxy = AppProxy;

})(window.App);