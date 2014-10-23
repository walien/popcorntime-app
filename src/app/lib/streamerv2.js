(function (App) {
	'use strict';

	var BUFFERING_SIZE = 10 * 1024 * 1024;

	var readTorrent = require('read-torrent');

	var WebTorrent = require('webtorrent');
	var http = require('http');
	var portfinder = require('portfinder');

	var engine, stream, client;

	var Streamerv2 = {
		start: function (data) {

			client = new WebTorrent();

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


		},

		stop: function (torrent) {
			engine.close();
			client.destroy();
			client = null;
			engine = null;
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
					// Fix for loading modal

					App.streamInfo.update(stream).then(function (data) {
						console.log(data)
					});

				} else if (swarm.wires.length) {
					state = 'startingDownload';
				}

				stateModel.set('state', state);
			}

			if (state !== 'ready') {
				_.delay(Streamerv2.updateInfo, 100, data);
			}
			console.log(stateModel);
			App.vent.trigger('stream:started', stateModel);

		}
	};


	App.vent.on('streamer:start', Streamerv2.start); //Start a new torrent stream, ops: torrent file, magnet
	App.vent.on('streamer:stop', Streamerv2.stop); //stop a torrent streaming


})(window.App);