'use strict';

/*
* We import our depedencies
*/
var App = require('pdk'),
    _ = require('underscore'),
    Q = require('q'),
    server = require('socket.io'),
    btoa = require('btoa'),
    io;

/*
* We build and export our new package
*/
module.exports = App.Core.extend({

    /*
     * Default function called by package manager to activate
     */
    onActivate: function() {
        this.start();
    },

    start: function () {

      var self = this;

      io = server.listen(8009);
      var no_auth = [];

      io.use(function(socket, next) {
        if (socket.handshake.query.auth !== btoa('popcorn:popcorn')) {
          no_auth.push(socket.id);
        }
        next();
      });

      io.on('connection', function(socket) {

        if (no_auth.indexOf(socket.id) > -1) {
          no_auth.splice(no_auth.indexOf(socket.id), 1);
          socket.emit('auth_invalid', 'Username or password invalid');
          socket.disconnect();
        }

        socket.emit('version', {
          version: self.app.api.currentVersion,
          git: self.app.api.git
        });

        var playerListenersInited = false;

        var initPlayerListeners = function() {
          try {
            //self.app.player.on('seeked', emitPlayerSeeked);
            //self.app.player.on('volumechange', emitPlayerVolumeChanged);
          } catch (e) {
            // Catch errors if player is null when the on() is executed inside the object. The player will emit another play event and the listeners will be added. So there's nothing to worry about.
          }

          playerListenersInited = true;
        };

        var emitPlayerInfo = function() {
          socket.emit('player_info', self.app.api.player.info());
        };

        socket.on('player_info', function(data) {
          emitPlayerInfo();
        });

        self.app.api.vent.on('player:start', emitPlayerInfo);

        });

    }



});
