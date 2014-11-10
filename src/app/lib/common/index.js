var
	Q = require('q'),
	Common;

function Common(App) {
	this.app = App;
}

Common.prototype.markEpisodeAsWatched = function (data) {
	console.log('Mark as watched');
};


module.exports = function (App) {
	return new Common(App);
};
