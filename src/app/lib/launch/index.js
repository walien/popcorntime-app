var
    Launcher,
    Q = require('q'),
    Events,
    gui,
    tls = require('tls'),
    URI = require('URIjs'),
    request = require('request');

function Launcher(App) {
    Events = require('../events')(App);
    this.app = App;
}

Launcher.prototype.init = function() {
    var that = this;
    return this.checkEndpoint()
        .then(function() {
            return that.compareVersion();
        })
        .then(function() {
            return that.loadPackages();
        });
};

Launcher.prototype.checkEndpoint = function() {

    var that = this;

    var allApis = [{
        original: 'yifyApiEndpoint',
        mirror: 'yifyApiEndpointMirror',
        fingerprint: 'F6:E8:18:11:0A:6F:57:7F:F2:9C:FC:C3:80:F9:A8:5B:07:04:08:2C'
    }];

    var promises = allApis.map(function(apiCheck) {
        return Q.Promise(function(resolve, reject) {
            var hostname = URI(that.app.Settings.get(apiCheck.original)).hostname();

            tls.connect(443, hostname, {
                servername: hostname,
                rejectUnauthorized: false
            }, function() {
                if (!this.authorized || this.authorizationError || this.getPeerCertificate().fingerprint !== apiCheck.fingerprint) {
                    // "These are not the certificates you're looking for..."
                    // Seems like they even got a certificate signed for us :O
                    that.app.Settings.set(apiCheck.original, that.app.Settings.get(apiCheck.mirror), false);
                }
                this.end();
                resolve();
            }).on('error', function() {
                // No SSL support. That's convincing >.<
                that.app.Settings.set(apiCheck.original, that.app.Settings.get(apiCheck.mirror), false);
                this.end();
                resolve();
            }).on('timeout', function() {
                // Connection timed out, we'll say its not available
                that.app.Settings.set(apiCheck.original, that.app.Settings.get(apiCheck.mirror), false);
                this.end();
                resolve();
            }).setTimeout(10000); // Set 10 second timeout
        });
    });

    return Q.all(promises);
};

Launcher.prototype.compareVersion = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {
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
    });
};

Launcher.prototype.loadPackages = function() {
    var that = this;
    return Q.Promise(function(resolve, reject) {
        that.app.PackagesManager.loadPackages(function(error, result) {
            if (error) {
                return reject(error);
            } else {
                return resolve();
            }
        });
    });
};

module.exports = function(App) {
    return new Launcher(App);
};