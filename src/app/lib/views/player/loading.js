(function (App) {
	'use strict';
	var Loading = Backbone.Marionette.ItemView.extend({
		template: '#loading-tpl',
		className: 'app-overlay',

		ui: {
			stateTextDownload: '.text_download',
			progressTextDownload: '.value_download',

			stateTextPeers: '.text_peers',
			progressTextPeers: '.value_peers',

			stateTextSeeds: '.text_seeds',
			progressTextSeeds: '.value_seeds',

			seedStatus: '.seed_status',
			downloadPercent: '.download_percent',

			downloadSpeed: '.download_speed',
			uploadSpeed: '.upload_speed',
			progressbar: '#loadingbar-contents',

			player: '.player-name',
			streaming: '.external-play',
			controls: '.player-controls',
			cancel_button: '.cancel-button',

			title: '.title',
			backdrop: '.loading-background'
		},

		events: {
			'click .cancel-button': 'cancelStreaming',
			'click .pause': 'pauseStreaming',
			'click .stop': 'stopStreaming',
			'click .play': 'resumeStreaming'
		},
		templateHelpers: {

		},
		initialize: function () {
			var that = this;

			//If a child was removed from above this view
			App.vent.on('viewstack:pop', function () {
				if (_.last(App.ViewStack) === that.className) {
					that.initKeyboardShortcuts();
				}
			});

			//If a child was added above this view
			App.vent.on('viewstack:push', function () {
				if (_.last(App.ViewStack) !== that.className) {
					that.unbindKeyboardShortcuts();
				}
			});

			win.info('Loading torrent');

			if (this.model.attributes.data.type.indexOf('dropped') > -1) {
				this.augmentDropModel(this.model.attributes.data); // olny call if droped torrent/magnet
			}

		},

		initKeyboardShortcuts: function () {
			var that = this;
			Mousetrap.bind(['esc', 'backspace'], function (e) {
				that.cancelStreaming();
			});
		},

		unbindKeyboardShortcuts: function () {
			Mousetrap.unbind(['esc', 'backspace']);
		},

		onShow: function () {
			$('.filter-bar').hide();
			$('#header').addClass('header-shadow');

			this.initKeyboardShortcuts();

			this.player = this.model.get('player').get('id');

			this.StateUpdate();

		},
		StateUpdate: function () {
			var that = this;
			var BUFFERING_SIZE = 10 * 1024 * 1024;
			var percent;
			var streamInfo = App.Streamer.streamInfo;
			if (App.Streamer.state) {
				this.ui.stateTextDownload.text(i18n.__(App.Streamer.state));
			}
			if (streamInfo) {
				that.ui.seedStatus.css('visibility', 'visible');
				var downloaded = streamInfo.downloaded / (1024 * 1024);

				that.ui.progressTextDownload.text(downloaded.toFixed(2) + ' Mb');
				that.ui.progressTextPeers.text(streamInfo.peers);
				that.ui.progressTextSeeds.text(streamInfo.seeds);

				percent = streamInfo.downloaded / (BUFFERING_SIZE / 100);
				percent = percent.toFixed();

				that.ui.downloadPercent.text(percent + '%');
				that.ui.downloadSpeed.text(streamInfo.prettyDownloadSpeed);
				that.ui.uploadSpeed.text(streamInfo.prettyUploadSpeed);
				that.ui.progressbar.stop().animate({
					width: percent + '%'
				}, 100, 'swing');
				if (percent > 99) {

					if (this.player === 'local') {
						var playerModel = new Backbone.Model(that.model.get('data'));
						App.vent.trigger('stream:local', playerModel);
					} else {

						App.vent.trigger('stream:ready', that.model.get('player'));
					}

					if (that.model.get('player') && that.model.get('player').get('type') !== 'local') {
						that.ui.player.text(that.model.get('player').get('name'));
						that.ui.streaming.css('visibility', 'visible');
					}
				} else {
					this.updateInfo = _.delay(_.bind(this.StateUpdate, this), 100);
				}
			} else {
				this.updateInfo = _.delay(_.bind(this.StateUpdate, this), 100);
			}

		},

		cancelStreaming: function () {
			clearInterval(this.updateInfo);
			App.vent.trigger('streamer:stop');
			App.vent.trigger('player:close');
			App.vent.trigger('torrentcache:stop');
		},

		pauseStreaming: function () {
			App.vent.trigger('device:pause');
			$('.pause').removeClass('fa-pause').removeClass('pause').addClass('fa-play').addClass('play');
		},

		resumeStreaming: function () {
			console.log('clicked play');
			App.vent.trigger('device:unpause');
			$('.play').removeClass('fa-play').removeClass('play').addClass('fa-pause').addClass('pause');
		},

		stopStreaming: function () {
			App.vent.trigger('device:stop');
			this.cancelStreaming();
		},

		onClose: function () {
			$('.filter-bar').show();
			$('#header').removeClass('header-shadow');
			Mousetrap.bind('esc', function (e) {
				App.vent.trigger('show:closeDetail');
				App.vent.trigger('movie:closeDetail');
			});
		},
		augmentDropModel: function (data) {
			var metadata = data.metadata;
			var that = this;

			switch (data.type) {
			case 'dropped-episode':
				App.Providers['tvshow-metadata'].episodeSummary(metadata.showname, metadata.season, metadata.episode).then(function (data) {
					if (!data) {
						win.warn('Unable to fetch data from Trakt.tv');
					} else {

						that.model.attributes.data.type = 'episode';
						that.model.attributes.data.metadata.title = data.show.title + ' - ' + i18n.__('Season') + ' ' + data.episode.season + ', ' + i18n.__('Episode') + ' ' + data.episode.number + ' - ' + data.episode.title;
						that.model.attributes.data.metadata.showname = data.show.title;
						that.model.attributes.data.metadata.season = data.episode.season;
						that.model.attributes.data.metadata.episode = data.episode.number;
						that.model.attributes.data.metadata.cover = data.show.images.poster;
						that.model.attributes.data.metadata.tvdb_id = data.show.tvdb_id;
						that.model.attributes.data.metadata.imdb_id = data.show.imdb_id;
						that.model.attributes.data.metadata.backdrop = data.show.images.fanart;

						that.ui.title.text(that.model.attributes.data.metadata.title);
						that.ui.backdrop.css('background-image', 'url(' + that.model.attributes.data.metadata.backdrop + ')');

						App.Streamer.getSubtitles(that.model.attributes.data.metadata, that.model.attributes.data.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase(), 'episode');

					}
				}).catch(function (err) {
					win.warn(err);
				});
				break;
			case 'dropped-movie':
				App.Providers['movie-metadata'].findSummary(metadata.title).then(function (data) {
					if (!data) {
						win.warn('Unable to fetch data from Trakt.tv');
					} else {
						data = data[0];
						that.model.attributes.data.type = 'movie';
						that.model.attributes.data.metadata.title = data.title;
						that.model.attributes.data.metadata.cover = data.images.poster;
						that.model.attributes.data.metadata.imdb_id = data.imdb_id;
						that.model.attributes.data.metadata.backdrop = data.images.fanart;

						that.ui.title.text(that.model.attributes.data.metadata.title);
						that.ui.backdrop.css('background-image', 'url(' + that.model.attributes.data.metadata.backdrop + ')');

						App.Streamer.getSubtitles(that.model.attributes.data.metadata, that.model.attributes.data.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase(), 'movie');

					}
				}).catch(function (err) {
					win.warn(err);
				});

				break;
			default:
				//defualt none?
			}

		}

	});

	App.View.Loading = Loading;
})(window.App);