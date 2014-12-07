var _ = require('lodash'),
	debug = require('debug'),
	errors;

/**
 * Basic error handling
 */
errors = {

	throwError: function (err) {
		if (!err) {
			err = new Error('An error occurred');
		}

		if (_.isString(err)) {
			throw new Error(err);
		}

		throw err;
	},

	logInfo: function (component, info) {
		var msg = [component + ':', info];
		console.info.apply(console, msg);
	},

	logWarn: function (warn, context, help) {
		warn = warn || 'no message supplied';
		var msgs = ['\nWarning:', warn, '\n'];

		if (context) {
			msgs.push(context, '\n');
		}

		if (help) {
			msgs.push(help);
		}

		// add a new line
		msgs.push('\n');

		console.log.apply(console, msgs);
	},

	logError: function (err, context, help) {
		var self = this,
			origArgs = _.toArray(arguments).slice(1),
			stack,
			msgs;

		if (_.isArray(err)) {
			_.each(err, function (e) {
				var newArgs = [e].concat(origArgs);
				errors.logError.apply(self, newArgs);
			});
			return;
		}

		stack = err ? err.stack : null;

		if (!_.isString(err)) {
			if (_.isObject(err) && _.isString(err.message)) {
				err = err.message;
			} else {
				err = 'An unknown error occurred.';
			}
		}

		msgs = ['\nERROR:', err, '\n'];

		if (context) {
			msgs.push(context, '\n');
		}

		if (help) {
			msgs.push(help);
		}

		// add a new line
		msgs.push('\n');

		if (stack) {
			msgs.push(stack, '\n');
		}

		console.error.apply(console, msgs);

	},

	logErrorAndExit: function (err, context, help) {
		this.logError(err, context, help);
		// Exit with 0 to prevent npm errors as we have our own
		process.exit(0);
	},

	logAndThrowError: function (err, context, help) {
		this.logError(err, context, help);

		this.throwError(err, context, help);
	}
};

_.each([
	'logWarn',
	'logInfo',
	'throwError',
	'logError',
	'logAndThrowError',
	'logErrorAndExit'
], function (funcName) {
	errors[funcName] = errors[funcName].bind(errors);
});

module.exports = errors;
