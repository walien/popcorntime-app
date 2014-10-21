(function (App) {
    'use strict';

    var Hooks = {

        hooks: [],
        hookCallbacks: [],
        defaults: {
            hookPriority: 5,
            maxPriority: 9
        },

        /*
         * Register Hook used by Package
         */
        register: function (name, priority, fn) {
        
            if (_.isFunction(priority)) {
                fn = priority;
                priority = null;
            }

            // null priority should be set to default
            if (priority === null) {
                priority = this.defaults.hookPriority;
            }

            this.hookCallbacks[name] = this.hookCallbacks[name] || {};
            this.hookCallbacks[name][priority] = this.hookCallbacks[name][priority] || [];

            this.hookCallbacks[name][priority].push(fn);

            console.log(name);
            console.log(priority);
            console.log(_.isFunction(fn));

        },

    }

    App.Hooks = Hooks;

})(window.App);