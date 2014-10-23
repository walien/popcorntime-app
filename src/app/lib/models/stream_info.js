(function (App) {
	'use strict';


	streamInfo.prototype.update = function (stream) {
		var active = function (wire) {
			return !wire.peerChoking;
		};
		var engine = stream;
		var swarm = engine.swarm;
		var BUFFERING_SIZE = 10 * 1024 * 1024;
		var converted_speed = 0;
		var percent = 0;

		var upload_speed = swarm.uploadSpeed(); // upload speed
		var final_upload_speed = '0 B/s';
		if (!isNaN(upload_speed) && upload_speed !== 0) {
			converted_speed = Math.floor(Math.log(upload_speed) / Math.log(1024));
			final_upload_speed = (upload_speed / Math.pow(1024, converted_speed)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][converted_speed] + '/s';
		}

		var download_speed = swarm.downloadSpeed(); // download speed
		var final_download_speed = '0 B/s';
		if (!isNaN(download_speed) && download_speed !== 0) {
			converted_speed = Math.floor(Math.log(download_speed) / Math.log(1024));
			final_download_speed = (download_speed / Math.pow(1024, converted_speed)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][converted_speed] + '/s';
		}
		var streamInfo = {
			downloaded: swarm.downloaded,
			active_peers: swarm.wires.filter(active).length,
			total_peers: swarm.wires.length,
			uploadSpeed: final_upload_speed,
			downloadSpeed: final_download_speed
		}


		swarm.downloaded = (swarm.downloaded) ? swarm.downloaded : 0;
		percent = swarm.downloaded / (BUFFERING_SIZE / 100);
		if (percent >= 100) {
			percent = 99; // wait for subtitles
		}
		streamInfo.percent = percent;
		return streamInfo;
	};


})(window.App);