(function (App) {
	'use strict';

	var About = Backbone.Marionette.ItemView.extend({
		template: '#about-tpl',
		className: 'about',

		ui: {
			success_alert: '.success_alert'
		},

		events: {
			'click .close-icon': 'closeAbout',
			'click .links': 'links'
		},

		templateHelpers: {

			git: function (key, len) {
				len = len || false;
				if (App.git) {
					if (len) {
						return App.git[key].slice(0, len);
					} else {
						return App.git[key];
					}
				} else {
					return false;
				}
			},

			if_git: function () {
				return (App.git ? true : false);
			}
		},

		onShow: function () {
			$('.filter-bar').hide();
			$('#header').addClass('header-shadow');

			Mousetrap.bind(['esc', 'backspace'], function (e) {
				App.vent.trigger('about:close');
			});
			$('.links').tooltip();
			console.log('Show about');
			$('#movie-detail').hide();
			if ((new Date().getMonth()) === (11 || 0)) {
				this.snow();
			}


		},

		onClose: function () {
			Mousetrap.unbind(['esc', 'backspace']);
			$('.filter-bar').show();
			$('#header').removeClass('header-shadow');
			$('#movie-detail').show();
		},

		closeAbout: function () {
			App.vent.trigger('about:close');
		},

		links: function (e) {
			e.preventDefault();
			gui.Shell.openExternal($(e.currentTarget).attr('href'));
		},
		snow: function () {
			/* Snow Parameters */
			var count = 30;
			var wind = {
				x: 2,
				y: 1
			};

			var particles = [];
			var width = window.innerWidth;
			var height = window.innerHeight;
			var halfWidth = width / 2;
			var mouse = {
				x: 0,
				y: 0
			};
			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext('2d');
			canvas.className = 'snow';

			setup();

			function setup() {
				for (var i = 0; i < count; i++) {
					particles.push({
						x: Math.random() * width, // x-pos
						y: Math.random() * height, // y-pos
						size: Math.random() * 4 + 1, // radius
						weight: Math.random() * count // density
					});
				}

				handleResize();

				window.addEventListener('resize', handleResize);
				window.addEventListener('mousemove', handleMouseMove);

				if (window.orientation !== undefined) {
					window.addEventListener('deviceorientation', handleDeviceOrientation);
				}

				document.body.insertBefore(canvas, document.body.firstChild);
				window.requestAnimationFrame(render);
			}

			function handleResize() {
				width = window.innerWidth;
				height = window.innerHeight;
				halfWidth = width / 2;
				canvas.width = width;
				canvas.height = height;
			}

			function handleMouseMove(e) {
				mouse.x = e.x || e.clientX;
				mouse.y = e.y || e.clientY;
				wind.x = map(mouse.x - halfWidth, -halfWidth, halfWidth, 4, -4);
			}

			var once = true;

			function handleDeviceOrientation(e) {
				// Remove the mouse event listener and only use gyro
				if (e.gamma !== null) {
					if (!(window.orientation % 180)) {
						wind.x = map(e.gamma, -60, 60, -4, 4);
					} else {
						wind.x = map(e.beta, -60, 60, 4, -4);
					}

					if (once) {
						window.removeEventListener('mousemove', mousemove);
						once = false;
					}
				}
			}

			function render() {
				ctx.clearRect(0, 0, width, height);
				ctx.fillStyle = 'rgba(255,255,255,0.8)';
				ctx.beginPath();
				for (var i = 0; i < count; i++) {
					var particle = particles[i];
					ctx.moveTo(particle.x, particle.y);
					ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2, true);
				}
				ctx.fill();
				update();
				requestAnimationFrame(render);
			}

			function map(x, in_min, in_max, out_min, out_max) {
				return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
			}

			function update() {
				for (var i = 0; i < count; i++) {
					var particle = particles[i];
					particle.y += Math.cos(particle.weight) + wind.y + particle.size / 2;
					particle.x += wind.x;

					if (particle.x > width + 5 || particle.x < -5 ||
						particle.y > height) {
						if (i % 3 > 0) {
							particle.x = Math.random() * width;
							particle.y = -5;
						} else {
							//If the flake is exitting from the right
							if (particle.x > halfWidth) {
								//Enter from the left
								particle.x = -5;
								particle.y = Math.random() * height;
							} else {
								//Enter from the right
								particle.x = width + 5;
								particle.y = Math.random() * height;
							}
						}
					}
				}
			}
		}


	});

	App.View.About = About;
})(window.App);