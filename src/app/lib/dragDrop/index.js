(function (App) {
	'use strict';
	var readTorrent = require('read-torrent');

	function startStream(torrent, torrentsrc) {
		console.log(torrent)
		if (torrent.name) { // sometimes magnets don't have names for some reason
			var torrenttitle = $.trim(torrent.name.replace('[rartv]', '').replace('[PublicHD]', '').replace('[ettv]', '').replace('[eztv]', '')).replace(/[\s]/g, '.'),
				title, type;
			var se_re = torrenttitle.match(/(.*)S(\d\d)E(\d\d)/i);

			if (se_re != null) {
				var showname = $.trim(se_re[1].replace(/[\.]/g, ' ')).replace(/[^\w ]+/g, '').replace(/ +/g, '-');
				var season = se_re[2];
				var episode = se_re[3];
				title = showname + '-' + i18n.__('Season') + ' ' + season + ', ' + i18n.__('Episode') + ' ' + episode;
				type = 'dropped-episode';
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
		/**/

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

								console.log(torrent);

								var torrentMagnet = 'magnet:?xt=urn:btih:' + torrent.infoHash + '&dn=' + torrent.name.replace(/ +/g, '+').toLowerCase();
								_.each(torrent.announce, function (value) {
									var announce = '&tr=' + encodeURIComponent(value);
									torrentMagnet += announce;
									console.log(announce);
								});


								console.log(torrentMagnet);

								startStream(torrent, torrentMagnet);
								//magnet:?xt=urn:btih:6B61B866C03ED7DB5ABE10328E13DF5F2FE90B10&dn=the+fall+s02e02+crime+drama+x264+rb58&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337


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
		readTorrent(torrentsrc, function (err, torrent) {
			startStream(torrent, torrentsrc);
		});
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