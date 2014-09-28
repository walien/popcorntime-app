(function (App) {
    'use strict';
    var clipboard = gui.Clipboard.get();

    var AdmZip = require('adm-zip');
    var fdialogs = require('node-webkit-fdialogs');
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
            'click .flush-subtitles': 'flushAllSubtitles',
            'click #faketmpLocation': 'showCacheDirectoryDialog',
            'click .default-settings': 'resetSettings',
            'click .open-tmp-folder': 'openTmpFolder',
            'click .open-database-folder': 'openDatabaseFolder',
            'click .export-database': 'exportDatabase',
            'click .import-database': 'inportDatabase',
            'keyup #traktUsername': 'checkTraktLogin',
            'keyup #traktPassword': 'checkTraktLogin',
            'click #unauthTrakt': 'disconnectTrakt',
            'change #tmpLocation': 'updateCacheDirectory',
            'click #syncTrakt': 'syncTrakt',
            'click .qr-code': 'generateQRcode',
            'click #qrcode-overlay': 'closeModal',
            'click #qrcode-close': 'closeModal'
        },

        onShow: function () {

            this.render();

            $('.filter-bar').hide();
            $('#movie-detail').hide();
            $('#header').addClass('header-shadow');
            Mousetrap.bind('backspace', function (e) {
                App.vent.trigger('settings:close');
            });
            that = this;

        },

        onRender: function () {
            if (App.settings.showAdvancedSettings) {
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
                ip: require('my-local-ip')(),
                port: $('#httpApiPort').val(),
                user: $('#httpApiUsername').val(),
                pass: $('#httpApiPassword').val()
            };
            var qrcodecanvus = document.getElementById('qrcode');
            qrcodecanvus.width = qrcodecanvus.width;
            $('#qrcode').qrcode({
                'text': JSON.stringify(QRCodeInfo)
            });
            $('#qrcode-modal, #qrcode-overlay').show('slow');
        },

        closeModal: function () {
            $('#qrcode-modal, #qrcode-overlay').hide('slow');
        },

        showHelp: function () {
            App.vent.trigger('help:toggle');
        },

        showKeyboard: function () {
            App.vent.trigger('keyboard:toggle');
        },

        saveSetting: function (e) {
            var value = false;
            var data = {};

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
            case 'traktUsername':
            case 'traktPassword':
                return;
            case 'tmpLocation':
                value = path.join(field.val(), 'Popcorn-Time');
                break;
            default:
                win.warn('Setting not defined: ' + field.attr('name'));
            }
            win.info('Setting changed: ' + field.attr('name') + ' - ' + value);


            // update active session
            App.settings[field.attr('name')] = value;

            if (apiDataChanged) {
                App.vent.trigger('initHttpApi');
            }

            //save to db
            App.db.writeSetting({
                key: field.attr('name'),
                value: value
            }, function () {
                that.ui.success_alert.show().delay(3000).fadeOut(400);
            });
            that.syncSetting(field.attr('name'), value);
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
                $('head').append('<link rel="stylesheet" href="themes/' + value + '.css" type="text/css" />');
                App.vent.trigger('updatePostersSizeStylesheet');
                break;
            case 'start_screen':
                AdvSettings.set('startScreen', value);
                break;
            default:

            }

        },
        checkTraktLogin: _.debounce(function (e) {
            var self = this;
            var username = document.querySelector('#traktUsername').value;
            var password = document.querySelector('#traktPassword').value;

            if (username === '' || password === '') {
                return;
            }

            $('.invalid-cross').hide();
            $('.valid-tick').hide();
            $('.loading-spinner').show();
            // trakt.authenticate automatically saves the username and pass on success!
            App.Trakt.authenticate(username, password).then(function (valid) {
                $('.loading-spinner').hide();
                // Stop multiple requests interfering with each other
                $('.invalid-cross').hide();
                $('.valid-tick').hide();
                if (valid) {
                    $('.valid-tick').show().delay(2000).queue(function () {
                        self.render().dequeue;
                    });
                } else {
                    $('.invalid-cross').show();
                }
            }).catch(function (err) {
                $('.loading-spinner').hide();
                $('.invalid-cross').show();
            });
        }, 750),

        disconnectTrakt: function (e) {
            var self = this;

            App.settings['traktUsername'] = '';
            App.settings['traktPassword'] = '';
            App.Trakt.authenticated = false;

            App.db.writeSetting({
                key: 'traktUsername',
                value: ''
            }, function () {
                App.db.writeSetting({
                    key: 'traktPassword',
                    value: ''
                }, function () {
                    self.ui.success_alert.show().delay(3000).fadeOut(400);
                });
            });

            _.defer(function () {
                App.Trakt = App.Providers.get('Trakttv');
                self.render();
            });
        },

        flushBookmarks: function (e) {
            var that = this;
            var btn = $(e.currentTarget);

            if (!that.areYouSure(btn, i18n.__('Flushing bookmarks...'))) {
                return;
            }

            that.alertMessageWait(i18n.__('We are flushing your database'));

            Database.deleteBookmarks(function (err, setting) {

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

            Database.resetSettings(function (err, setting) {

                that.alertMessageSuccess(true);
                AdvSettings.set('disclaimerAccepted', 1);

            });
        },

        flushAllDatabase: function (e) {
            var that = this;
            var btn = $(e.currentTarget);

            if (!that.areYouSure(btn, i18n.__('Flushing...'))) {
                return;
            }

            that.alertMessageWait(i18n.__('We are flushing your databases'));

            Database.deleteDatabases(function (err, setting) {

                that.alertMessageSuccess(true);

            });
        },

        flushAllSubtitles: function (e) {
            var that = this;
            var btn = $(e.currentTarget);

            if (!that.areYouSure(btn, i18n.__('Flushing...'))) {
                return;
            }

            that.alertMessageWait(i18n.__('We are flushing your subtitle cache'));

            var cache = new App.Cache('subtitle');
            cache.flushTable(function () {

                that.alertMessageSuccess(false, btn, i18n.__('Flush subtitles cache'), i18n.__('Subtitle cache deleted'));

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
            console.log('Opening: ' + App.settings['tmpLocation']);
            gui.Shell.openItem(App.settings['tmpLocation']);
        },

        openDatabaseFolder: function () {
            console.log('Opening: ' + App.settings['databaseLocation']);
            gui.Shell.openItem(App.settings['databaseLocation']);
        },

        exportDatabase: function (e) {
            var that = this;
            var zip = new AdmZip();
            var btn = $(e.currentTarget);
            var databaseFiles = fs.readdirSync(App.settings['databaseLocation']);

            databaseFiles.forEach(function (entry) {
                zip.addLocalFile(App.settings['databaseLocation'] + '/' + entry);
            });

            fdialogs.saveFile(zip.toBuffer(), function (err, path) {
                that.alertMessageWait(i18n.__('Exporting Database...'));
                console.log('Database exported to:', path);
                that.alertMessageSuccess(false, btn, i18n.__('Export Database'), i18n.__('Database Successfully Exported'));
            });

        },

        inportDatabase: function () {
            var that = this;

            fdialogs.readFile(function (err, content, path) {

                that.alertMessageWait(i18n.__('Importing Database...'));

                try {
                    var zip = new AdmZip(content);

                    zip.extractAllTo(App.settings['databaseLocation'] + '/', /*overwrite*/ true);
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

        syncTrakt: function() {
            $('#syncTrakt').text(i18n.__('Syncing...')).addClass('disabled').prop('disabled', true);

            Promise.all([this.syncShows(), this.syncMovies()])
            .then(function() {
                $('#syncTrakt').text(i18n.__('Done')).removeClass('disabled').addClass('green').delay(3000).queue(function () {
                    $('#syncTrakt').text(i18n.__('Sync With Trakt')).removeClass('green').prop('disabled', false);
                    $('#syncTrakt').dequeue();
                });
            })
            .catch(function(err) {
                win.error(err);
                $('#syncTrakt').text(i18n.__('Error')).removeClass('disabled').addClass('red');
            });
        },

        syncShows: function() {
            return Promise.all([this.syncShowsFromTrakt(), this.syncShowsFromLocal()]);
        },

        syncShowsFromTrakt: function() {
            return App.Trakt.show.getWatched()
            .then(function(data) {
                // Format them for insertion
                var watched = [];

                if (data) {
                    var show;
                    var season;
                    for (var d in data) {
                        show = data[d];
                        for (var s in show.seasons) {
                            season = show.seasons[s];
                            for (var e in season.episodes) {
                                watched.push({
                                    tvdb_id: show.tvdb_id.toString(),
                                    show_imdb_id: show.imdb_id.toString(),
                                    season: season.season.toString(),
                                    episode: season.episodes[e].toString(),
                                    type: 'episode',
                                    date: new Date()
                                });
                            }
                        }
                    }
                }

                return watched;
            })
            .then(function(traktWatched) {
                // Insert them locally
                return new Promise(function(resolve, reject) {
                    Database.markEpisodesWatched(traktWatched, function(err, results) {
                        if (err) {
                            return reject(err);
                        }

                        return resolve(results);

                    });
                });
            });
        },

        syncShowsFromLocal: function() {
            return new Promise(function(resolve, reject) {
                Database.getAllEpisodesWatched(function(err, results) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(results);

                });
            })
            .then(function(results) {
                return results.reduce(function(prev, current) {
                    if (current.tvdb_id) {
                        if (!prev[current.tvdb_id]) {
                            prev[current.tvdb_id] = {
                                tvdb_id: current.tvdb_id,
                                episode: []
                            };
                        }

                        prev[current.tvdb_id].episode.push({
                            season: current.season,
                            episode: current.episode
                        });
                    }

                    return prev;
                }, {});
            })
            .then(function(shows) {

                var promises = Object.keys(shows).map(function(showId){
                    var show = shows[showId];
                    return App.Trakt.show.episodeSeen(show.tvdb_id, show.episode);
                });

                return Promise.all(promises);
            });
        },

        syncMovies: function() {
            return Promise.all([this.syncMoviesFromTrakt(), this.syncMoviesFromLocal()]);
        },

        syncMoviesFromTrakt: function() {
            App.Trakt.movie.getWatched()
            .then(function (data) {
                var watched = [];

                if (data) {
                    var movie;
                    for (var m in data) {
                        movie = data[m];
                        watched.push({
                            movie_id: movie.imdb_id.toString(),
                            date: new Date(),
                            type: 'movie'
                        });
                    }
                }

                return watched;
            })
            .then(function(traktWatched) {
                return new Promise(function(resolve, reject) {
                    Database.markMoviesWatched(traktWatched, function(err, results) {
                        if (err) {
                            return reject(err);
                        }

                        return resolve(results);

                    });
                });
            });
        },

        syncMoviesFromLocal: function() {
            return new Promise(function(resolve, reject) {
                Database.getMoviesWatched(function(err, results) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(results);

                });
            })
            .then(function(results) {
                return results.map(function(item) {
                    return item.movie_id;
                });
            })
            .then(function(movieIds) {
                return App.Trakt.movie.seen(movieIds);
            });
        }
    });

    App.View.Settings = Settings;
})(window.App);