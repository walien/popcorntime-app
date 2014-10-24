(function (App) {
	'use strict';


	var readTorrent = require('read-torrent');

	var BUFFERING_SIZE = 10 * 1024 * 1024;

	var WebTorrent = require('webtorrent');
	var http = require('http');
	var portfinder = require('portfinder');

	var Streamerv2 = Backbone.Model.extend({
		defaults: {
			state: 'connecting',
			streamInfo: null,
			initialized: false,
		},
		initialize: function () {

			//Start a new torrent stream, ops: torrent file, magnet
			App.vent.on('streamer:start', _.bind(this.start, this));
			//stop a torrent streaming
			App.vent.on('streamer:stop', _.bind(this.stop, this));
			this.initialized = true;
		},
		start: function (data) {
			var that = this;
			this.client = new WebTorrent();

			var torrenturl = data.torrent;

			this.stream = this.client.add(torrenturl, {
				dht: true, // Whether or not to enable dht
				maxPeers: parseInt(Settings.connectionLimit, 10) || 100, // Max number of peers to connect to (per torrent)
				tracker: true, // Whether or not to enable trackers
				verify: false, // Verify previously stored data before starting
				index: 0
			}, function (torrentdata) {

				portfinder.getPort(function (err, port) {
					if (err) {
						throw err
					};
					var streamport = parseInt(Settings.streamPort, 10) || port;
					that.engine = torrentdata.createServer();
					that.engine.listen(streamport);
					win.debug('Streaming To: localhost:' + streamport + '/0');
					that.port = streamport;
				});

			});

			this.updateInfo();

			var stateModel = new Backbone.Model({
				backdrop: data.backdrop,
				title: data.title,
				player: data.device,
				show_controls: false,
				data: data
			});

			App.vent.trigger('stream:started', stateModel);

		},

		stop: function (torrent) {
			this.engine.close();
			this.client.destroy();
			this.client = null;
			this.engine = null;
			this.streamInfo = null;
		},

		updateInfo: function () {
			var swarm = this.stream.swarm;
			var state;

			if (swarm) {
				state = 'connecting';
				if (swarm.downloaded > BUFFERING_SIZE) {
					state = 'ready';
				} else if (swarm.downloaded) {
					state = 'downloading';
				} else if (swarm.wires.length) {
					state = 'startingDownload';
				}
			}

			this.prossessStreamInfo();

			if (state !== 'ready') {
				_.delay(_.bind(this.updateInfo, this), 100);
			}

			if (state) {
				this.state = state;
			}
		},
		prossessStreamInfo: function () {
			var active = function (wire) {
				return !wire.peerChoking;
			};
			var engine = this.stream;
			var swarm = engine.swarm;

			if (!swarm) {
				return;
			}

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
				src: 'http://127.0.0.1:' + this.port + '/' + 0
			};

			this.streamInfo = streamInfo;
		}
	});

	App.Streamer = new Streamerv2();
})(window.App);