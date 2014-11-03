/* globals moment*/
(function(App) {
	'use strict';
	var Q = require('q');
	
	

	var Watchlist = function() {
		this.inhibited = false;
	};

	Watchlist.prototype.constructor = Watchlist;

	var queryTorrents = function(filters) {
		var now = moment();

		//Checked when last fetched
		var doc = App.Settings.get('watchlist-fetched');

		if (doc) {
			var d = moment.unix(doc);

			if (Math.abs(now.diff(d, 'days')) >= 1) {
				win.info('Watchlist - Last fetched more than 1 day');
				App.Settings.set('watchlist-fetched', now.unix());
				return fetchWatchlist(true);
			} else {
				win.info('Watchlist - Last fetch is fresh');
				return fetchWatchlist(false);
			}
		} else {
			win.info('Watchlist - No last fetch, fetch again');
			App.Settings.set('watchlist-fetched', now.unix());
			return fetchWatchlist(true);
		}

	};

	function fetchWatchlist(update) {
		var Trakt = App.Providers.get('trakttv');
		var deferred = Q.defer();
		var doc = App.Settings.get('watchlist');
		if (doc && !update) {
			win.info('Watchlist - Returning cached watchlist');
			deferred.resolve(doc || []);
		} else {
			win.info('Watchlist - Fetching new watchlist');
			Trakt.show.getProgress()
				.then(function(data) {
					App.Settings.set('watchlist', data);
					deferred.resolve(data || []);
				})
				.catch(function(error) {
					deferred.reject(error);
				});
		}


		return deferred.promise;
	};

	var filterShows = function(items) {
		var filtered = [];
		items.forEach(function(show) {
			var deferred = Q.defer();
			//If has no next episode or next episode is not aired, go to next one
			if (!show.next_episode || (Math.round(new Date().getTime() / 1000) < show.next_episode.first_aired)) {
				return;
			}

			//Check if not seen on local DB
			var episode = {
				tvdb_id: show.show.tvdb_id.toString(),
				show_imdb_id: show.show.imdb_id.toString(),
				season: show.next_episode.season.toString(),
				episode: show.next_episode.number.toString()
			};

			App.Database.find('watched',episode)
				.then(function(watched) {
					if (watched.length !== 0) {
						deferred.resolve(null);
					} else {
						deferred.resolve(show);
					}
				});

			filtered.push(deferred.promise);
		});

		return Q.allSettled(filtered);
	};

	var formatForPopcorn = function(items) {
		var showList = [];
		var Eztv = App.Providers.get('eztv');
		items.forEach(function(show) {
			show = show.value;
			if (show === null) {
				return;
			}

			var deferred = Q.defer();
			//Try to find it on the shows database and attach the next_episode info
			App.Database.get('tvshows', {imdb_id: show.show.imdb_id})
				.then(function(data) {
					if (data != null) {
						data.type = 'show';
						data.image = data.images.poster;
						data.imdb = data.imdb_id;
						data.next_episode = show.next_episode;
						// Fallback for old bookmarks without provider in database
						if (typeof(data.provider) === 'undefined') {
							data.provider = 'Eztv';
						}
						deferred.resolve(data);
					} else {
						//If not found, then get the details from Eztv and add it to the DB
						data = Eztv.detail(show.show.imdb_id, show)
							.then(function(data) {
								if (data) {
									data.provider = 'Eztv';
									data.type = 'show';
									data.next_episode = show.next_episode;

									App.Database.add('tvshows', data)
										.then(function(idata) {
											deferred.resolve(data);
										});
								} else {
									deferred.resolve(false);
								}
							})
							.catch(function(error) {
								win.error('Error getting Eztv info for show', show.show.imdb_id);
								deferred.resolve(false);
							});
					}
				});
			showList.push(deferred.promise);
		});

		return Q.all(showList)
			.then(function(res) {
				return {
					results: _.filter(res, Boolean),
					hasMore: false
				};
			});
	};

	Watchlist.prototype.extractIds = function(items) {
		return _.pluck(items, 'imdb_id');
	};

	Watchlist.prototype.fetch = function(filters) {
		return queryTorrents(filters)
			.then(filterShows)
			.then(formatForPopcorn);
	};

	Watchlist.prototype.detail = function(torrent_id, old_data, callback) {
		var Eztv = App.Providers.get('eztv');
		return Eztv.detail(torrent_id, old_data, callback);
	};

	Watchlist.prototype.inhibit = function(flag) {
		win.info('Watchlist - inhibit: ', flag);

		this.inhibited = flag;
	};

	Watchlist.prototype.fetchWatchlist = function() {
		var Trakt = App.Providers.get('trakttv');
		if (this.inhibited) {
			return Q(true);
		}

		var deferred = Q.defer();
		win.info('Watchlist - Fetching new watchlist');
		Trakt.show.getProgress()
			.then(function(data) {
				App.Settings.set('watchlist', data);
				deferred.resolve(data || []);
			})
			.catch(function(error) {
				deferred.reject(error);
			});

		return deferred.promise;
	};

	App.Providers.Watchlist = Watchlist;

})(window.App);
