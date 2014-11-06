var torrentHealth = require('torrent-health');
var health_checked = false;

(function (App) {
		'use strict';

		var _this, bookmarked;
		var ShowDetail = Backbone.Marionette.ItemView.extend({
				template: '#show-detail-tpl',
				className: 'shows-container-contain',

				ui: {
					startStreaming: '#watch-now',
					qselector: '.quality-selector',
					qinfo: '.quality-info',
					bookmarkIcon: '.favourites-toggle'
				},

				events: {
					'click .favourites-toggle': 'toggleFavorite',
					'click .watched': 'toggleWatched',
					'click #watch-now': 'startStreaming',
					'click .close-icon': 'closeDetails',
					'click .tab-season': 'clickSeason',
					'click .tab-episode': 'clickEpisode',
					'click .show-imdb-link': 'openIMDb',
					'dblclick .tab-episode': 'dblclickEpisode',
					'click #switch-hd-on': 'enableHD',
					'click #switch-hd-off': 'disableHD',
					'click .health-icon': 'getTorrentHealth',
					'click .playerchoicemenu li a': 'selectPlayer',
					'click .rating-container-tv': 'switchRating'
				},

				toggleFavorite: function (e) {

					if (e.type) {
						e.preventDefault();
						e.stopPropagation();
					}
					var that = this;

					if (bookmarked !== true) {
						bookmarked = true;

						var provider = App.Providers.get(this.model.get('provider'));
						provider.detail(this.model.get('imdb_id'), this.model.attributes)
							.then(function (data) {

								App.Database.add('tvshows', data)
									.then(function () {
										App.userBookmarks.push(that.model.get('imdb_id'));
										return App.Database.add('bookmarks', {
											imdb_id: that.model.get('imdb_id'),
											type: 'tvshow'
										});
									})
									.then(function () {
										that.ui.bookmarkIcon.addClass('selected').text(i18n.__('Remove from bookmarks'));
										win.info('Bookmark added (' + that.model.get('imdb_id') + ')');
										that.model.set('bookmarked', true);
									});
							});

					} else {
						that.ui.bookmarkIcon.removeClass('selected').text(i18n.__('Add to bookmarks'));
						bookmarked = false;

						App.Database.delete('bookmarks', {
								imdb_id: this.model.get('imdb_id')
							})
							.then(function () {
								App.userBookmarks.splice(App.userBookmarks.indexOf(that.model.get('imdb_id')), 1);
								win.info('Bookmark deleted (' + that.model.get('imdb_id') + ')');
								// we'll make sure we dont have a cached movie
								return App.Database.delete('tvshows', {
									imdb_id: that.model.get('imdb_id')
								});
							})
							.then(function () {
								that.model.set('bookmarked', false);
							});
					}
				},


				initialize: function () {
					_this = this;

					//Handle keyboard shortcuts when other views are appended or removed

					//If a child was removed from above this view
					App.vent.on('viewstack:pop', function () {
						if (_.last(App.ViewStack) === _this.className) {
							_this.initKeyboardShortcuts();
						}
					});

					//If a child was added above this view
					App.vent.on('viewstack:push', function () {
						if (_.last(App.ViewStack) !== _this.className) {
							_this.unbindKeyboardShortcuts();
						}
					});
					App.vent.on('show:watched:' + this.model.id,
						_.bind(this.onWatched, this));
					App.vent.on('show:unwatched:' + this.model.id,
						_.bind(this.onUnWatched, this));

					var images = this.model.get('images');

					// TODO: Till we'll add metadata for Tvshow
					// We need to fix the fanart resize in the api

					//images.fanart = App.Providers.trakttv.resizeImage(images.fanart, '940');
					if ((ScreenResolution.SD || ScreenResolution.HD) && !ScreenResolution.Retina) {
						// Screen Resolution of 720p or less is fine to have 300x450px image
						images.poster = this.model.get('imageLowRes');
					}

					App.vent.on('shortcuts:show', function () {
						_this.initKeyboardShortcuts();
					});
				},

				initKeyboardShortcuts: function () {
					Mousetrap.bind(['esc', 'backspace'], _this.closeDetails);

					Mousetrap.bind('up', _this.previousEpisode);

					Mousetrap.bind('down', _this.nextEpisode);

					Mousetrap.bind(['ctrl+up', 'command+up'], _this.previousSeason);

					Mousetrap.bind(['ctrl+down', 'command+down'], _this.nextSeason);

					Mousetrap.bind(['enter', 'space'], _this.playEpisode);

					Mousetrap.bind('q', _this.toggleQuality);

					Mousetrap.bind('w', _this.toggleEpisodeWatched);
				},

				unbindKeyboardShortcuts: function () { // There should be a better way to do this
					Mousetrap.unbind(['esc', 'backspace']);

					Mousetrap.unbind('up');

					Mousetrap.unbind('down');

					Mousetrap.unbind(['ctrl+up', 'command+up']);

					Mousetrap.unbind(['ctrl+down', 'command+down']);

					Mousetrap.unbind(['enter', 'space']);

					Mousetrap.unbind('q');

					Mousetrap.unbind('w');
				},

				onShow: function () {
					App.Device.ChooserView('#player-chooser').render();
					bookmarked = App.userBookmarks.indexOf(this.model.get('imdb_id')) !== -1;

					if (bookmarked) {
						this.ui.bookmarkIcon.addClass('selected').text(i18n.__('Remove from bookmarks'));
					} else {
						this.ui.bookmarkIcon.removeClass('selected');
					}

					$('.star-container-tv,.show-imdb-link').tooltip();

					var cbackground = $('.tv-cover').attr('data-bgr');
					var coverCache = new Image();
					coverCache.src = cbackground;
					coverCache.onload = function () {
						$('.tv-cover')
							.css('background-image', 'url(' + cbackground + ')')
							.addClass('fadein');
						coverCache = null;
					};

					var background = $('.tv-poster-background').attr('data-bgr');
					var bgCache = new Image();
					bgCache.src = background;
					bgCache.onload = function () {
						$('.tv-poster-background')
							.css('background-image', 'url(' + background + ')')
							.addClass('fadein');
						bgCache = null;
					};


					this.selectNextEpisode();


					_this.initKeyboardShortcuts();

					if (App.Settings.get('ratingStars') === false) {
						$('.star-container-tv').addClass('hidden');
						$('.number-container-tv').removeClass('hidden');
					}

				},

				selectNextEpisode: function () {

					var episodesSeen = [];
					App.Database.find('watched', {
							tvdb_id: this.model.get('tvdb_id').toString()
						})
						.then(function (data) {
							_.each(data, function (value, state) {
								// we'll mark episode already watched
								_this.markWatched(value, true);
								// store all watched episode
								if (value) {
									episodesSeen.push(parseInt(value.season) * 100 +
										parseInt(value.episode));
								}
							});
							var season = 1;
							var episode = 1;
							if (episodesSeen.length > 0) {
								//get all episode
								var episodes = [];
								_.each(_this.model.get('episodes'),
									function (value, currentepisode) {
										episodes.push(parseInt(value.season) * 100 +
											parseInt(value.episode));
									}
								);
								episodesSeen.sort();
								episodes.sort();
								var first = episodes[0];
								var last = episodes[episodes.length - 1];
								var unseen = episodes.filter(function (item) {
									return episodesSeen.indexOf(item) === -1;
								});
								if (App.Settings.get('tv_detail_jump_to') !== 'firstUnwatched') {
									var lastSeen = episodesSeen[episodesSeen.length - 1];

									if (lastSeen !== episodes[episodes.length - 1]) {
										var idx;
										_.find(episodes, function (data, dataIdx) {
											if (data === lastSeen) {
												idx = dataIdx;
												return true;
											}
										});

										var next_episode = episodes[idx + 1];
										episode = next_episode % 100;
										season = (next_episode - episode) / 100;
									} else {
										episode = lastSeen % 100;
										season = (lastSeen - episode) / 100;
									}
								} else {
									//if all episode seend back to first
									//it will be the only one
									unseen.push(first);
									episode = unseen[0] % 100;
									season = (unseen[0] - episode) / 100;
								}


							}
							if (season === 1 && episode === 1) {
								// Workaround in case S01E01 doesn't exist in PT
								// Select the first possible season
								_this.selectSeason($('.tab-season:first'));
							} else {
								_this.selectSeason($('li[data-tab="season-' + season + '"]'));
								var $episode = $('#watched-' + season + '-' + episode).parent();
								_this.selectEpisode($episode);
								if (!_this.isElementVisible($episode[0])) {
									$episode[0].scrollIntoView(false);
								}
							}
						});
				},

				openIMDb: function () {
					gui.Shell.openExternal('http://www.imdb.com/title/' + this.model.get('imdb_id'));
				},

				switchRating: function () {
					if ($('.number-container-tv').hasClass('hidden')) {
						$('.number-container-tv').removeClass('hidden');
						$('.star-container-tv').addClass('hidden');
						App.Settings.set('ratingStars', false);
					} else {
						$('.number-container-tv').addClass('hidden');
						$('.star-container-tv').removeClass('hidden');
						App.Settings.set('ratingStars', true);
					}
				},

				toggleWatched: function (e) {
					var edata = e.currentTarget.id.split('-');
					var currentValue = {
						tvdb_id: _this.model.get('tvdb_id').toString(),
						imdb_id: _this.model.get('imdb_id').toString(),
						season: edata[1].toString(),
						episode: edata[2].toString(),
						from_browser: true
					};

					App.Database.get('watched', {
							tvdb_id: currentValue.tvdb_id.toString(),
							imdb_id: currentValue.imdb_id.toString(),
							season: currentValue.season.toString(),
							episode: currentValue.episode.toString()
						})
						.then(function (watched) {
							if (watched) {

								App.Database.find('watched', {
										tvdb_id: currentValue.tvdb_id
									})
									.then(function (response) {
										if (response.length === 1) {
											App.watchedShows.splice(App.watchedShows.indexOf(currentValue.imdb_id), 1);
										}
									})
									.then(function () {
										return App.Database.delete('watched', {
											tvdb_id: currentValue.tvdb_id.toString(),
											imdb_id: currentValue.imdb_id.toString(),
											season: currentValue.season.toString(),
											episode: currentValue.episode.toString()
										});
									})
									.then(function () {
										App.vent.trigger('show:unwatched:' + currentValue.tvdb_id, currentValue);
									});

							} else {

								App.Database.find('watched', {
										tvdb_id: currentValue.tvdb_id
									})
									.then(function (response) {
										if (response.length === 0) {
											App.watchedShows.push(currentValue.imdb_id.toString());
										}
									})
									.then(function () {
										return App.Database.add('watched', {
											tvdb_id: currentValue.tvdb_id.toString(),
											imdb_id: currentValue.imdb_id.toString(),
											season: currentValue.season.toString(),
											episode: currentValue.episode.toString(),
											type: 'episode',
											date: new Date()
										})
									})
									.then(function () {
										App.vent.trigger('show:watched:' + currentValue.tvdb_id, currentValue);
									});
							}
						});

				},

				onWatched: function (value, channel) {
					this.markWatched(value, true);

					this.selectNextEpisode();
				},

				onUnWatched: function (value, channel) {
					this.markWatched(value, false);
				},

				markWatched: function (value, state) {
					state = (state === undefined) ? true : state;
					// we should never get any shows that aren't us, but you know, just in case.
					if (value.tvdb_id === _this.model.get('tvdb_id')) {
						$('#watched-' + value.season + '-' + value.episode).toggleClass('true', state);
					} else {
						console.error('something fishy happened with the watched signal', this.model, value);
					}
				},

				startStreaming: function (e) {

					if (e.type) {
						e.preventDefault();
					}
					var that = this;
					var title = that.model.get('title');
					var episode = $(e.currentTarget).attr('data-episode');
					var season = $(e.currentTarget).attr('data-season');
					var name = $(e.currentTarget).attr('data-title');

					title += ' - ' + i18n.__('Season') + ' ' + season + ', ' + i18n.__('Episode') + ' ' + episode + ' - ' + name;
					var epInfo = {
						type: 'tvshow',
						videotype: 'video/mp4',
						imdbid: that.model.get('imdb_id'),
						tvdbid: that.model.get('tvdb_id'),
						season: season,
						episode: episode
					};


					var episodes = [];
					var episodes_data = [];
					var selected_quality = $(e.currentTarget).attr('data-quality');
					var auto_play = false;

					if (App.Settings.get('playNextEpisodeAuto')) {
						_.each(this.model.get('episodes'), function (value) {
							var epaInfo = {
								id: parseInt(value.season) * 100 + parseInt(value.episode),
								backdrop: that.model.get('images').fanart,
								defaultSubtitle: App.Settings.get('subtitle_language'),
								episode: value.episode,
								season: value.season,
								title: that.model.get('title') + ' - ' + i18n.__('Season') + ' ' + value.season + ', ' + i18n.__('Episode') + ' ' + value.episode + ' - ' + value.title,
								torrents: value.torrents,
								extract_subtitle: {
									type: 'tvshow',
									imdbid: that.model.get('imdb_id'),
									tvdbid: value.tvdb_id,
									season: value.season,
									episode: value.episode
								},
								tvdb_id: value.tvdb_id,
								imdb_id: that.model.get('imdb_id'),
								device: App.Device.Collection.selected,
								cover: that.model.get('images').poster,
								status: that.model.get('status'),
								type: 'episode'
							};
							episodes_data.push(epaInfo);
							episodes.push(parseInt(value.season) * 100 + parseInt(value.episode));
						});
						episodes.sort();
						episodes_data = _.sortBy(episodes_data, 'id');

						if (parseInt(season) * 100 + parseInt(episode) !== episodes[episodes.length - 1]) {
							auto_play = true;
						}

					} else {
						episodes_data = null;
					}


					var torrentStart = {
						torrent: $(e.currentTarget).attr('data-torrent'),
						backdrop: that.model.get('images').fanart,
						type: 'episode',
						tvdb_id: that.model.get('tvdb_id'),
						imdb_id: that.model.get('imdb_id'),
						episode: episode,
						season: season,
						title: title,
						status: that.model.get('status'),
						extract_subtitle: epInfo,
						quality: $(e.currentTarget).attr('data-quality'),
						defaultSubtitle: App.Settings.get('subtitle_language'),
						device: App.Device.Collection.selected,
						cover: that.model.get('images').poster,
						episodes: episodes,
						auto_play: auto_play,
						auto_play_id: parseInt(season) * 100 + parseInt(episode),
						auto_play_data: episodes_data
					};
				win.info('Playing next episode automatically:', App.Settings.get('playNextEpisodeAuto'));

				_this.unbindKeyboardShortcuts();
				App.vent.trigger('streamer:start', torrentStart);
			},

			closeDetails: function (e) {
				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}
				_this.unbindKeyboardShortcuts();
				App.vent.trigger('show:closeDetail');
			},

			clickSeason: function (e) {
				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}
				this.selectSeason($(e.currentTarget));
			},

			clickEpisode: function (e) {
				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}
				this.selectEpisode($(e.currentTarget));
			},

			dblclickEpisode: function (e) {
				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}
				this.selectEpisode($(e.currentTarget));
				$('.startStreaming').trigger('click');
			},
			// Helper Function
			selectSeason: function ($elem) {
				$('.tab-season.active').removeClass('active');
				$elem.addClass('active');
				$('.tab-episodes').hide();
				$('.tab-episodes.current').removeClass('current');
				$('.tab-episode.active').removeClass('active');
				$('.tab-episodes.' + $elem.attr('data-tab')).addClass('current').scrollTop(0).show(); //pull the scroll always to top to
				this.selectEpisode($('.tab-episodes.' + $elem.attr('data-tab') + ' li:first'));
			},

			selectEpisode: function ($elem) {
				if ($elem.length === 0) {
					return;
				}
				var tvdbid = $elem.attr('data-id');
				var torrents = {};
				torrents.q480 = $('.template-' + tvdbid + ' .q480').text();
				torrents.q720 = $('.template-' + tvdbid + ' .q720').text();
				torrents.quality = '480p';
				if (torrents.q720 !== '') {
					torrents.def = torrents.q720;
					torrents.quality = '720p';
				} else {
					torrents.def = torrents.q480;
				}
				if (torrents.q480 !== '' && torrents.q720 !== '') {
					if ($('#switch-hd-off').is(':checked')) {
						torrents.def = torrents.q480;
						torrents.quality = '480p';
					}
					this.ui.qselector.show();
					this.ui.qinfo.hide();
				} else if (torrents.q720 !== '') {
					this.ui.qselector.hide();
					this.ui.qinfo.text('720p');
					this.ui.qinfo.show();
				} else {
					this.ui.qselector.hide();
					this.ui.qinfo.text('480p');
					this.ui.qinfo.show();
				}

				_this.resetHealth();

				$('.tab-episode.active').removeClass('active');
				$elem.addClass('active');
				$('.episode-info-number').text(i18n.__('Season') + ' ' + $('.template-' + tvdbid + ' .season').html() + ', ' + i18n.__('Episode') + ' ' + $('.template-' + tvdbid + ' .episode').html());
				$('.episode-info-title').text($('.template-' + tvdbid + ' .title').text());
				$('.episode-info-date').text(i18n.__('Aired Date') + ': ' + $('.template-' + tvdbid + ' .date').html());
				$('.episode-info-description').text($('.template-' + tvdbid + ' .overview').text());

				//pull the scroll always to top
				$('.episode-info-description').scrollTop(0);

				$('.startStreaming').attr('data-torrent', torrents.def);
				$('.startStreaming').attr('data-quality', torrents.quality);
				$('.startStreaming').attr('data-episodeid', tvdbid);

				// set var for player
				$('.startStreaming').attr('data-episode', $('.template-' + tvdbid + ' .episode').html());
				$('.startStreaming').attr('data-season', $('.template-' + tvdbid + ' .season').html());
				$('.startStreaming').attr('data-title', $('.template-' + tvdbid + ' .title').html());

				this.ui.startStreaming.show();
			},

			enableHD: function () {
				win.info('HD Enabled');
				var tvdbid = $('.startStreaming').attr('data-episodeid'),
					torrent = $('.template-' + tvdbid + ' .q720').text();
				$('.startStreaming').attr('data-torrent', torrent);
				$('.startStreaming').attr('data-quality', '720p');
				_this.resetHealth();
				win.debug(torrent);
			},

			disableHD: function () {
				win.info('HD Disabled');
				var tvdbid = $('.startStreaming').attr('data-episodeid'),
					torrent = $('.template-' + tvdbid + ' .q480').text();
				$('.startStreaming').attr('data-torrent', torrent);
				$('.startStreaming').attr('data-quality', '480p');
				_this.resetHealth();
				win.debug(torrent);
			},

			nextEpisode: function (e) {
				var index = $('.tab-episode.active').index();
				if (index === $('.tab-episode:visible').length - 1) {
					return;
				}
				var $nextEpisode = $('.tab-episode:visible').eq(++index);
				_this.selectEpisode($nextEpisode);
				if (!_this.isElementVisible($nextEpisode[0])) {
					$nextEpisode[0].scrollIntoView(false);
				}

				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}

			},

			previousEpisode: function (e) {
				var index = $('.tab-episode.active').index();
				if (index === 0) {
					return;
				}
				var $prevEpisode = $('.tab-episode:visible').eq(--index);
				_this.selectEpisode($prevEpisode);
				if (!_this.isElementVisible($prevEpisode[0])) {
					$prevEpisode[0].scrollIntoView(true);
				}

				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}

			},

			nextSeason: function (e) {
				var index = $('.tab-season.active').index();
				if (index === $('.tab-season').length - 1) {
					return;
				}
				var $nextSeason = $('.tab-season').eq(++index);
				_this.selectSeason($nextSeason);
				if (!_this.isElementVisible($nextSeason[0])) {
					$nextSeason[0].scrollIntoView(false);
				}

				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}
			},

			previousSeason: function (e) {
				var index = $('.tab-season.active').index();
				if (index === 0) {
					return;
				}
				var $prevSeason = $('.tab-season').eq(--index);
				_this.selectSeason($prevSeason);
				if (!_this.isElementVisible($prevSeason[0])) {
					$prevSeason[0].scrollIntoView(true);
				}

				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}

			},

			playEpisode: function (e) {
				$('.startStreaming').trigger('click');

				if (e.type) {
					e.preventDefault();
					e.stopPropagation();
				}
			},

			toggleQuality: function (e) {

				if ($('.quality').is(':visible')) {
					if ($('#switch-hd-off').is(':checked')) {
						$('#switch-hd-on').trigger('click');
					} else {
						$('#switch-hd-off').trigger('click');
					}
					_this.resetHealth();
				}

			},

			toggleEpisodeWatched: function (e) {
				var data = {};
				data.currentTarget = $('.tab-episode.active .watched')[0];
				_this.toggleWatched(data);
			},


			isElementVisible: function (el) {
				var eap,
					rect = el.getBoundingClientRect(),
					docEl = document.documentElement,
					vWidth = window.innerWidth || docEl.clientWidth,
					vHeight = window.innerHeight || docEl.clientHeight,
					efp = function (x, y) {
						return document.elementFromPoint(x, y);
					},
					contains = 'contains' in el ? 'contains' : 'compareDocumentPosition',
					has = contains === 'contains' ? 1 : 0x14;

				// Return false if it's not in the viewport
				if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) {
					return false;
				}

				// Return true if any of its four corners are visible
				return (
					(eap = efp(rect.left, rect.top)) === el || el[contains](eap) === has || (eap = efp(rect.right, rect.top)) === el || el[contains](eap) === has || (eap = efp(rect.right, rect.bottom)) === el || el[contains](eap) === has || (eap = efp(rect.left, rect.bottom)) === el || el[contains](eap) === has
				);
			},

			getTorrentHealth: function (e) {
				if (health_checked) {
					return;
				}
				var torrent = $('.startStreaming').attr('data-torrent');
				health_checked = true;
				$('.health-icon')
					.removeClass('fa-circle')
					.addClass('fa-spinner')
					.addClass('fa-spin');
				torrentHealth(torrent)
					.then(function (res) {
						var h = Common.calcHealth({
							seed: res.seeds,
							peer: res.peers
						});
						var health = Common.healthMap[h].capitalize();
						var ratio = res.peers > 0 ? res.seeds / res.peers : +res.seeds;

						$('.health-icon').tooltip({
								html: true
							})
							.removeClass('fa-spin')
							.removeClass('fa-spinner')
							.addClass('fa-circle')
							.removeClass('Bad Medium Good Excellent')
							.addClass(health)
							.attr('data-original-title', i18n.__('Health ' + health) + ' - ' + i18n.__('Ratio:') + ' ' + ratio.toFixed(2) + ' <br> ' + i18n.__('Seeds:') + ' ' + res.seeds + ' - ' + i18n.__('Peers:') + ' ' + res.peers)
							.tooltip('fixTitle');
					});
			},

			resetHealth: function () {
				$('.health-icon').tooltip({
						html: true
					})
					.removeClass('fa-spin')
					.removeClass('fa-spinner')
					.addClass('fa-circle')
					.removeClass('Bad Medium Good Excellent')
					.attr('data-original-title', i18n.__('Health Unknown'))
					.tooltip('fixTitle');
				health_checked = false;
			},

			selectPlayer: function (e) {
				var player = $(e.currentTarget).parent('li').attr('id').replace('player-', '');
				_this.model.set('device', player);
			},


		});

	App.View.ShowDetail = ShowDetail;
})(window.App);
