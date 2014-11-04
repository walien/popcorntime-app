'use strict';

/*
* We import our depedencies
*/
var App = require('pdk'),
    _ = require('underscore'),
    Q = require('q'),
    rpc = require('json-rpc2'),
    server,
    httpServer,
    sockets = [];

/*
* We build and export our new package
*/
module.exports = App.Core.extend({

    /*
     * Default function called by package manager to activate
     */
    onActivate: function() {
        //this.start();

        // bind our function to initHttpApi
        // i think this may be removed ?
        //this.app.api.vent.on('initHttpApi', this.start);
        return;
    },

    start: function () {
        var self = this;
        console.log('Reiniting server');

        Q.fcall(self.initServer)
            .then(function () {
                //server.enableAuth(self.app.api.settings.get('httpApiUsername'), self.app.api.settings.get('httpApiPassword'));
                if (httpServer) {
                    self.closeServer(startListening);
                } else {
                    self.startListening();
                }
            });
    },

    initServer: function() {
        var self = this;

        server = rpc.Server({
            'headers': { // allow custom headers is empty by default
                'Access-Control-Allow-Origin': '*'
            }
        });

        server.expose('ping', function (args, opt, callback) {
            self.callback(callback);
        });

        server.expose('volume', function (args, opt, callback) {
            var volume = 1;

            var view = this.app.views.player;

            if (view !== undefined && view.player !== undefined) {
                if (args.length > 0) {
                    volume = parseFloat(args[0]);
                    if (volume > 0) {
                        if (view.player.muted()) {
                            view.player.muted(false);
                        }
                        view.player.volume(volume);
                    } else {
                        view.player.muted(true);
                    }
                } else {
                    volume = view.player.volume();
                }
            }
            self.callback(callback, 'Cant change volume, player not open');
        });

    },

    startListening: function() {

        httpServer = server.listen(this.app.api.settings.get('httpApiPort'));

        httpServer.on('connection', function (socket) {
            sockets.push(socket);
            socket.setTimeout(4000);
            socket.on('close', function () {
                console.log('socket closed');
                sockets.splice(sockets.indexOf(socket), 1);
            });
        });
    },

    closeServer: function() {
        httpServer.close(function () {
            cb();
        });
        for (var i = 0; i < sockets.length; i++) {
            console.log('socket #' + i + ' destroyed');
            sockets[i].destroy();
        }
    },

    callback: function (callback, err, result) {
        if (result === undefined) {
            result = {};
        }
        result['popcornVersion'] = this.app.api.settings.get('version');
        console.log(result['popcornVersion']);
        process.exit();
        callback(err, result);
    }


});
