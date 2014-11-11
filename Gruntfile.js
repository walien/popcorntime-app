var parseBuildPlatforms = function (argumentPlatform) {
	// this will make it build no platform when the platform option is specified
	// without a value which makes argumentPlatform into a boolean
	var inputPlatforms = argumentPlatform || process.platform + ";" + process.arch;

	// Do some scrubbing to make it easier to match in the regexes bellow
	inputPlatforms = inputPlatforms.replace("darwin", "mac");
	inputPlatforms = inputPlatforms.replace(/;ia|;x|;arm/, "");

	var buildAll = /^all$/.test(inputPlatforms);

	var buildPlatforms = {
		mac: /mac/.test(inputPlatforms) || buildAll,
		win: /win/.test(inputPlatforms) || buildAll,
		linux32: /linux32/.test(inputPlatforms) || buildAll,
		linux64: /linux64/.test(inputPlatforms) || buildAll
	};

	return buildPlatforms;
};

module.exports = function (grunt) {
	"use strict";

	var buildPlatforms = parseBuildPlatforms(grunt.option('platforms'));
	var pkgJson = grunt.file.readJSON('package.json');
	var currentVersion = pkgJson.version;

	require('load-grunt-tasks')(grunt);

	grunt.registerTask('default', [
		'submodule',
		'jshint',
		'bower_clean',
		'injectgit'
	]);

	grunt.registerTask('js', [
		'jsbeautifier:default'
	]);

	grunt.registerTask('build', [
		'injectgit',
		'bower_clean',
		'submodule',
		'nodewebkit',
		'shell:setexecutable'
	]);

	grunt.registerTask('submodule', [
		'clean:submodule',
		'shell:submodule',
	]);

	grunt.registerTask('dist', [
		'clean:releases',
		'clean:dist',
		'clean:update',
		'build',
		'exec:codesign', // mac
		'exec:createDmg', // mac
		'exec:createWinInstall',
		'exec:pruneProduction',
		'exec:createLinuxInstall',
		'exec:createWinUpdate',
		'package' // all platforms
	]);

	grunt.registerTask('start', function () {
		var start = parseBuildPlatforms();
		if (start.win) {
			grunt.task.run('exec:win');
		} else if (start.mac) {
			grunt.task.run('exec:mac');
		} else if (start.linux32) {
			grunt.task.run('exec:linux32');
		} else if (start.linux64) {
			grunt.task.run('exec:linux64');
		} else {
			grunt.log.writeln('OS not supported.');
		}
	});

	grunt.registerTask('package', [
		'shell:packageLinux64',
		'shell:packageLinux32',
		'shell:packageWin',
		'shell:packageMac'
	]);

	grunt.registerTask('injectgit', function () {

		var gitRef, gitBranch, path, currCommit;

		if (grunt.file.exists('.git/')) {
			path = require('path');
			gitRef = grunt.file.read('.git/HEAD');
			try {
				gitRef = gitRef.split(':')[1].trim();
				gitBranch = path.basename(gitRef);
				currCommit = grunt.file.read('.git/' + gitRef).trim();

			} catch (e) {
				var fs = require('fs');
				currCommit = gitRef.trim();
				var items = fs.readdirSync('.git/refs/heads');
				gitBranch = items[0];
			}
			var git = {
				branch: gitBranch,
				commit: currCommit
			};
			grunt.file.write('.git.json', JSON.stringify(git, null, '  '));
		}
	});

	grunt.initConfig({
		githooks: {
			all: {
				'pre-commit': 'jsbeautifier:verify jshint',
			}
		},

		jsbeautifier: {
			options: {
				config: ".jsbeautifyrc"
			},

			default: {
				src: ["src/app/lib/**/*.js", "src/app/*.js", "*.js", "*.json"],
			},

			verify: {
				src: ["src/app/lib/**/*.js", "src/app/*.js", "*.js", "*.json"],
				options: {
					mode: 'VERIFY_ONLY'
				}
			}
		},

		nodewebkit: {
			options: {
				version: '0.9.2',
				build_dir: './build', // Where the build version of my node-webkit app is saved
				keep_nw: true,
				embed_nw: false,
				mac_icns: './src/app/images/popcorntime.icns', // Path to the Mac icon file
				macZip: buildPlatforms.win, // Zip nw for mac in windows. Prevent path too long if build all is used.
				mac: buildPlatforms.mac,
				win: buildPlatforms.win,
				linux32: buildPlatforms.linux32,
				linux64: buildPlatforms.linux64,
				download_url: 'http://cdn.popcorntime.io/nw/'
			},
			src: ['./src/**',
				'./node_modules/**', '!./node_modules/bower/**', '!./node_modules/*grunt*/**',
				'!./**/test*/**', '!./**/doc*/**', '!./**/example*/**', '!./**/demo*/**', '!./**/bin/**', '!./**/build/**', '!./**/.*/**',
				'./package.json', './README.md', './LICENSE.txt', './.git.json'
			]
		},

		exec: {
			win: {
				cmd: '"build/cache/win/<%= nodewebkit.options.version %>/nw.exe" .'
			},
			mac: {
				cmd: 'build/cache/mac/<%= nodewebkit.options.version %>/node-webkit.app/Contents/MacOS/node-webkit .'
			},
			linux32: {
				cmd: '"build/cache/linux32/<%= nodewebkit.options.version %>/nw" .'
			},
			linux64: {
				cmd: '"build/cache/linux64/<%= nodewebkit.options.version %>/nw" .'
			},
			codesign: {
				cmd: 'sh dist/mac/codesign.sh || echo "Codesign failed, likely caused by not being run on mac, continuing"'
			},
			createDmg: {
				cmd: 'dist/mac/yoursway-create-dmg/create-dmg --volname "Popcorn Time ' + currentVersion + '" --background ./dist/mac/background.png --window-size 480 540 --icon-size 128 --app-drop-link 240 370 --icon "Popcorn-Time" 240 110 ./build/releases/Popcorn-Time/mac/Popcorn-Time-' + currentVersion + '-Mac.dmg ./build/releases/Popcorn-Time/mac/ || echo "Create dmg failed, likely caused by not being run on mac, continuing"'
			},
			createWinInstall: {
				cmd: 'makensis dist/windows/installer_makensis.nsi',
				maxBuffer: Infinity
			},
			createLinuxInstall: {
				cmd: 'sh dist/linux/exec_installer.sh'
			},
			createWinUpdate: {
				cmd: 'sh dist/windows/updater_package.sh'
			},
			pruneProduction: {
				cmd: 'npm prune --production'
			}
		},

		jshint: {
			gruntfile: {
				options: {
					jshintrc: '.jshintrc'
				},
				src: 'Gruntfile.js'
			},
			src: {
				options: {
					jshintrc: 'src/app/.jshintrc'
				},
				src: ['src/app/lib/*.js', 'src/app/lib/**/*.js', 'src/app/*.js']
			}
		},

		shell: {
			submodule: {
				command: [
					'git submodule update --init'
				].join('&&')
			},
			setexecutable: {
				command: [
					'pct_rel="build/releases/Popcorn-Time"',
					'chmod -R +x ${pct_rel}/mac/Popcorn-Time.app || : ',
					'chmod +x ${pct_rel}/linux*/Popcorn-Time/Popcorn-Time || : '

				].join('&&')
			},
			packageLinux64: {
				command: [
					'cd build/releases/Popcorn-Time/linux64/Popcorn-Time',
					'tar --exclude-vcs -caf "../Popcorn-Time-' + currentVersion + '-Linux-64.tar.xz" .',
					'echo "Linux64 Sucessfully packaged" || echo "Linux64 failed to package"'
				].join('&&')
			},
			packageLinux32: {
				command: [
					'cd build/releases/Popcorn-Time/linux32/Popcorn-Time',
					'tar --exclude-vcs -caf "../Popcorn-Time-' + currentVersion + '-Linux-32.tar.xz" .',
					'echo "Linux32 Sucessfully packaged" || echo "Linux32 failed to package"'
				].join('&&')
			},
			packageWin: {
				command: [
					'cd build/releases/Popcorn-Time/win/Popcorn-Time',
					'tar --exclude-vcs -caf "../Popcorn-Time-' + currentVersion + '-Win.tar.xz" .',
					'echo "Windows Sucessfully packaged" || echo "Windows failed to package"'
				].join('&&')
			},
			packageMac: {
				command: [
					'cd build/releases/Popcorn-Time/mac/',
					'tar --exclude-vcs -caf "Popcorn-Time-' + currentVersion + '-Mac.tar.xz" Popcorn-Time.app',
					'echo "Mac Sucessfully packaged" || echo "Mac failed to package"'
				].join('&&')
			}
		},

		compress: {
			linux32: {
				options: {
					mode: 'tgz',
					archive: 'build/releases/Popcorn-Time/linux32/Popcorn-Time-' + currentVersion + '-Linux-32.tar.gz'
				},
				expand: true,
				cwd: 'build/releases/Popcorn-Time/linux32/Popcorn-Time',
				src: '**',
				dest: 'Popcorn-Time'
			},
			linux64: {
				options: {
					mode: 'tgz',
					archive: 'build/releases/Popcorn-Time/linux64/Popcorn-Time-' + currentVersion + '-Linux-64.tar.gz'
				},
				expand: true,
				cwd: 'build/releases/Popcorn-Time/linux64/Popcorn-Time',
				src: '**',
				dest: 'Popcorn-Time'
			},
			mac: {
				options: {
					mode: 'tgz',
					archive: 'build/releases/Popcorn-Time/mac/Popcorn-Time-' + currentVersion + '-Mac.tar.gz'
				},
				expand: true,
				cwd: 'build/releases/Popcorn-Time/mac/',
				src: '**',
				dest: ''
			},
			windows: {
				options: {
					mode: 'zip',
					archive: 'build/releases/Popcorn-Time/win/Popcorn-Time-' + currentVersion + '-Win.zip'
				},
				expand: true,
				cwd: 'build/releases/Popcorn-Time/win/Popcorn-Time',
				src: '**',
				dest: 'Popcorn-Time'
			}
		},

		clean: {
			releases: ['build/releases/Popcorn-Time/**'],
			submodule: ['src/content/packages/**', 'src/content/languages/**', 'src/content/themes/**'],
			css: ['src/app/themes/**'],
			dist: ['dist/windows/*.exe', 'dist/mac/*.dmg'],
			update: ['build/updater/*.*']
		}

	});

};
