(function (App) {
	'use strict';

	var prevX = 0;
	var prevY = 0;

	var Item = Backbone.Marionette.ItemView.extend({
		template: '#item-tpl',

		tagName: 'li',
		className: 'item',

		attributes: function () {
			return {
				'data-imdb-id': this.model.get('imdb_id')
			};
		},

		ui: {
			coverImage: '.cover-image',
			cover: '.cover',
			bookmarkIcon: '.actions-favorites',
			watchedIcon: '.actions-watched'
		},

		modelEvents: {
			'change': 'render'
		},

		events: {
			'click .actions-favorites': 'toggleFavorite',
			'click .actions-watched': 'toggleWatched',
			'click .cover': 'showDetail',
			'mouseover .cover': 'hoverItem'
		},

		templateHelpers: {

			stars: function () {
				return [1,2,3,4,5];
			},

			quality: function () {
				if (this.torrents) {

					var torrents = this.torrents;
					var q720 = torrents['720p'] !== undefined;
					var q1080 = torrents['1080p'] !== undefined;

					if (q720 && q1080) {
						return '720p/1080p';
					}else if (q1080) {
						return '1080p';
					}else if (q720) {
						return '720p';
					} else {
						return 'HDRip';
					}

				} else {
					return false;
				}
			},

			image: function() {
				var image;
				switch (this.type) {
					case 'show':
						image = this.images.imageLowRes;
					break;

					case 'bookmarkedshow':
					case 'bookmarkedmovie':
					case 'movie':
						image = this.imageLowRes;
					break;
				}
				return image;
			},

			ratingStars: function() {
				if (typeof this.rating === 'object') {
					return this.rating/10;
				} else {
					return [];
				}
			},

			rating: function() {
				if (typeof this.rating === 'object') {
					return this.model.get('rating')['percentage']/10;
				} else {
					return false;
				}
			}
		},

		initialize: function () {

			var imdb = this.model.get('imdb_id'),
				bookmarked = App.userBookmarks.indexOf(imdb) !== -1,
				itemtype = this.model.get('type'),
				images = this.model.get('images'),
				img = (images) ? images.poster : this.model.get('image'),
				watched, cached, that = this;

			switch (itemtype) {
			case 'bookmarkedshow':
				watched = App.watchedShows.indexOf(imdb) !== -1;
				this.model.set('image', this.model.get('imageLowRes'));
				break;
			case 'show':
				watched = App.watchedShows.indexOf(imdb) !== -1;
				images.poster = this.model.get('images')['imageLowRes'];
				break;
			case 'bookmarkedmovie':
			case 'movie':
				watched = App.watchedMovies.indexOf(imdb) !== -1;
				this.model.set('image', this.model.get('imageLowRes'));
				break;
			}
			this.model.set('watched', watched);
			this.model.set('bookmarked', bookmarked);
		},

		onShow: function () {

		},

		onRender: function () {
			var itemtype = this.model.get('type');
			if (itemtype === 'show' || itemtype === 'bookmarkedshow' || itemtype === 'historyshow') {
				this.ui.watchedIcon.remove();
			}
			this.ui.coverImage.on('load', _.bind(this.showCover, this));
		},

		onClose: function () {
			this.ui.coverImage.off('load');
		},

		hoverItem: function (e) {
			if (e.pageX !== prevX || e.pageY !== prevY) {
				$('.item.selected').removeClass('selected');
				$(this.el).addClass('selected');
				prevX = e.pageX;
				prevY = e.pageY;
			}
		},

		showCover: function () {
			var itemtype = this.model.get('type');
			switch (itemtype) {
			case 'bookmarkedmovie':
				if (this.model.get('watched')) {
					this.ui.watchedIcon.addClass('selected');
					switch (Settings.watchedCovers) {
					case 'fade':
					case 'hide':
						this.$el.addClass('watched');
						break;
					}
				}
				this.ui.cover.css('background-image', 'url(' + this.model.get('image') + ')').addClass('fadein');
				this.ui.bookmarkIcon.addClass('selected');
				break;
			case 'bookmarkedshow':
				this.ui.cover.css('background-image', 'url(' + this.model.get('image') + ')').addClass('fadein');
				this.ui.bookmarkIcon.addClass('selected');
				break;
			case 'movie':
				this.ui.cover.css('background-image', 'url(' + this.model.get('image') + ')').addClass('fadein');

				if (this.model.get('watched')) {
					this.ui.watchedIcon.addClass('selected');
					switch (Settings.watchedCovers) {
					case 'fade':
						this.$el.addClass('watched');
						break;
					case 'hide':
						this.$el.remove();
						break;
					}
				}
				if (this.model.get('bookmarked')) {
					this.ui.bookmarkIcon.addClass('selected');
				}
				break;
			case 'show':
				this.ui.cover.css('background-image', 'url(' + this.model.get('images').poster + ')').addClass('fadein');

				if (this.model.get('bookmarked')) {
					this.ui.bookmarkIcon.addClass('selected');
				}
				break;
			}
			this.ui.coverImage.remove();

			this.ui.watchedIcon.tooltip({
				title: this.ui.watchedIcon.hasClass('selected') ? i18n.__('Mark as unseen') : i18n.__('Mark as Seen')
			});
			this.ui.bookmarkIcon.tooltip({
				title: this.ui.bookmarkIcon.hasClass('selected') ? i18n.__('Remove from bookmarks') : i18n.__('Add to bookmarks')
			});
		},

		showDetail: function (e) {
			e.preventDefault();
			var type = this.model.get('type');
			switch (type) {
			case 'bookmarkedmovie':
				var SelectedMovie = new Backbone.Model({
					imdb_id: this.model.get('imdb_id'),
					image: this.model.get('image'),
					torrents: this.model.get('torrents'),
					title: this.model.get('title'),
					genre: this.model.get('genre'),
					synopsis: this.model.get('synopsis'),
					runtime: this.model.get('runtime'),
					year: this.model.get('year'),
					health: this.model.get('health'),
					subtitle: this.model.get('subtitle'),
					backdrop: this.model.get('backdrop'),
					rating: this.model.get('rating'),
					trailer: this.model.get('trailer'),
					provider: this.model.get('provider'),
					bookmarked: true,
				});

				App.vent.trigger('movie:showDetail', SelectedMovie);
				break;

			case 'bookmarkedshow':
				type = 'show';
				/* falls through */
			case 'show':
			case 'movie':
				var Type = type.charAt(0).toUpperCase() + type.slice(1);
				this.model.set('health', false);
				$('.spinner').show();
				var provider = App.Providers.get(this.model.get('provider'));
				var data = provider.detail(this.model.get('imdb_id'), this.model.attributes)
					.catch(function () {
						alert('Somethings wrong... try later');
					})
					.then(function (data) {
						data.provider = provider.name;
						$('.spinner').hide();
						App.vent.trigger(type + ':showDetail', new App.Model[Type](data));
					});
				break;

			}

		},

		toggleWatched: function (e) {
			e.stopPropagation();
			e.preventDefault();
			var that = this;
			if (this.model.get('watched')) {
				this.ui.watchedIcon.removeClass('selected');
				if (Settings.watchedCovers === 'fade') {
					this.$el.removeClass('watched');
				}

				App.Database.delete('watched', {
						imdb_id: this.model.get('imdb_id')
					})
					.then(function () {
						App.watchedMovies.splice(this.model.get('imdb_id'));
						that.model.set('watched', false);
					});
			} else {
				this.ui.watchedIcon.addClass('selected');
				switch (App.Settings.get('watchedCovers')) {
				case 'fade':
					this.$el.addClass('watched');
					break;
				case 'hide':
					this.$el.remove();
					break;
				}

				App.Database.add('watched', {
						movie_id: this.model.get('imdb_id').toString(),
						type: 'movie',
						date: new Date(),
						from_browser: true
					})
					.then(function () {
						App.watchedMovies.push(this.model.get('imdb_id'));
						that.model.set('watched', true);
					});

			}

			this.ui.watchedIcon.tooltip({
				title: this.ui.watchedIcon.hasClass('selected') ? i18n.__('Mark as unseen') : i18n.__('Mark as Seen')
			});
		},

		toggleFavorite: function (e) {
			e.stopPropagation();
			e.preventDefault();
			var that = this;

			switch (this.model.get('type')) {
			case 'bookmarkedshow':
			case 'bookmarkedmovie':
				App.Database.delete('bookmarks', {
						imdb_id: this.model.get('imdb_id')
					})
					.then(function () {
						App.userBookmarks.splice(App.userBookmarks.indexOf(that.model.get('imdb_id')), 1);
						win.info('Bookmark deleted (' + that.model.get('imdb_id') + ')');
						if (that.model.get('type') === 'movie') {
							// we'll make sure we dont have a cached movie
							App.Database.delete('movies', {
								imdb_id: that.model.get('imdb_id')
							});
						}

						// we'll delete this element from our list view
						$(e.currentTarget).closest('li').animate({
							paddingLeft: '0px',
							paddingRight: '0px',
							width: '0%',
							opacity: 0
						}, 500, function () {
							$(this).remove();
							$('.items').append($('<li/>').addClass('item ghost'));
							if ($('.items li').length === 0) {
								App.vent.trigger('movies:list', []);
							}
						});
					});
				break;

			case 'movie':
				if (this.model.get('bookmarked')) {
					this.ui.bookmarkIcon.removeClass('selected');
					App.Database.delete('bookmarks', {
							imdb_id: this.model.get('imdb_id')
						})
						.then(function () {
							App.userBookmarks.splice(App.userBookmarks.indexOf(that.model.get('imdb_id')), 1);
							win.info('Bookmark deleted (' + that.model.get('imdb_id') + ')');
							// we'll make sure we dont have a cached movie
							return App.Database.delete('movies', {
								imdb_id: that.model.get('imdb_id')
							});
						})
						.then(function () {
							that.model.set('bookmarked', false);
						});
				} else {
					var movie = {
						imdb_id: this.model.get('imdb_id'),
						image: this.model.get('image'),
						torrents: this.model.get('torrents'),
						title: this.model.get('title'),
						genre: this.model.get('genre'),
						synopsis: this.model.get('synopsis'),
						runtime: this.model.get('runtime'),
						year: this.model.get('year'),
						health: this.model.get('health'),
						subtitle: this.model.get('subtitle'),
						backdrop: this.model.get('backdrop'),
						rating: this.model.get('rating'),
						trailer: this.model.get('trailer'),
						provider: this.model.get('provider'),
					};

					App.Database.add('movies', movie)
						.then(function () {
							App.userBookmarks.push(that.model.get('imdb_id'));
							return App.Database.add('bookmarks', {
								imdb_id: that.model.get('imdb_id'),
								type: 'movie'
							});
						})
						.then(function () {
							win.info('Bookmark added (' + that.model.get('imdb_id') + ')');
							that.model.set('bookmarked', true);
						});
				}
				break;
			case 'show':
				if (this.model.get('bookmarked') === true) {
					this.ui.bookmarkIcon.removeClass('selected');
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

				} else {
					this.model.set('bookmarked', true);
					this.ui.bookmarkIcon.addClass('selected');
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
									win.info('Bookmark added (' + that.model.get('imdb_id') + ')');
									that.model.set('bookmarked', true);
								});
						});

				}
				break;

			}

			this.ui.bookmarkIcon.tooltip({
				title: this.ui.bookmarkIcon.hasClass('selected') ? i18n.__('Remove from bookmarks') : i18n.__('Add to bookmarks')
			});
		}

	});

	App.View.Item = Item;
})(window.App);
