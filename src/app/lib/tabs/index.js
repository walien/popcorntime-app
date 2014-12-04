(function (App) {
    'use strict';

    function setTab(uiName, providerName) {
        var tabs = App.Settings.get('tabs');
        tabs.push({
            ui: uiName,
            provider: providerName
        });
        App.Settings.set('tabs', tabs);
    }

    function getFirstTab() {
        return _.first(App.Settings.get('tabs'));
    }

    App.Tabs = {
        set: setTab,
        getFirst: getFirstTab
    };

})(window.App);
