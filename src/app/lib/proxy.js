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

        var getPermission = function(perm) {
                return permissions[perm];
            },

            checkRegisterPermissions = function(perm, registerMethod) {
                return true;
            },

            passThruAppContextToApi = function(perm, apiMethods) {
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
            },
            proxy;

        proxy = {
            api: {

                settings: passThruAppContextToApi('settings',
                    _.pick(App.advsettings, 'get', 'set')
                ),

                providers: passThruAppContextToApi('providers',
                    _.pick(App.Providers, 'get', 'set')
                ),

                vent: App.vent
            },

            cache: {
                providers: App.Providers.CacheProviderV2,
            }
        };

        return proxy;
    };

    App.Proxy = AppProxy;

})(window.App);