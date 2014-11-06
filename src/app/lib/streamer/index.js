(function (App) {
	'use strict';

	var semver = require('semver');
	var PTStreamer = require('popcorn-streamer-server');

	var BUFFERING_SIZE = 10 * 1024 * 1024;

	var Streamer = Backbone.Model.extend({

		initialize: function () {
			this.stream = false;
			//Start a new torrent stream, ops: torrent file, magnet
			App.vent.on('streamer:start', _.bind(this.start, this));
			//stop a torrent streaming
			App.vent.on('streamer:stop', _.bind(this.stop, this));

		},
		start: function (data) {
			var self = this;
			var torrenturl = data.torrent;
			var version = semver.parse(App.settings.version);
			var torrentVersion = '';
			torrentVersion += version.major;
			torrentVersion += version.minor;
			torrentVersion += version.patch;
			torrentVersion += version.prerelease.length ? version.prerelease[0] : 0;

			// make sure we have the
			// only one instance running atm
			this.stop();

			this.stream = new PTStreamer(torrenturl, {
                progressInterval: 200,
                buffer: BUFFERING_SIZE,
                port: 2014,
                writeDir: App.settings.tmpLocation,
                index: 'filename.mp4',
                torrent: {
                    id: '-PC' + torrentVersion + '-'
                }
			});

			this.stream.on('progress', function (data) {
				self.data = data;
				self.updateInfo();
			});

			this.stream.on('ready', function (data) {
				self.src = data.streamUrl;
                self.state = 'ready';
            });

			this.stream.on('close', function () {
				console.log('im closed');
			});

			this.stream.on('error', function (e) {
				console.log(e);
			});


			win.debug('Streaming to %s', path.join(App.settings.tmpLocation, 'filename.mp4'));

			var stateModel = new Backbone.Model({
				backdrop: data.backdrop,
				title: data.title,
				player: data.device,
				show_controls: false,
				data: data
			});

			App.vent.trigger('stream:started', stateModel);

			App.vent.trigger('serve:start', path.join(App.settings.tmpLocation, 'filename.mp4'));
		},

		setStreamUrl: function(url) {
			this.src = url;
		},

		getStreamUrl: function() {
			return this.src || false;
		},

		stop: function () {
			if (this.stream) {
				this.stream.close();
			}
		},

		updateInfo: function () {
			var state = 'connecting';

			if (this.data.downloaded) {
				state = 'downloading';
			} else if (this.data.seeds) {
				state = 'startingDownload';
			}

			this.prossessStreamInfo();
			this.state = state;

		},
		prettySpeed: function (speed) {

			speed = speed || 0;
			var converted = Math.floor(Math.log(speed) / Math.log(1024));
			return (speed / Math.pow(1024, converted)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][converted] + '/s';
		},
		prossessStreamInfo: function () {
			var converted_speed = 0;
			var percent = 0;

			/*
			if (engine.files[this.fileindex].length) {
				var total_size = engine.files[this.fileindex].length;
			} else {
				var total_size = engine.length;
			}
			if (total_size >= 1000000000) {
				total_size = (total_size / 1000000000).toFixed(2) + ' GB';
			} else if (total_size >= 1000000) {
				total_size = (total_size / 1000000).toFixed(2) + ' MB';
			}

			if (engine.files[this.fileindex].length) {
				var raw_size = engine.files[this.fileindex].length;
			} else {
				var raw_size = engine.length;
			}
			*/
			var streamInfo = {
				downloaded: this.data.downloaded,
				peers: this.data.peers,
				connections: this.data.connections,
				seeds: this.data.seeds,
				uploadSpeed: this.data.uploadSpeed,
				downloadSpeed: this.data.downloadSpeed,
				eta: this.data.eta,
				progress: this.data.progress,
				size: 1000 //debuging size -- use real once when xeon adds it in popcorn - streamer callback
			};

			this.streamInfo = streamInfo;
		}
	});

	App.Streamer = new Streamer();
})(window.App);
