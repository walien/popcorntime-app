(function (App) {
	'use strict';
	var clipboard = gui.Clipboard.get();

	var AdmZip = require('adm-zip');
	var fdialogs = require('node-webkit-fdialogs');
	var _ = require('lodash');
	var fs = require('fs');

	var that;

	var Settings = Backbone.Marionette.ItemView.extend({
		template: '#settings-container-tpl',
		className: 'settings-container-contain',

		ui: {
			success_alert: '.success_alert',
			fakeTempDir: '#faketmpLocation',
			tempDir: '#tmpLocation',
		},

		events: {
			'click .keyboard': 'showKeyboard',
			'click .help': 'showHelp',
			'click .close-icon': 'closeSettings',
			'change select,input': 'saveSetting',
			'contextmenu input': 'rightclick_field',
			'click .flush-bookmarks': 'flushBookmarks',
			'click .flush-databases': 'flushAllDatabase',
			'click #faketmpLocation': 'showCacheDirectoryDialog',
			'click .default-settings': 'resetSettings',
			'click .open-tmp-folder': 'openTmpFolder',
			'click .open-database-folder': 'openDatabaseFolder',
			'click .export-database': 'exportDatabase',
			'click .import-database': 'importDatabase',
			'click .package-signout': 'signout',
			'click .btn-package': 'clickButtonPackage',
			'change #tmpLocation': 'updateCacheDirectory',
			'click .qr-code': 'generateQRcode',
			'click #qrcode-overlay': 'closeModal',
			'click #qrcode-close': 'closeModal'
		},

		templateHelpers: {

			screens: function () {
				return ['Movies', 'TV Series', 'Favorites', 'Anime', 'Watchlist', 'Last Open'];
			},

			tvDetailsJump: function () {
				return {
					'firstUnwatched': 'First Unwatched Episode',
					'next': 'Next Episode In Series'
				};
			},

			watchType: function () {
				return {
					'none': 'Show',
					'fade': 'Fade',
					'hide': 'Hide'
				};
			},

			languages: function () {
				var languages = [];
				for (var key in App.Localization.allTranslations) {
					key = App.Localization.allTranslations[key];
					if (App.Localization.langcodes[key] !== undefined) {
						languages.push(key);
					}
				}
				return languages;
			},

			langCode: function () {
				var languages = [];
				for (var key in App.Localization.langcodes) {
					if (App.Localization.langcodes[key].subtitle !== undefined && App.Localization.langcodes[key].subtitle === true) {
						languages.push(key);
					}
				}
				return languages;
			},

			subSize: function () {
				return ['24px', '26px', '28px', '30px', '32px', '34px', '36px', '38px', '48px', '50px', '52px', '54px', '56px', '58px', '60px'];
			}
		},

		onShow: function () {

			this.render();

			$('.filter-bar').hide();
			$('#movie-detail').hide();
			$('#header').addClass('header-shadow');
			$('.tooltipped').tooltip({
				delay: {
					'show': 800,
					'hide': 100
				}
			});
			Mousetrap.bind('backspace', function (e) {
				App.vent.trigger('settings:close');
			});
			that = this;

			App.Settings.set('ipAddress', this.getIPAddress());


		},

		onBeforeRender: function () {
			// package settings render
			this.renderPackageSettings();
		},

		renderPackageSettings: function () {
			// Package settings initialization
			var self = this;
			var settingPackages = [];
			var loadedPackages = App.PackagesManager.loadedPackages;
			_.each(loadedPackages, function (thisPackage) {
				var thisPackageBundled = {};
				// ok make sure we have settings or auth
				if ((thisPackage.settings && Object.keys(thisPackage.settings).length > 0) || (thisPackage.authentification && Object.keys(thisPackage.authentification).length > 0)) {

					// settings
					if (thisPackage.settings && Object.keys(thisPackage.settings).length > 0) {
						_.each(thisPackage.settings, function (auth, key) {
							auth._css = auth._ref.replace('.', '_');
							auth._key = key;
						});
						thisPackageBundled.settings = thisPackage.settings;
					}

					// authentification
					// this require an event on keyup
					if (thisPackage.authentification && Object.keys(thisPackage.authentification).length > 0) {

						var thisAuth = {};
						thisAuth.signinHandler = _.bind(thisPackage.bundledPackage[thisPackage.authentification.signinHandler], thisPackage.bundledPackage);
						thisAuth.signoutHandler = _.bind(thisPackage.bundledPackage[thisPackage.authentification.signoutHandler], thisPackage.bundledPackage);

						thisAuth.authenticated = thisPackage.bundledPackage.authenticated;

						thisAuth.package = thisPackage.metadata.name;

						thisAuth.inputElements = [];
						thisAuth.settingsElements = [];

						_.each(thisPackage.authentification.loginForm, function (auth, key) {

							auth._css = auth._ref.replace('.', '_');
							auth._key = key;
							thisAuth.inputElements.push(auth);

						});

						_.each(thisPackage.authentification.settings, function (auth, key) {

							auth._css = auth._ref.replace('.', '_');
							auth._key = key;
							thisAuth.settingsElements.push(auth);

						});

						thisPackageBundled.authentification = thisAuth;

					}

					thisPackageBundled.metadata = thisPackage.metadata;
					settingPackages.push(thisPackageBundled);
				}

			});

			this.model.set('loadedPackages', loadedPackages);
			this.model.set('settingPackages', settingPackages);
			this.model.set('authPackages', _.compact(_.pluck(settingPackages, 'authentification')));
		},

		onRender: function () {
			if (App.Settings.get('showAdvancedSettings')) {
				$('.advanced').css('display', 'flex');
			}

		},

		rightclick_field: function (e) {
			e.preventDefault();
			var menu = new this.context_Menu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'), e.target.id);
			menu.popup(e.originalEvent.x, e.originalEvent.y);
		},

		context_Menu: function (cutLabel, copyLabel, pasteLabel, field) {
			var gui = require('nw.gui'),
				menu = new gui.Menu(),

				cut = new gui.MenuItem({
					label: cutLabel || 'Cut',
					click: function () {
						document.execCommand('cut');
					}
				}),

				copy = new gui.MenuItem({
					label: copyLabel || 'Copy',
					click: function () {
						document.execCommand('copy');
					}
				}),

				paste = new gui.MenuItem({
					label: pasteLabel || 'Paste',
					click: function () {
						var text = clipboard.get('text');
						$('#' + field).val(text);
					}
				});

			menu.append(cut);
			menu.append(copy);
			menu.append(paste);

			return menu;
		},
		onClose: function () {
			Mousetrap.bind('backspace', function (e) {
				App.vent.trigger('show:closeDetail');
				App.vent.trigger('movie:closeDetail');
			});
			$('.filter-bar').show();
			$('#header').removeClass('header-shadow');
			$('#movie-detail').show();
		},

		closeSettings: function () {
			App.vent.trigger('settings:close');
		},

		generateQRcode: function () {

			var QRCodeInfo = {
				ip: App.Settings.get('ipAddress'),
				port: $('#httpApiPort').val(),
				user: $('#httpApiUsername').val(),
				pass: $('#httpApiPassword').val()
			};
			var qrcodecanvus = document.getElementById('qrcode');
			qrcodecanvus.width = qrcodecanvus.width;
			$('#qrcode').qrcode({
				'text': JSON.stringify(QRCodeInfo)
			});
			$('#qrcode-modal, #qrcode-overlay').fadeIn(500);
		},

		closeModal: function () {
			$('#qrcode-modal, #qrcode-overlay').fadeOut(500);
		},

		showHelp: function () {
			App.vent.trigger('help:toggle');
		},

		showKeyboard: function () {
			App.vent.trigger('keyboard:toggle');
		},

		clickButtonPackage: function (e) {
			var self = this;
			var authPackages = this.model.get('authPackages');

			e.preventDefault();

			// get active button
			var field = $(e.currentTarget);
			var oldHTML = field.html();

			var thisPackage = App.PackagesManager.getLoadedPackage(field.attr('data-package'));
			var thisHandler = field.attr('data-handler');

			if (_.isFunction(thisPackage.bundledPackage[thisHandler])) {

				field.html(i18n.__('Plese wait...')).addClass('disabled').prop('disabled', true);

				// we run our function
				// should be a promise
				thisPackage.bundledPackage[thisHandler]()
					.then(function () {

						field.text(i18n.__('Done')).removeClass('disabled').addClass('green').delay(3000).queue(function () {
							field.dequeue();
							self.render();
						});

					})
					.catch(function () {

						field.text(i18n.__('Error')).removeClass('disabled').addClass('red').delay(3000).queue(function () {
							field.dequeue();
							self.render();
						});

					});
			}


		},

		saveSetting: function (e) {
			var value = false;
			var data = {};
			var self = this;

			// get active field
			var field = $(e.currentTarget);

			var apiDataChanged = false;
			switch (field.attr('name')) {
			case 'httpApiPort':
				apiDataChanged = true;
				value = parseInt(field.val());
				break;
			case 'tvshowApiEndpoint':
				value = field.val();
				if (value.substr(-1) !== '/') {
					value += '/';
				}
				break;
			case 'subtitle_size':
			case 'tv_detail_jump_to':
			case 'subtitle_language':
			case 'movies_quality':
			case 'start_screen':
				if ($('option:selected', field).val() === 'Last Open') {
					App.Settings.set('lastTab', App.currentview);
				}
				/* falls through */
			case 'watchedCovers':
			case 'theme':
				value = $('option:selected', field).val();
				break;
			case 'language':
				value = $('option:selected', field).val();
				i18n.setLocale(value);
				break;
			case 'moviesShowQuality':
			case 'deleteTmpOnClose':
			case 'coversShowRating':
			case 'showAdvancedSettings':
			case 'alwaysOnTop':
			case 'syncOnStart':
			case 'subtitle_shadows':
			case 'playNextEpisodeAuto':
				value = field.is(':checked');
				break;
			case 'httpApiUsername':
			case 'httpApiPassword':
				apiDataChanged = true;
				value = field.val();
				break;
			case 'connectionLimit':
			case 'dhtLimit':
			case 'streamPort':
				value = field.val();
				break;
			case 'tmpLocation':
				value = path.join(field.val(), 'Popcorn-Time');
				break;
			case 'subtitle_color':
				//check if valid hex color
				if (/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(field.val())) {
					value = field.val();
					break;
				} else {
					return;
				}
				break;
			default:
				if (field.is(':checkbox')) {
					if (field.is(':checked')) {
						value = true;
					} else {
						value = false;
					}
				} else {
					value = field.val();
				}

				break;
			}
			win.info('Setting changed: ' + field.attr('name') + ' - ' + value);


			// update active session
			App.Settings.set(field.attr('name'), value);

			if (apiDataChanged) {
				App.vent.trigger('initHttpApi');
			}

			//save to db
			App.Database.update('settings', {
					key: field.attr('name')
				}, {
					value: value
				})
				.then(function () {
					that.ui.success_alert.show().delay(3000).fadeOut(400);
				});

			// authentification handling
			var authPackages = this.model.get('authPackages');

			var myAuthRequired = _.find(authPackages, function (element) {
				return _.find(element.inputElements, function (item) {
					return item._ref === field.attr('name');
				});
			});
			if (myAuthRequired) {

				// we confirm we have all value...
				var haveAllValues = true;
				var dataMapping = {};
				_.each(myAuthRequired.inputElements, function (element) {

					var val = $('#' + element._css).val();
					if (val.length === 0) {
						haveAllValues = false;
					} else {
						dataMapping[element._key] = val;
					}

				});
				if (haveAllValues) {
					var thisPackage = field.attr('data-package');

					$('.package_' + thisPackage + ' .authentification .invalid-cross').hide();
					$('.package_' + thisPackage + ' .authentification .valid-tick').hide();
					$('.package_' + thisPackage + ' .authentification .loading-spinner').show();

					myAuthRequired.signinHandler(dataMapping)
						.then(function (valid) {
							$('.package_' + thisPackage + ' .authentification .loading-spinner').hide();
							// Stop multiple requests interfering with each other
							$('.package_' + thisPackage + ' .authentification .invalid-cross').hide();
							$('.package_' + thisPackage + ' .authentification .valid-tick').hide();
							if (valid) {
								$('.package_' + thisPackage + ' .authentification .valid-tick').show().delay(2000).queue(function () {
									self.render().dequeue;
								});
							} else {
								$('.package_' + thisPackage + ' .authentification .invalid-cross').show();
							}
						}).catch(function (err) {
							$('.package_' + thisPackage + ' .authentification .loading-spinner').hide();
							$('.package_' + thisPackage + ' .authentification .invalid-cross').show();
						});

				}

			}

			that.syncSetting(field.attr('name'), value);
		},


		signout: function (e) {
			var self = this;
			var btn = $(e.currentTarget);

			if (!that.areYouSure(btn, i18n.__('Signin out'))) {
				return;
			}

			var myPackage = _.find(this.model.get('authPackages'), function (pack) {
				return pack.package === btn.attr('data-package');
			});
			myPackage.signoutHandler();
			self.ui.success_alert.show().delay(3000).fadeOut(400);
			self.render();
		},

		syncSetting: function (setting, value) {

			switch (setting) {
			case 'coversShowRating':
				if (value) {
					$('.rating').show();
				} else {
					$('.rating').hide();
				}
				break;
			case 'moviesShowQuality':
				if (value) {
					$('.quality').show();
				} else {
					$('.quality').hide();
				}
				break;
			case 'showAdvancedSettings':
				if (value) {
					$('.advanced').css('display', 'flex');
				} else {
					$('.advanced').css('display', 'none');
				}
				break;
			case 'language':
			case 'watchedCovers':
				App.vent.trigger('movies:list');
				App.vent.trigger('settings:show');
				break;
			case 'alwaysOnTop':
				win.setAlwaysOnTop(value);
				break;
			case 'theme':
				//$('head').append('<link rel="stylesheet" href="themes/' + value + '.css" type="text/css" />');
				App.vent.trigger('updatePostersSizeStylesheet');
				break;
			case 'start_screen':
				App.Settings.set('startScreen', value);
				break;
			default:

			}

		},


		flushBookmarks: function (e) {
			var that = this;
			var btn = $(e.currentTarget);

			if (!that.areYouSure(btn, i18n.__('Flushing bookmarks...'))) {
				return;
			}

			that.alertMessageWait(i18n.__('We are flushing your database'));

			Database.deleteBookmarks()
				.then(function () {
					that.alertMessageSuccess(true);
				});
		},

		resetSettings: function (e) {
			var that = this;
			var btn = $(e.currentTarget);

			if (!that.areYouSure(btn, i18n.__('Resetting...'))) {
				return;
			}

			that.alertMessageWait(i18n.__('We are resetting the settings'));

			App.Database.delete('settings', {}, true)
				.then(function () {
					that.alertMessageSuccess(true);
					App.Settings.set('disclaimerAccepted', 1);
				});
		},

		flushAllDatabase: function (e) {
			var that = this;
			var btn = $(e.currentTarget);

			if (!that.areYouSure(btn, i18n.__('Flushing...'))) {
				return;
			}

			that.alertMessageWait(i18n.__('We are flushing your databases'));
			App.CacheV2.deleteDatabase()
				.then(function () {
					App.Database.deleteDatabase()
						.then(function () {
							that.alertMessageSuccess(true);
						});
				});
		},

		restartApplication: function () {
			var spawn = require('child_process').spawn,
				argv = gui.App.fullArgv,
				CWD = process.cwd();

			argv.push(CWD);
			spawn(process.execPath, argv, {
				cwd: CWD,
				detached: true,
				stdio: ['ignore', 'ignore', 'ignore']
			}).unref();
			gui.App.quit();
		},

		showCacheDirectoryDialog: function () {
			var that = this;
			that.ui.tempDir.click();
		},

		openTmpFolder: function () {
			console.log('Opening: ' + App.Settings.get('tmpLocation'));
			gui.Shell.openItem(App.Settings.get('tmpLocation'));
		},

		openDatabaseFolder: function () {
			console.log('Opening: ' + App.Settings.get('databaseLocation'));
			gui.Shell.openItem(App.Settings.get('databaseLocation'));
		},

		exportDatabase: function (e) {
			var that = this;
			var zip = new AdmZip();
			var btn = $(e.currentTarget);
			var databaseFiles = fs.readdirSync(App.Settings.get('databaseLocation'));

			databaseFiles.forEach(function (entry) {
				zip.addLocalFile(App.Settings.get('databaseLocation') + '/' + entry);
			});

			fdialogs.saveFile(zip.toBuffer(), function (err, path) {
				that.alertMessageWait(i18n.__('Exporting Database...'));
				console.log('Database exported to:', path);
				that.alertMessageSuccess(false, btn, i18n.__('Export Database'), i18n.__('Database Successfully Exported'));
			});

		},

		importDatabase: function () {
			var that = this;

			fdialogs.readFile(function (err, content, path) {

				that.alertMessageWait(i18n.__('Importing Database...'));

				try {
					var zip = new AdmZip(content);

					zip.extractAllTo(App.Settings.get('databaseLocation') + '/', /*overwrite*/ true);
					that.alertMessageSuccess(true);
				} catch (err) {

					that.alertMessageFailed(i18n.__('Invalid PCT Database File Selected'));
					console.log('Failed to Import Database');
				}


			});


		},

		updateCacheDirectory: function (e) {
			// feel free to improve/change radically!
			var that = this;
			var field = $('#tmpLocation');
			that.ui.fakeTempDir.val = field.val();
			that.render();
		},

		areYouSure: function (btn, waitDesc) {
			if (!btn.hasClass('confirm')) {
				btn.addClass('confirm').css('width', btn.css('width')).text(i18n.__('Are you sure?'));
				return false;
			}
			btn.text(waitDesc).addClass('disabled').prop('disabled', true);
			return true;
		},

		alertMessageWait: function (waitDesc) {
			var $el = $('#notification');

			$el.removeClass().addClass('red').show();
			$el.html('<h1>' + i18n.__('Please wait') + '...</h1><p>' + waitDesc + '.</p>');

			$('body').addClass('has-notification');
		},

		alertMessageSuccess: function (btnRestart, btn, btnText, successDesc) {
			var that = this;
			var $el = $('#notification');

			$el.removeClass().addClass('green');
			$el.html('<h1>' + i18n.__('Success') + '</h1>');

			if (btnRestart) {
				// Add restart button
				$el.append('<p>' + i18n.__('Please restart your application') + '.</p><span class="btn-grp"><a class="btn restart">' + i18n.__('Restart') + '</a></span>');
				$('.btn.restart').on('click', function () {
					that.restartApplication();
				});
			} else {
				// Hide notification after 2 seconds
				$el.append('<p>' + successDesc + '.</p>');
				setTimeout(function () {
					btn.text(btnText).removeClass('confirm disabled').prop('disabled', false);
					$('body').removeClass('has-notification');
					$el.hide();
				}, 3000);
			}
		},

		alertMessageFailed: function (errorDesc) {

			var $el = $('#notification');

			$el.html('<h1>' + i18n.__('Error') + '</h1>');

			// Hide notification after 5 seconds
			$el.append('<p>' + errorDesc + '.</p>');
			setTimeout(function () {

				$('body').removeClass('has-notification');
				$el.hide();

			}, 5000);

		},

		getIPAddress: function () {
			var ifaces = require('os').networkInterfaces();
			var ip;
			for (var dev in ifaces) {
				var alias = 0;
				ifaces[dev].forEach(function (details) {
					if (details.family === 'IPv4') {
						if (!/(loopback|vmware|internal|hamachi)/gi.test(dev + (alias ? ':' + alias : ''))) {
							if ((details.address.substring(0, 8) === '192.168.') || (details.address.substring(0, 7) === '172.16.') || (details.address.substring(0, 5) === '10.0.')) {
								ip = details.address;
								++alias;
							}
						}
					}
				});

			}
			return ip;
		}

	});

	App.View.Settings = Settings;
})(window.App);
