(function (App) {
	'use strict';


	var readTorrent = require('read-torrent');

	var BUFFERING_SIZE = 10 * 1024 * 1024;

	var WebTorrent = require('webtorrent');
	var http = require('http');
	var portfinder = require('portfinder');

	App.streamer = {
		state: 'connecting',
		streamInfo: null
	};


	var engine, stream, client;

	var Streamerv2 = {
		start: function (data) {

			client = new WebTorrent();

			var torrenturl = data.torrent;

			console.log(torrenturl);
			stream = client.add(torrenturl, {
				dht: true, // Whether or not to enable dht
				maxPeers: parseInt(Settings.connectionLimit, 10) || 100, // Max number of peers to connect to (per torrent)
				tracker: true, // Whether or not to enable trackers
				verify: false, // Verify previously stored data before starting
				index: 0
			}, function (torrentdata) {

				portfinder.getPort(function (err, port) {
					if (err) throw err
					var streamport = parseInt(Settings.streamPort, 10) || port;
					engine = torrentdata.createServer();
					engine.listen(streamport);
					win.debug('Streaming To: localhost:' + streamport + '/0');
				})

			});

			Streamerv2.updateInfo();

			var stateModel = new Backbone.Model({
				backdrop: data.backdrop,
				title: data.title,
				player: data.device,
				show_controls: false
			});

			App.vent.trigger('stream:started', stateModel);

		},

		stop: function (torrent) {
			engine.close();
			client.destroy();
			client = null;
			engine = null;
		},

		updateInfo: function () {

			App.streamer = stream;
			var swarm = stream.swarm;

			if (swarm) {
				var state = 'connecting';
				if (swarm.downloaded > BUFFERING_SIZE) {
					state = 'ready';
				} else if (swarm.downloaded) {
					state = 'downloading';
					Streamerv2.prossessStreamInfo();
				} else if (swarm.wires.length) {
					state = 'startingDownload';
				}
			}

			if (state !== 'ready') {
				_.delay(Streamerv2.updateInfo, 100);
			}
			App.streamer.state = state;

		},
		prossessStreamInfo: function () {
			var active = function (wire) {
				return !wire.peerChoking;
			};
			var engine = App.streamer;
			var swarm = engine.swarm;
			var BUFFERING_SIZE = 10 * 1024 * 1024;
			var converted_speed = 0;
			var percent = 0;

			var upload_speed = swarm.uploadSpeed(); // upload speed
			var final_upload_speed = '0 B/s';
			if (!isNaN(upload_speed) && upload_speed !== 0) {
				converted_speed = Math.floor(Math.log(upload_speed) / Math.log(1024));
				final_upload_speed = (upload_speed / Math.pow(1024, converted_speed)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][converted_speed] + '/s';
			}


			var download_speed = swarm.downloadSpeed(); // download speed
			var final_download_speed = '0 B/s';
			if (!isNaN(download_speed) && download_speed !== 0) {
				converted_speed = Math.floor(Math.log(download_speed) / Math.log(1024));
				final_download_speed = (download_speed / Math.pow(1024, converted_speed)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][converted_speed] + '/s';
			}
			var total_size = engine.length;
			if (total_size >= 1000000000) {
				total_size = (total_size / 1000000000).toFixed(2) + ' GB';
			} else if (total_size >= 1000000) {
				total_size = (total_size / 1000000).toFixed(2) + ' MB';
			}


			var streamInfo = {
				downloaded: swarm.downloaded,
				active_peers: swarm.wires.filter(active).length,
				total_peers: swarm.wires.length,
				uploadSpeed: final_upload_speed,
				downloadSpeed: final_download_speed,
				total_size: {
					formatted: total_size,
					raw: engine.length
				},
				src: 'http://127.0.0.1:' + engine.client.torrentPort + '/'
			}

			App.streamer.streamInfo = streamInfo;

		}
	};


	App.vent.on('streamer:start', Streamerv2.start); //Start a new torrent stream, ops: torrent file, magnet
	App.vent.on('streamer:stop', Streamerv2.stop); //stop a torrent streaming


})(window.App);