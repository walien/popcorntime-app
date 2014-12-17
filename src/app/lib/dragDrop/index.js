(function (App) {
	'use strict';

	function startStream() {}

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

							App.Providers.getByType('torrentCache').resolve(path.join(App.Settings.get('tmpLocation'), file.name));

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

		App.Providers.getByType('torrentCache').resolve(data);

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