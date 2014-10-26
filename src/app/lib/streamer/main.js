(function (App) {
	'use strict';

	var semver = require('semver');
	var streamer = require('popcorn-streamer');
	var portfinder = require('portfinder');

	var BUFFERING_SIZE = 10 * 1024 * 1024;

	var Streamerv2 = Backbone.Model.extend({

		initialize: function () {

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

			streamer(torrenturl, {
				progressInterval: 100,
				torrent: {
					id: '-PC' + torrentVersion + '-'
				}
			}).on('progress', function (data) {
				self.data = data;
				self.updateInfo();
			}).pipe(fs.createWriteStream('The Pirate Bay Away from Keyboard.mp4'));

			var stateModel = new Backbone.Model({
				backdrop: data.backdrop,
				title: data.title,
				player: data.device,
				show_controls: false,
				data: data
			});

			App.vent.trigger('stream:started', stateModel);

			App.vent.trigger('serve:start', 'The Pirate Bay Away from Keyboard.mp4');
		},

		stop: function () {
			streamer.close();
		},

		updateInfo: function () {
			var state = 'connecting';

			if (this.data.downloaded > BUFFERING_SIZE) {
				state = 'ready';
			} else if (this.data.downloaded) {
				state = 'downloading';
			} else if (this.data.seeds) {
				state = 'startingDownload';
			}

			this.prossessStreamInfo();

			this.state = state;

		},
		prettySpeed: function (speed) {
			var converted = Math.floor(Math.log(speed) / Math.log(1024));
			return (speed / Math.pow(1024, converted)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][converted] + '/s';
		},
		prossessStreamInfo: function () {
			var converted_speed = 0;
			var percent = 0;

			var speed = {
				up: this.data.uploadSpeed,
				down: this.data.downloadSpeed
			};

			speed.up = speed.up ? '0 B/s' : this.prettySpeed(speed.up);
			speed.down = speed.down ? '0 B/s' : this.prettySpeed(speed.down);

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
				uploadSpeed: speed.up,
				downloadSpeed: speed.down,
				eta: this.data.eta,
				progress: this.data.progress
			};

			this.streamInfo = streamInfo;
		}
	});

	App.Streamer = new Streamerv2();
})(window.App);