(function (App) {
	'use strict';

	var STREAM_PORT = 21584; // 'PT'!
	var BUFFERING_SIZE = 10 * 1024 * 1024;

	var readTorrent = require('read-torrent');

	var WebTorrent = require('webtorrent');
	var concat = require('concat-stream');
	var client = new WebTorrent();

	var mime = require('mime');
	var path = require('path');

	/*
data = {url = url, id  = imdb,amime id }
*/

	var Streamer = {
		start: function (torrent) {

			client.add(torrent, {
				dht: true, // Whether or not to enable DHT
				maxPeers: parseInt(Settings.connectionLimit, 10) || 100, // Max number of peers to connect to (per torrent)
				tracker: true, // Whether or not to enable trackers
				verify: true, // Verify previously stored data before starting
				port: parseInt(Settings.streamPort, 10) || 0,
				index: torrent.file_index
			}, function (torrent) {
				// Got torrent metadata!
				console.log('Torrent info hash:', torrent.infoHash)
				console.log(torrent);

			})


		},

		stop: function (torrent) {
			client.remove(torrent, [

				function callback(err) {
					if (err) throw err
				}
			])
		}
	};

	App.vent.on('preload:start', Preload.start);
	App.vent.on('preload:stop', Preload.stop);
	App.vent.on('stream:start', Streamer.start);
	App.vent.on('stream:stop', Streamer.stop);

})(window.App);