(function (App) {
	'use strict';

	var BUFFERING_SIZE = 10 * 1024 * 1024;

	var readTorrent = require('read-torrent');

	var WebTorrent = require('webtorrent');
	var http = require('http');
	var portfinder = require('portfinder');
	var client = new WebTorrent();

	var engine = null;
	var stream = null;

	var Streamerv2 = {
		start: function (data) {

			var torrenturl = data.torrent;

			stream = client.add(torrenturl, {
				dht: true, // Whether or not to enable dht
				maxPeers: parseInt(Settings.connectionLimit, 10) || 100, // Max number of peers to connect to (per torrent)
				tracker: true, // Whether or not to enable trackers
				verify: false, // Verify previously stored data before starting
				index: 0
			}, function (torrent) {
				portfinder.getPort(function (err, port) {
					if (err) throw err
					var streamport = parseInt(Settings.streamPort, 10) || port;
					engine = torrent.createServer();
					engine.listen(streamport);
					win.debug('Streaming To: localhost:' + streamport + '/0');
				})
			});

			Streamerv2.updateInfo(data);

		},
		updateInfo: function (data) {

			var stateModel = new Backbone.Model({
				state: 'connecting',
				backdrop: data.backdrop,
				title: data.title,
				player: '',
				streamInfo: null,
				show_controls: false
			});

			var swarm = stream.swarm;

			if (swarm) {
				var state = 'connecting';
				console.log(swarm);
				if (swarm.downloaded > BUFFERING_SIZE) {
					state = 'ready';
				} else if (swarm.downloaded) {
					state = 'downloading';
				} else if (swarm.wires.length) {
					state = 'startingDownload';
				}
				console.log(state);
				stateModel.set('state', state);
			}

			App.vent.trigger('stream:started', stateModel);
			/*
			switch (type) {
			case 'init':
				stateModel = new Backbone.Model({
					state: 'connecting',
					backdrop: data.backdrop,
					title: data.title,
					player: '',
					show_controls: false
				});
				break;
			case 'update':
				stateModel = new Backbone.Model({
					state: 'connecting',
					backdrop: data.backdrop,
					title: data.title,
					player: '',
					show_controls: false
				});
				break;
			}

			App.vent.trigger('stream:started', stateModel);
			*/
		},
		destroy: function () {
			engine.close();
			client.destroy();
		},
		stop: function (torrent) {
			client.remove(torrent, function (err) {
				if (err) {
					win.error(err);
				}
			});
		}
	};


	App.vent.on('streamer:start', Streamerv2.start); //Start a new torrent stream, ops: torrent file, magnet
	App.vent.on('streamer:stop', Streamerv2.stop); //stop a torrent stream, ops: torrent file, magnet
	App.vent.on('streamer:destroy', Streamerv2.destroy); // destroy all streams and stop server

})(window.App);