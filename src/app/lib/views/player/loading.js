(function (App) {
	'use strict';
	var updateInfo;
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

			title: '.title',
			player: '.player-name',
			streaming: '.external-play',
			controls: '.player-controls',
			cancel_button: '.cancel-button'
		},

		events: {
			'click .cancel-button': 'cancelStreaming',
			'click .pause': 'pauseStreaming',
			'click .stop': 'stopStreaming',
			'click .play': 'resumeStreaming'
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

			this.ui.title.text(this.model.get('title'));

			this.StateUpdate();

		},
		StateUpdate: function () {
			var that = this;
			var BUFFERING_SIZE = 10 * 1024 * 1024;

			var update = function () {
				var streamInfo = App.streamer.streamInfo;
				if (streamInfo) {
					that.ui.seedStatus.css('visibility', 'visible');
					var downloaded = streamInfo.downloaded / (1024 * 1024);

					that.ui.progressTextDownload.text(downloaded.toFixed(2) + ' Mb');
					that.ui.progressTextPeers.text(streamInfo.active_peers);
					that.ui.progressTextSeeds.text(streamInfo.total_peers);

					var percent = streamInfo.downloaded / (BUFFERING_SIZE / 100);

					that.ui.downloadPercent.text(percent.toFixed() + '%');
					that.ui.downloadSpeed.text(streamInfo.downloadSpeed);
					that.ui.uploadSpeed.text(streamInfo.uploadSpeed);
					that.ui.progressbar.css('width', percent.toFixed() + '%');

					if (streamInfo.percent > 99) {
						clearInterval(updateInfo);
						if (that.model.get('player') && that.model.get('player').get('type') !== 'local') {
							that.ui.player.text(that.model.get('player').get('name'));
							that.ui.streaming.css('visibility', 'visible');
						}
					}
				}
			};
			updateInfo = setInterval(update, 200);

		},

		cancelStreaming: function () {
			clearInterval(updateInfo);
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
		}
	});

	App.View.Loading = Loading;
})(window.App);