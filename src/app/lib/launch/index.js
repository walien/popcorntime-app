var
    Launcher,
    Q = require('q');

function Launcher(packagesManager) {
    this.packagesManager = packagesManager;
}

Launcher.prototype.init = function () {
    var that = this;
    return Q.Promise(function (resolve, reject) {
        that.packagesManager.loadPackages(function (error, result) {
            if (error) {
                return reject(error);
            } else {

                // we have our packages !

                return resolve(result);
            }
        });
    });
};

module.exports = function(packagesManager) {
    return new Launcher(packagesManager);
};