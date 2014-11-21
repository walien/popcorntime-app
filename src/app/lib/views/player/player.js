(function (App) {
	'use strict';

	var Player = Backbone.Marionette.ItemView.extend({
		template: '#player-tpl',
		className: 'player',
		player: null,

		ui: {
			eyeInfo: '.eye-info-player',
			downloadSpeed: '.download_speed_player',
			uploadSpeed: '.upload_speed_player',
			activePeers: '.active_peers_player',
			percentCompleted: '.percent_completed',
			title: '.player-title'
		},

		events: {
			'click .close-info-player': 'closePlayer',
			'click .playnownext': 'playNextNow',
			'click .vjs-fullscreen-control': 'toggleFullscreen',
			'click .vjs-subtitles-button': 'toggleSubtitles'
		},

		templateHelpers: {

			streamUrl: function () {
				if (this.type === 'trailer') {
					return this.trailerSrc;
				} else {
					return App.Streamer.getStreamUrl();
				}
			},

			subtitles: function () {

				var subtracks = '';
				var subArray = [];
				var defaultSubtitle = this.defaultSubtitle;

				for (var lang in this.subtitle) {
					var langcode = lang === 'pb' ? 'pt-br' : lang;
					subArray.push({
						'language': langcode,
						'default': (defaultSubtitle === langcode ? 'default' : ''),
						'languageName': (App.Localization.langcodes[langcode] !== undefined ? App.Localization.langcodes[langcode].nativeName : langcode),
						'src': this.subtitle[lang]
					});
				}
				subArray.sort(function (sub1, sub2) {
					return sub1.language > sub2.language;
				});

				return subArray;
			}
		},

		initialize: function () {
			this.video = false;
			this.inFullscreen = win.isFullscreen;

			this.Trakt = App.Providers.get('trakttv');

		},

		closePlayer: function () {
			var that = this;
			win.info('Player closed');
			if (this._WatchingTimer) {
				clearInterval(this._WatchingTimer);
			}
			if (this._AutoPlayCheckTimer) {
				clearInterval(this._AutoPlayCheckTimer);
			}
			// Check if >80% is watched to mark as watched by user  (maybe add value to settings
			var type = this.model.get('type');

			if (type !== 'trailer') {
				if (this.video.currentTime() / this.video.duration() >= 0.8) {
					App.vent.trigger(type + ':watched', this.model.attributes, 'scrobble');
				} else {
					if (type === 'episode') {
						this.Trakt.show.cancelWatching();
					} else {
						this.Trakt[type].cancelWatching();
					}

				}

			}

			try {
				this.video.dispose();
			} catch (e) {
				// Stop weird Videojs errors
			}

			App.vent.trigger('player:close');
			App.vent.trigger('preload:stop');

		},

		onShow: function () {


			this.prossessType();
			this.setUI();
			this.setPlayerEvents();
			this.bindKeyboardShortcuts();
			console.log(this.model.get('type'));

		},

		prossessType: function () {
			var that = this;
			if (this.model.get('type') === 'trailer') {

				$('<div/>').appendTo('#main-window').addClass('trailer_mouse_catch'); // XXX Sammuel86 Trailer UI Show FIX/HACK

				this.video = videojs('video_player', {
					techOrder: ['youtube'],
					forceSSL: true,
					ytcontrols: false,
					quality: '720p'
				}).ready(function () {
					this.addClass('vjs-has-started');
				});
				this.ui.eyeInfo.hide();

				$('.trailer_mouse_catch').show().mousemove(function (event) { // XXX Sammuel86 Trailer UI Show FIX/HACK
					if (!that.player.userActive()) {
						that.player.userActive(true);
					}
				});
				$('.trailer_mouse_catch').click(function () { // XXX Sammuel86 Trailer UI Show FIX/HACK
					$('.vjs-play-control').click();
				});


			} else {
				this.video = videojs('video_player', {
					nativeControlsForTouch: false,
					trackTimeOffset: 0,
					plugins: {
						biggerSubtitle: {},
						smallerSubtitle: {},
						customSubtitles: {},
						progressTips: {}
					}
				});
			}

			var player = this.video.player();
			this.player = player;

			/* The following is a hack to make VideoJS listen to
               mouseup instead of mousedown for pause/play on the
               video element. Stops video pausing/playing when
               dragged. TODO: #fixit! /XC                        */
			this.player.tech.off('mousedown');
			this.player.tech.on('mouseup', function (event) {
				if (event.target.origEvent) {
					if (!event.target.origEvent.originalEvent.defaultPrevented) {
						that.player.tech.onClick(event);
					}
					// clean up after ourselves
					delete event.target.origEvent;
				} else {
					that.player.tech.onClick(event);
				}
			});
			// Force custom controls
			player.usingNativeControls(false);

		},


		setUI: function () {
			this.ui.title.text(this.model.attributes.metadata.title);
			this.player = this.video.player();

			this.player.usingNativeControls(false);

			$('.player-header-background').appendTo('div#video_player');

			$('li:contains("subtitles off")').text(i18n.__('Disabled'));

			$('#header').removeClass('header-shadow').hide();
			// Test to make sure we have title

			$('.filter-bar').show();
			$('#player_drag').show();

			App.vent.trigger('player:ready', {});

		},


		setPlayerEvents: function () {
			var that = this;
			var type = this.model.get('type');
			this.player.on('error', function (error) {
				if (type === 'movie') {
					that.Trakt.movie.cancelWatching();
				} else {
					that.Trakt.show.cancelWatching();
				}
				// TODO: user errors
				if (type === 'trailer') {
					setTimeout(function () {
						App.vent.trigger('player:close');
					}, 2000);
				}
				win.error('video.js error code: ' + $('#video_player').get(0).player.error().code, $('#video_player').get(0).player.error());
			});


			this.player.one('play', function () {
				that.player.one('durationchange', function () {
					that.sendToTrakt(that);
				});
				that._WatchingTimer = setInterval(that.sendToTrakt(that), 10 * 60 * 1000); // 10 minutes


				if (that.model.get('auto_play')) {
					that._AutoPlayCheckTimer = setInterval(that.checkAutoPlay(that), 10 * 100 * 1); // every 1 sec
				}

			});

			this.player.on('ended', function () {
				// For now close player. In future we will check if auto-play etc and get next episode

				if (that.model.get('auto_play')) {

					that.playNextNow();

				} else {
					that.closePlayer();
				}

			});

			// Double Click to toggle Fullscreen
			$('#video_player').dblclick(function (event) {
				that.toggleFullscreen();
				// Stop any mouseup events pausing video
				event.preventDefault();
			});

			if (this.model.get('type') !== 'trailer') {
				$('.eye-info-player').mouseenter(function () {
					that.refreshStreamStats();
				});
				this.refreshStreamStats();
			}


		},

		sendToTrakt: function (_this) {
			_this = _this || this;
			if (_this.model.get('type') === 'movie') {
				win.debug('Reporting we are watching ' + _this.model.get('imdb_id') + ' ' + (_this.video.currentTime() / _this.video.duration() * 100 | 0) + '% ' + (_this.video.duration() / 60 | 0));
				_this.Trakt.movie.watching(_this.model.get('imdb_id'), _this.video.currentTime() / _this.video.duration() * 100 | 0, _this.video.duration() / 60 | 0);
			} else {
				win.debug('Reporting we are watching ' + _this.model.get('tvdb_id') + ' ' + (_this.video.currentTime() / _this.video.duration() * 100 | 0) + '%');
				_this.Trakt.show.watching(_this.model.get('tvdb_id'), _this.model.get('season'), _this.model.get('episode'), _this.video.currentTime() / _this.video.duration() * 100 | 0, _this.video.duration() / 60 | 0);
			}
		},

		checkAutoPlay: function (_this) {
			if (this.model.get('type') !== 'movie' && this.next_episode_model) {
				if ((this.video.duration() - this.video.currentTime()) < 60 && this.video.currentTime() > 30) {

					if (!this.autoplayisshown) {

						if (!this.precachestarted) {
							App.vent.trigger('preload:start', this.next_episode_model);
							this.precachestarted = true;
						}

						console.log('Showing Auto Play message');
						this.autoplayisshown = true;
						$('.playing_next').show();
						$('.playing_next').appendTo('div#video_player');
						if (!this.player.userActive()) {
							this.player.userActive(true);
						}
					}

					var count = Math.round(this.video.duration() - this.video.currentTime());
					$('.playing_next span').text(count + ' ' + i18n.__('Seconds'));

				} else {
					if (this.autoplayisshown) {
						console.log('Hiding Auto Play message');
						$('.playing_next').hide();
						$('.playing_next span').text('');
						this.autoplayisshown = false;
					}
				}
			}
		},
		refreshStreamStats: function () {
			App.Streamer.updateInfo();

			this.ui.downloadSpeed.text(App.Streamer.streamInfo.prettyDownloadSpeed);
			this.ui.uploadSpeed.text(App.Streamer.streamInfo.prettyUploadSpeed);
			this.ui.activePeers.text(App.Streamer.streamInfo.active_peers);
			var percent = App.Streamer.streamInfo.progress;
			percent = percent.toFixed();
			if (percent === 0) {
				percent = 1;
			}
			this.ui.percentCompleted.text(percent + '%');
		},
		isMovie: function () {
			return this.model.get('tvdb_id') === undefined;
		},
		playNextNow: function () {

			var that = this;
			win.info('Player closed');
			if (this._WatchingTimer) {
				clearInterval(this._WatchingTimer);
			}
			if (this._AutoPlayCheckTimer) {
				clearInterval(this._AutoPlayCheckTimer);
			}
			// Check if >80% is watched to mark as watched by user  (maybe add value to settings
			var type = (this.isMovie() ? 'movie' : 'show');
			if (this.video.currentTime() / this.video.duration() >= 0.8) {
				App.vent.trigger(type + ':watched', this.model.attributes, 'scrobble');
			} else {
				this.Trakt[type].cancelWatching();
			}

			try {
				this.video.dispose();
			} catch (e) {
				// Stop weird Videojs errors
			}

			//XXX(xaiki): hack, don't touch fs state
			that.dontTouchFS = true;

			App.vent.trigger('preload:stop');
			App.vent.trigger('player:close');
			App.vent.trigger('stream:start', next_episode_model);

		},
		prossessNext: function () {
			var episodes = _this.model.get('episodes');

			if (_this.model.get('auto_id') !== episodes[episodes.length - 1]) {

				var auto_play_data = _this.model.get('auto_play_data');
				var current_quality = _this.model.get('quality');
				var idx;

				_.find(auto_play_data, function (data, dataIdx) {
					if (data.id === _this.model.get('auto_id')) {
						idx = dataIdx;
						return true;
					}
				});
				var next_episode = auto_play_data[idx + 1];

				next_episode.auto_play = true;
				next_episode.auto_id = parseInt(next_episode.season) * 100 + parseInt(next_episode.episode);
				next_episode.auto_play_data = auto_play_data;
				next_episode.episodes = episodes;
				next_episode.quality = current_quality;

				if (next_episode.torrents[current_quality].url) {
					next_episode.torrent = next_episode.torrents[current_quality].url;
				} else {
					next_episode.torrent = next_episode[next_episode.torrents.length - 1].url; //select highest quality available if user selected not found
				}

				next_episode_model = new Backbone.Model(next_episode);
			}
		},
		bindKeyboardShortcuts: function () {
			var _this = this;

			// add ESC toggle when full screen, go back when not
			Mousetrap.bind('esc', function (e) {
				_this.nativeWindow = require('nw.gui').Window.get();

				if (_this.nativeWindow.isFullscreen) {
					_this.leaveFullscreen();
				} else {
					_this.closePlayer();
				}
			});

			Mousetrap.bind('backspace', function (e) {
				_this.closePlayer();
			});

			Mousetrap.bind(['f', 'F'], function (e) {
				_this.toggleFullscreen();
			});

			Mousetrap.bind('h', function (e) {
				_this.adjustSubtitleOffset(-0.1);
			});

			Mousetrap.bind('g', function (e) {
				_this.adjustSubtitleOffset(0.1);
			});

			Mousetrap.bind('shift+h', function (e) {
				_this.adjustSubtitleOffset(-1);
			});

			Mousetrap.bind('shift+g', function (e) {
				_this.adjustSubtitleOffset(1);
			});

			Mousetrap.bind('ctrl+h', function (e) {
				_this.adjustSubtitleOffset(-5);
			});

			Mousetrap.bind('ctrl+g', function (e) {
				_this.adjustSubtitleOffset(5);
			});

			Mousetrap.bind(['space', 'p'], function (e) {
				$('.vjs-play-control').click();
			});

			Mousetrap.bind('right', function (e) {
				_this.seek(10);
			});

			Mousetrap.bind('shift+right', function (e) {
				_this.seek(60);
			});

			Mousetrap.bind('ctrl+right', function (e) {
				_this.seek(600);
			});

			Mousetrap.bind('left', function (e) {
				_this.seek(-10);
			});

			Mousetrap.bind('shift+left', function (e) {
				_this.seek(-60);
			});

			Mousetrap.bind('ctrl+left', function (e) {
				_this.seek(-600);
			});

			Mousetrap.bind('up', function (e) {
				_this.adjustVolume(0.1);
			});

			Mousetrap.bind('shift+up', function (e) {
				_this.adjustVolume(0.5);
			});

			Mousetrap.bind('ctrl+up', function (e) {
				_this.adjustVolume(1);
			});

			Mousetrap.bind('down', function (e) {
				_this.adjustVolume(-0.1);
			});

			Mousetrap.bind('shift+down', function (e) {
				_this.adjustVolume(-0.5);
			});

			Mousetrap.bind('ctrl+down', function (e) {
				_this.adjustVolume(-1);
			});

			Mousetrap.bind(['m', 'M'], function (e) {
				_this.toggleMute();
			});

			Mousetrap.bind(['u', 'U'], function (e) {
				_this.displayStreamURL();
			});

			Mousetrap.bind('j', function (e) {
				_this.adjustPlaybackRate(-0.1, true);
			});

			Mousetrap.bind(['k', 'shift+k', 'ctrl+k'], function (e) {
				_this.adjustPlaybackRate(1.0, false);
			});

			Mousetrap.bind(['l'], function (e) {
				_this.adjustPlaybackRate(0.1, true);
			});

			Mousetrap.bind(['shift+j', 'ctrl+j'], function (e) {
				_this.adjustPlaybackRate(0.5, false);
			});

			Mousetrap.bind('shift+l', function (e) {
				_this.adjustPlaybackRate(2.0, false);
			});

			Mousetrap.bind('ctrl+l', function (e) {
				_this.adjustPlaybackRate(4.0, false);
			});

			Mousetrap.bind('ctrl+d', function (e) {
				_this.toggleMouseDebug();
			});

			document.addEventListener('mousewheel', _this.mouseScroll);
		},

		unbindKeyboardShortcuts: function () {
			var _this = this;

			Mousetrap.unbind('esc');

			Mousetrap.unbind('backspace');

			Mousetrap.unbind(['f', 'F']);

			Mousetrap.unbind('h');

			Mousetrap.unbind('g');

			Mousetrap.unbind('shift+h');

			Mousetrap.unbind('shift+g');

			Mousetrap.unbind('ctrl+h');

			Mousetrap.unbind('ctrl+g');

			Mousetrap.unbind(['space', 'p']);

			Mousetrap.unbind('right');

			Mousetrap.unbind('shift+right');

			Mousetrap.unbind('ctrl+right');

			Mousetrap.unbind('left');

			Mousetrap.unbind('shift+left');

			Mousetrap.unbind('ctrl+left');

			Mousetrap.unbind('up');

			Mousetrap.unbind('shift+up');

			Mousetrap.unbind('ctrl+up');

			Mousetrap.unbind('down');

			Mousetrap.unbind('shift+down');

			Mousetrap.unbind('ctrl+down');

			Mousetrap.unbind(['m', 'M']);

			Mousetrap.unbind(['u', 'U']);

			Mousetrap.unbind(['j', 'shift+j', 'ctrl+j']);

			Mousetrap.unbind(['k', 'shift+k', 'ctrl+k']);

			Mousetrap.unbind(['l', 'shift+l', 'ctrl+l']);

			Mousetrap.unbind('ctrl+d');

			document.removeEventListener('mousewheel', _this.mouseScroll);
		},

		toggleMouseDebug: function () {
			if (this.player.debugMouse_) {
				this.player.debugMouse_ = false;
				this.displayOverlayMsg('Mouse debug disabled');
			} else {
				this.player.debugMouse_ = true;
				this.displayOverlayMsg('Mouse debug enabled. Dont touch the mouse until disabled.');
			}
		},

		seek: function (s) {
			var t = this.player.currentTime();
			this.player.currentTime(t + s);
			this.player.trigger('mousemove'); //hack, make controls show
			App.vent.trigger('seekchange');
		},

		mouseScroll: function (e) {
			if ($(e.target).parents('.vjs-subtitles-button').length) {
				return;
			}
			if (event.wheelDelta > 0) { // Scroll up
				_this.adjustVolume(0.1);
			} else { // Scroll down
				_this.adjustVolume(-0.1);
			}
		},

		adjustVolume: function (i) {
			var v = this.player.volume();
			this.player.volume(v + i);
			this.displayOverlayMsg(i18n.__('Volume') + ': ' + this.player.volume().toFixed(1) * 100 + '%');
			App.vent.trigger('volumechange');
		},

		toggleMute: function () {
			this.player.muted(!this.player.muted());
		},

		toggleFullscreen: function () {

			this.nativeWindow = require('nw.gui').Window.get();

			if (this.nativeWindow.isFullscreen) {
				this.player.isFullscreen(false);
				this.nativeWindow.leaveFullscreen();
				this.nativeWindow.focus();
			} else {
				this.player.isFullscreen(true);
				this.nativeWindow.enterFullscreen();
				this.nativeWindow.focus();
			}

			this.player.trigger('fullscreenchange');
		},

		toggleSubtitles: function () {},

		leaveFullscreen: function () {
			this.nativeWindow = require('nw.gui').Window.get();

			if (this.nativeWindow.isFullscreen) {
				this.player.isFullscreen(false);
				this.player.trigger('fullscreenchange');
				this.nativeWindow.leaveFullscreen();
				this.nativeWindow.focus();
			}
		},

		displayStreamURL: function () {
			var clipboard = require('nw.gui').Clipboard.get();
			clipboard.set($('#video_player video').attr('src'), 'text');
			this.displayOverlayMsg(i18n.__('URL of this stream was copied to the clipboard'));
		},

		adjustSubtitleOffset: function (s) {
			var o = this.player.options()['trackTimeOffset'];
			this.player.options()['trackTimeOffset'] = (o + s);
			this.displayOverlayMsg(i18n.__('Subtitles Offset') + ': ' + (-this.player.options()['trackTimeOffset'].toFixed(1)) + ' ' + i18n.__('secs'));
		},

		adjustPlaybackRate: function (rate, delta) {
			var nRate = delta ? this.player.playbackRate() + rate : rate;
			if (nRate > 0.49 && nRate < 4.01) {
				this.player.playbackRate(nRate);
				if (this.player.playbackRate() !== nRate) {
					this.displayOverlayMsg(i18n.__('Playback rate adjustment is not available for this video!'));
				} else {
					this.displayOverlayMsg(i18n.__('Playback rate') + ': ' + parseFloat(nRate.toFixed(1)) + 'x');
				}
			}
		},

		displayOverlayMsg: function (message) {
			if ($('.vjs-overlay').length > 0) {
				$('.vjs-overlay').text(message);
				clearTimeout($.data(this, 'overlayTimer'));
				$.data(this, 'overlayTimer', setTimeout(function () {
					$('.vjs-overlay').fadeOut('normal', function () {
						$(this).remove();
					});
				}, 3000));
			} else {
				$(this.player.el()).append('<div class =\'vjs-overlay vjs-overlay-top-left\'>' + message + '</div>');
				$.data(this, 'overlayTimer', setTimeout(function () {
					$('.vjs-overlay').fadeOut('normal', function () {
						$(this).remove();
					});
				}, 3000));
			}
		},

		onClose: function () {
			var _this = this;
			var type = this.model.get('type');
			if (type === 'trailer') { // XXX Sammuel86 Trailer UI Show FIX/HACK -START
				$('.trailer_mouse_catch').remove();
			}
			$('#player_drag').hide();
			$('#header').show();
			if (!this.dontTouchFS && !this.inFullscreen && win.isFullscreen) {
				win.leaveFullscreen();
			}
			_this.unbindKeyboardShortcuts();
			if (type !== 'trailer') {
				App.vent.trigger('streamer:stop');
			}
			if (this._WatchingTimer) {
				clearInterval(this._WatchingTimer);
			}
			if (this._AutoPlayCheckTimer) {
				clearInterval(this._AutoPlayCheckTimer);
			}
		}

	});
	App.View.Player = Player;
})(window.App);