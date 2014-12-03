var path = require('path'),
	os = require('os'),
	config;

config = {

	title: 'Popcorn Time',
	platform: process.platform,

	genres: [
		'All',
		'Action',
		'Adventure',
		'Animation',
		'Biography',
		'Comedy',
		'Crime',
		'Documentary',
		'Drama',
		'Family',
		'Fantasy',
		'Film-Noir',
		'History',
		'Horror',
		'Music',
		'Musical',
		'Mystery',
		'Romance',
		'Sci-Fi',
		'Short',
		'Sport',
		'Thriller',
		'War',
		'Western'
	],

	sorters: [
		'popularity',
		'date',
		'year',
		'rating',
		'alphabet'
	],

	sorters_tv: [
		'popularity',
		'updated',
		'year',
		'name'
	],

	types_anime: [
		'All',
		'Movies',
		'TV',
		'OVA',
		'ONA'
	],

	genres_anime: [
		'All',
		'Action',
		'Adventure',
		'Cars',
		'Comedy',
		'Dementia',
		'Demons',
		'Drama',
		'Ecchi',
		'Fantasy',
		'Game',
		'Harem',
		'Historical',
		'Horror',
		'Josei',
		'Kids',
		'Magic',
		'Martial Arts',
		'Mecha',
		'Military',
		'Music',
		'Mystery',
		'Parody',
		'Police',
		'Psychological',
		'Romance',
		'Samurai',
		'School',
		'Sci-Fi',
		'Seinen',
		'Shoujo',
		'Shoujo Ai',
		'Shounen',
		'Shounen Ai',
		'Slice of Life',
		'Space',
		'Sports',
		'Super Power',
		'Supernatural',
		'Thriller',
		'Vampire'
	],

	genres_tv: [
		'All',
		'Action',
		'Adventure',
		'Animation',
		'Children',
		'Comedy',
		'Crime',
		'Documentary',
		'Drama',
		'Family',
		'Fantasy',
		'Game Show',
		'Home and Garden',
		'Horror',
		'Mini Series',
		'Mystery',
		'News',
		'Reality',
		'Romance',
		'Science Fiction',
		'Soap',
		'Special Interest',
		'Sport',
		'Suspense',
		'Talk Show',
		'Thriller',
		'Western'
	],

	language: 'en',

	coversShowRating: false,
	watchedCovers: 'fade',
	showAdvancedSettings: false,
	postersMinWidth: 134,
	postersMaxWidth: 294,
	postersMinFontSize: 0.8,
	postersMaxFontSize: 1.3,
	postersSizeRatio: (196 / 134),
	postersWidth: 134,
	postersJump: [134, 154, 174, 194, 214, 234, 254, 274, 294],

	playNextEpisodeAuto: true,

	alwaysOnTop: false,
	theme: 'Official_-_Dark_theme',
	ratingStars: true,
	startScreen: 'Movies',
	lastTab: '',
	moviesShowQuality: false,
	movies_quality: 'all',
	subtitle_language: 'none',
	subtitle_size: '28px',
	subtitle_color: '#ffffff',
	subtitle_shadows: 'true',


	tvshowApiEndpoint: 'http://eztvapi.re/',
	httpApiPort: 8008,
	httpApiUsername: 'popcorn',
	httpApiPassword: 'popcorn',


	traktUsername: '',
	traktPassword: '',
	traktTvVersion: '0.0.2',
	syncOnStart: false,


	connectionLimit: 100,
	dhtLimit: 500,
	streamPort: 0, //random


	tmpLocation: path.join(os.tmpDir(), 'Popcorn-Time'),
	deleteTmpOnClose: true,

	updateApiEndpoint: 'http://popcorntime.re/',

	connectionCheckUrl: 'http://google.com/',

	version: false,
	dbversion: '0.1.0',
	font: 'tahoma',
	defaultWidth: Math.round(window.screen.availWidth * 0.8),
	defaultHeight: Math.round(window.screen.availHeight * 0.8),

	tv_detail_jump_to: 'next',

	activeTheme: 'cinematografik',


	cachev2: {
		name: 'popcorntime',
		version: 3,
		tables: ['metadata', 'subtitle']
	},

	// providers mapping
	providers: {

		movie: ['yts'],
		tvshow: ['eztv'],
		anime: ['haruhichan'],

		metadata: 'trakttv',

		subtitle: 'ysubs',
		tvshowsubtitle: 'opensubtitles',

		torrentCache: 'TorrentCache'
	},

};

// Export config
module.exports = config;
