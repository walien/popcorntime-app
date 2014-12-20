(function (App) {
	'use strict';
	var readTorrent = require('read-torrent'),
		path = require('path'),
		fs = require('fs'),
		request = require('request'),
		zlib = require('zlib');

	function startStream(torrent, torrentsrc) {

		if (torrent.name) { // sometimes magnets don't have names for some reason
			var torrenttitle = $.trim(torrent.name.replace('[rartv]', '').replace('[PublicHD]', '').replace('[ettv]', '').replace('[eztv]', '')).replace(/[\s]/g, '.'),
				title, type;
			var se_re = torrenttitle.match(/(.*)S(\d\d)E(\d\d)/i);

			if (se_re != null) {
				var showname = $.trim(se_re[1].replace(/[\.]/g, ' ')).replace(/[^\w ]+/g, '').trim().replace(/ +/g, '-');
				var season = se_re[2];
				var episode = se_re[3];
				title = showname + '-' + i18n.__('Season') + ' ' + season + ', ' + i18n.__('Episode') + ' ' + episode;
				type = 'dropped-tvshow';
				console.log(title, season, episode);

			} else {
				var filename = $.trim(torrenttitle.replace(/[\.]/g, ' ')).replace(/[^\w ]+/g, ' ').replace(/ +/g, ' ');

				title = filename.split(filename.split(/[^\d]/).filter(function (n) {
					if ((n >= 1900) && (n <= 2099)) {
						return n
					}
				}))[0];

				type = 'dropped-movie';

			}
		}

		var torrentStart = {
			torrent: torrentsrc,
			type: type,
			metadata: {
				title: title,
				showName: showname,
				season: season,
				episode: episode
			},
			device: App.Device.Collection.selected

		};
		console.log(torrentStart);
		App.vent.trigger('streamer:start', torrentStart);

	}

	function onDrop(e) {

		var file = e.dataTransfer.files[0];

		if (file != null && (file.name.indexOf('.torrent') !== -1 || file.name.indexOf('.srt') !== -1)) {
			var reader = new FileReader();

			reader.onload = function (event) {
				var content = reader.result;
				fs.writeFile(path.join(App.Settings.get('tmpLocation'), file.name), content, function (err) {
					if (err) {
						window.alert('Error Loading File: ' + err);
					} else {
						if (file.name.indexOf('.torrent') !== -1) {
							var torrentsrc = path.join(App.Settings.get('tmpLocation'), file.name);
							readTorrent(torrentsrc, function (err, torrent) {
								var torrentMagnet = 'magnet:?xt=urn:btih:' + torrent.infoHash + '&dn=' + torrent.name.replace(/ +/g, '+').toLowerCase();
								_.each(torrent.announce, function (value) {
									var announce = '&tr=' + encodeURIComponent(value);
									torrentMagnet += announce;
								});
								startStream(torrent, torrentMagnet);
							});
						} else if (file.name.indexOf('.srt') !== -1) {
							App.Settings.set('droppedSub', file.name);
							App.vent.trigger('videojs:drop_sub');
						}
					}
				});
			};

			reader.readAsBinaryString(file);

		} else {
			var data = e.dataTransfer.getData('text/plain');

		}

	}

	function onPaste(e) {
		if (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA') {
			return;
		}
		var data = (e.originalEvent || e).clipboardData.getData('text/plain');

		var torrentsrc = data;
		console.log(torrentsrc, torrentsrc.indexOf('magnet') > -1);


		if (torrentsrc.indexOf('magnet') > -1) {

			readTorrent(torrentsrc, function (err, torrent) {
				startStream(torrent, torrentsrc);
			});
		} else {
			var ws = fs.createWriteStream(path.join(App.Settings.get('tmpLocation'), 'pct-remote-torrent.torrent'));

			if (fs.exists(path.join(App.Settings.get('tmpLocation'), 'pct-remote-torrent.torrent'))) {
				fs.unlink(path.join(App.Settings.get('tmpLocation'), 'pct-remote-torrent.torrent'));
			}
			request(torrentsrc).on('response', function (resp) {
				if (resp.statusCode >= 400) {
					return done('Invalid status: ' + resp.statusCode);
				}
				switch (resp.headers['content-encoding']) {
				case 'gzip':
					resp.pipe(zlib.createGunzip()).pipe(ws);
					break;
				case 'deflate':
					resp.pipe(zlib.createInflate()).pipe(ws);
					break;
				default:
					resp.pipe(ws);
					break;
				}
				ws
					.on('error', function () {
						console.log('error')
					})
					.on('close', function () {
						console.log('done');
						console.log(ws.path);
						readTorrent(ws.path, function (err, torrent) {
							var torrentMagnet = 'magnet:?xt=urn:btih:' + torrent.infoHash + '&dn=' + torrent.name.replace(/ +/g, '+').toLowerCase();
							_.each(torrent.announce, function (value) {
								var announce = '&tr=' + encodeURIComponent(value);
								torrentMagnet += announce;
							});
							startStream(torrent, torrentMagnet);
						});

					});
			});
		}
	}

	function onDragUI(hide) {

		if (hide) {
			$('#drop-mask').hide();
			console.log('drag completed');
			$('.drop-indicator').hide();
			return;
		}

		$('#drop-mask').show();
		var showDrag = true;
		var timeout = -1;
		$('#drop-mask').on('dragenter',
			function (e) {
				$('.drop-indicator').show();
				console.log('drag init');
			});
		$('#drop-mask').on('dragover',
			function (e) {
				var showDrag = true;
			});

		$('#drop-mask').on('dragleave',
			function (e) {
				var showDrag = false;
				clearTimeout(timeout);
				timeout = setTimeout(function () {
					if (!showDrag) {
						console.log('drag aborted');
						$('.drop-indicator').hide();
						$('#drop-mask').hide();
					}
				}, 100);
			});
	}

	function initDragDrop() {

		window.ondragenter = function (e) {
			e.preventDefault();
			onDragUI(false);
		}
		window.ondrop = function (e) {
			e.preventDefault();
			onDragUI(true);
			onDrop(e);
		}
		$(document).on('paste', function (e) {
			e.preventDefault();
			onPaste(e);
		});

	}
	initDragDrop();
})(window.App);