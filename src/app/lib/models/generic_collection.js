(function (App) {
	'use strict';

	var Q = require('q');

	var PopCollection = Backbone.Collection.extend({
		popid: 'imdb_id',
		initialize: function (models, options) {
			this.providers = this.getProviders();

			options = options || {};
			options.filter = options.filter || new App.Model.Filter();

			this.filter = _.defaults(_.clone(options.filter.attributes), {
				page: 1
			});
			this.hasMore = true;

			Backbone.Collection.prototype.initialize.apply(this, arguments);
		},

		fetch: function () {
			var self = this;

			if (this.state === 'loading' && !this.hasMore) {
				return;
			}

			this.state = 'loading';
			self.trigger('loading', self);

			var subtitle = this.providers.subtitle;
			var metadata = this.providers.metadata;
			var torrents = this.providers.torrents;


			// Aggregate all torrents from providers
			var providerPromises = _.map(torrents, function (provider) {
				// Fetch torrents
				return provider
					.fetch(self.filter);
			});

			// Aggregate all ids from providers
			var providerIdPromises = _.map(providerPromises, function (provider, pid) {
				// Wait for the torrent provider
				return provider
					// Then extract the torrent/item IDs
					.then(_.bind(torrents[pid].extractIds, torrents[pid]));
			});

			// If has a metadata provider, fetch it
			var metadataFetchPromises;
			if (metadata) {
				metadataFetchPromises = _.map(providerIdPromises, function (provider) {
					// Waits for the IDs from the torrent provider
					return provider
					// Then fetch metadata from the provider

						.then(_.bind(metadata[self.type].listSummary, metadata));
				});
			} else {
				// Make sure anything depending on metadata
				// will fail when no metadata is being loaded
				metadataFetchPromises = [Q.reject()];
			}

			// If has a subtitle provider, fetch it
			var subtitlesFetchPromises;
			if (subtitle) {
				subtitlesFetchPromises = _.map(providerIdPromises, function (provider) {
					// Waits for the IDs from the torrent provider
					return provider
						// Then fetch subtitles from the provider
						.then(_.bind(subtitle.fetch, subtitle));
				});
			} else {
				// Make sure anything depending on subtitles
				// will fail when no subtitles are being loaded
				subtitlesFetchPromises = [Q.reject()];
			}

			// Aggregate all items from torrent providers
			var itemPromises = _.map(providerPromises, function (provider, pid) {
				// Waits for the torrent provider
				return provider
					.then(function (items) {
						_.each(items.results, function (item) {

							item.subtitle = {};

							// TODO: TEMP FIX TILL THE NEW API WILL BE PROPAGATED
							if (item.type === 'show') {
								_.extend(item.images, {
									imageLowRes: item.images.lowres || item.images.poster
								});
							}

							var id = item[self.popid];
							// If the item is there already simply
							// extend it with the new torrents.
							if (self.get(id) != null) {
								var model = self.get(id);
								var ts = model.get('torrents');
								_.extend(ts, item.torrents);
								model.set('torrents', ts);
								return;
							}


							// TODO: Improve the way we get providers
							item.provider = torrents[pid].name;
						});
						return items;
					});
			});

			// Aggregate metadata from the metadata provider
			var metadataPromises;
			if (metadata) {
				// Make sure we have processed all the items first
				metadataPromises = _.map(itemPromises, function (promise, i) {
					// Link the torrent provider to the metadata provider
					return Q.spread([promise, metadataFetchPromises[i]],
						function (items, metadatas) {
							_.each(items.results, function (item) {
								var id = item[self.popid];
								var query = {};
								query[self.popid] = id;
								// Find the metadata based on the ID
								var info = _.findWhere(metadatas, query);
								if (info) {
									// If we have metadata, extend the item
									_.extend(item, info);
								} else {
									win.warn(self.type + ': Unable to find ' + id + ' on ' + metadata.name);
								}

							});
							return items;
						});
				});
			}

			// Aggregate subtitles from the subtitles provider
			// The only pre-requisite for this promise is that
			// the provider items have been aggregated. This
			// continues to run in the background after the
			// collection has "completed" loading.
			var subtitlePromises;
			if (subtitle) {
				// Make sure we have processed all the items first
				subtitlePromises = _.map(itemPromises, function (promise, i) {
					// Link the torrent provider to the subtitle provider
					return Q.spread([promise, subtitlesFetchPromises[i]],
						function (items, subtitles) {
							_.each(items.results, function (item) {
								var id = item[self.popid];

								var thisSub = _.findWhere(subtitles, {
									_id: id
								});

								// delete _id it cause crash on model... ;/
								delete thisSub._id;
								delete thisSub._lastModified;
								delete thisSub._ttl;

								if (self.get(id) != null) {
									// If we call late, the model will
									// already be in the collection,
									// we need to update it there.
									var model = self.get(id);
									model.set('subtitle', thisSub);
								} else {
									// If its not in the collection
									// yet, just update the object.
									item.subtitle = thisSub;

								}
							});
							return items;
						});
				});
			}

			// Does this collection have a metadata provider? If so we wait for the
			// metadata to be loaded before triggering loaded, if not, we wait til the
			// torrent provider has loaded.
			var endPromise = metadata ? Q.all(metadataPromises) : Q.all(providerPromises);

			// Wait til all torrent or metadata providers
			// are complete.
			endPromise.done(function (items) {
				// Add all results from all providers
				_.forEach(items, function (item) {
					self.add(item.results);
				});
				// If any of the providers "haveMore", set it to true
				self.hasMore = _.any(_.pluck(items, 'hasMore'));
				// Calculate the sum of all results returned by 1 or more providers
				var sum = _.reduce(_.pluck(items, 'results'), function (ctx, set) {
					return ctx + set.length;
				}, 0);
				if (self.hasMore && sum < 38) {
					self.hasMore = false;
				}
				// Trigger the loaded event
				self.trigger('sync', self);
				self.state = 'loaded';
				self.trigger('loaded', self, self.state);
			});
		},

		fetchMore: function () {
			this.filter.page += 1;
			this.fetch();
		}
	});

	App.Model.Collection = PopCollection;
})(window.App);
