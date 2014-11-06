// This function is used to access
// the player and extract all info
// TODO: Find a better way to access window.App ?
var Player = {};

Player.info = function () {

	if (window.App.PlayerView) {

		var result = {
			playing: !window.App.PlayerView.player.paused(),
			title: window.App.PlayerView.model.get('title'),
			type: window.App.PlayerView.isMovie() ? 'movie' : 'show',
			quality: window.App.PlayerView.model.get('quality'),
			downloadSpeed: window.App.PlayerView.model.get('downloadSpeed'),
			uploadSpeed: window.App.PlayerView.model.get('uploadSpeed'),
			activePeers: window.App.PlayerView.model.get('activePeers'),
			volume: window.App.PlayerView.player.volume(),
			muted: window.App.PlayerView.player.muted(),
			currentTime: window.App.PlayerView.player.currentTime(),
			duration: window.App.PlayerView.player.duration(),
			streamUrl: 'not_supported_yet',
			selectedSubtitle: ''
		}

		if (result.movie) {
			result.imdb_id = window.App.PlayerView.model.get('imdb_id');
		} else {
			result.tvdb_id = window.App.PlayerView.model.get('tvdb_id');
			result.season = window.App.PlayerView.model.get('season');
			result.episode = window.App.PlayerView.model.get('episode');
		}

		if (window.App.PlayerView.player.textTrackDisplay.children().length > 0) {
			result.selectedSubtitle = window.App.PlayerView.player.textTrackDisplay.children()[0].language();
		}

		return result;

	}

	return false;
}

Player.isAvailable = function () {
	if (window.App.PlayerView === undefined ||
		window.App.PlayerView.player === undefined ||
		window.App.PlayerView.player === null) {
		return false;
	}
	return true;
}

Player.videojs = {};
Player.videojs.on = function () {
	if (Player.isAvailable()) {
		return window.App.PlayerView.player.on;
	}
	return false;
}

module.exports = Player;
