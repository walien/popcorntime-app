(function (App) {
	'use strict';
	var memoize = require('memoizee');
	var cache = {};
	var inherits = require('util').inherits;

	var Provider = function () {
		var memopts = {
			maxAge: 10 * 60 * 1000,
			/* 10 minutes */
			preFetch: 0.5,
			/* recache every 5 minutes */
			primitive: true
		};

		this.memfetch = memoize(this.fetch.bind(this), memopts);
		this.fetch = this._fetch.bind(this);

		this.detail = memoize(this.detail.bind(this), _.extend(memopts, {
			async: true
		}));
	};

	Provider.prototype._fetch = function (filters) {
		filters.toString = this.toString;
		return this.memfetch(filters);
	};

	Provider.prototype.toString = function (arg) {
		return JSON.stringify(this);
	};

	function getProvider(name) {
		if (!name) {
			/* XXX(xaiki): this is for debug purposes, will it bite us later ? */
			console.error('dumping provider cache');
			return cache;
		}

		if (cache[name]) {
			win.info('Returning cached provider', name);
			return cache[name];
		}

		var provider = App.Providers[name];
		if (!provider) {
			console.error('couldn\'t find provider', name);
			return null;
		}

		win.info('Spawning new provider', name);

		// its not coming from the package manager
		if (App.Providers[name].metadata === undefined) {
			cache[name] = new provider();
		} else {
			cache[name] = App.Providers[name];
		}

		//HACK(xaiki): set the provider name in the returned object.
		cache[name].name = name;
		return cache[name];
	}

	function setProvider(name, fn) {
		App.Providers[name] = fn;
	}

	function getProviderByType(type) {

		var providers = App.Settings.get('providers');
		var provider = providers[type];

		if (typeof(provider) === 'object') {
			return _.map(provider, function (t) {
				return App.Providers.get(t);
			});
		}
		return App.Providers.get(provider);
	}

	// helper to get our providers
	App.Providers.get = getProvider;
	App.Providers.getByType = getProviderByType;

	// register a new provider
	App.Providers.set = setProvider;

	App.Providers.Generic = Provider;

})(window.App);
