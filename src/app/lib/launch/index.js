var
    Launcher,
    Q = require('q'),
    gui;

function Launcher(App) {
    this.app = App;
}

Launcher.prototype.init = function () {
    var that = this;
    return Q.Promise(function (resolve, reject) {
        that.app.PackagesManager.loadPackages(function (error, result) {
            if (error) {
                return reject(error);
            } else {

                // compare version
                var currentVersion = that.app.gui.App.manifest.version;
                /*
                if (currentVersion !== that.app.Settings.get('version')) {
                    // we should clear indexDb ?
                    that.app.CacheV2.deleteDatabase()
                        .then(function() {
                            that.app.Settings.set('version', currentVersion);

                            // TODO: Ask user to restart OR reinit the cache ?
                        });

                }
                */
                that.app.Settings.set('version', currentVersion);
                that.app.Settings.set('releaseName', that.app.gui.App.manifest.releaseName);

                return resolve();
            }
        });
    });
};

module.exports = function(App) {
    return new Launcher(App);
};