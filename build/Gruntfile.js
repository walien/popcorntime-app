var path = require('path');
var _ = require('lodash');
var parseBuildPlatforms = function () {
    var inputPlatforms = process.platform + ";" + process.arch;
    inputPlatforms = inputPlatforms.replace("darwin", "mac");
    inputPlatforms = inputPlatforms.replace(/;ia|;x|;arm/, "");

    var buildPlatforms = {
        mac: /mac/.test(inputPlatforms),
        win: /win/.test(inputPlatforms),
        linux: /linux/.test(inputPlatforms),
        linux32: /linux32/.test(inputPlatforms),
        linux64: /linux64/.test(inputPlatforms)
    };

    return buildPlatforms;
};

var helper = {
    include: function(file) {
        return __dirname + '/../' + file ;
    },
    exclude: function(file) {
        return '!' + __dirname + '/../' + file ;
    }
};

var getBuildDir = function(platforms) {
    var dir = [];
    if (platforms.mac) {
        return path.join(__dirname, 'releases/Popcorn-Time/mac/');
    }
    if (platforms.win) {
        return path.join(__dirname, 'releases/Popcorn-Time/win/');
    }
    if (platforms.linux32) {
        return path.join(__dirname, 'releases/Popcorn-Time/linux32/');
    }
    if (platforms.linux64) {
        return path.join(__dirname, 'releases/Popcorn-Time/linux64/');
    }
    return [];
}

var buildFiles = [

    // main includes
    helper.include('src/**'),
    helper.include('ppm/**'),
    helper.include('node_modules/**'),

    // put files to exlude in the build here
    helper.exclude('node_modules/bower/**'),
    helper.exclude('node_modules/*grunt*/**'),
    helper.exclude('**/tests/*.xml'),
    helper.exclude('**/samples/*.json'),
    helper.exclude('**/oniguruma/deps/**'),
    helper.exclude('**/git-utils/deps/**'),
    helper.exclude('**/bootstrap/_config.yml'),
    helper.exclude('**/bootstrap/_includes/**'),
    helper.exclude('**/bootstrap/_layouts/**'),
    helper.exclude('**/npm/doc/**'),
    helper.exclude('**/npm/html/**'),
    helper.exclude('**/npm/node_modules/.bin/beep'),
    helper.exclude('**/npm/node_modules/.bin/clear'),
    helper.exclude('**/npm/node_modules/.bin/starwars'),
    helper.exclude('**/pegjs/examples/**'),
    helper.exclude('**/test/**'),
    helper.exclude('**/doc/**'),
    helper.exclude('**/example/**'),
    helper.exclude('**/build/binding.Makefile'),
    helper.exclude('**/build/config.gypi'),
    helper.exclude('**/build/gyp-mac-tool'),
    helper.exclude('**/build/Makefile'),
    helper.exclude('**/build/Release/obj.target'),
    helper.exclude('**/build/Release/obj'),
    helper.exclude('**/build/Release/.deps'),
    helper.exclude('**/demo*/**'),
    helper.exclude('node_modules/**/build/**'),
    helper.exclude('node_modules/**/bin/**'),
    helper.exclude('.*/**'),

    // make sure we have these files
    helper.include('README.md'),
    helper.include('package.json'),
    helper.include('LICENSE.txt'),
    helper.include('.git.json'),
];

module.exports = function (grunt) {
    "use strict";
    var contentsDir, appDir, installDir, killCommand, appName, shellAppDir;
    var buildPlatforms = parseBuildPlatforms();
    var pkgJson = grunt.file.readJSON('../package.json');
    var currentVersion = pkgJson.version;
    var buildDir = getBuildDir(buildPlatforms);

    if (process.platform === 'darwin') {
        appName = 'Popcorn-Time.app'
    } else {
        appName = 'Popcorn-Time'
    }

    shellAppDir = path.join(buildDir, appName)

    if (process.platform === 'win32') {

        // we need to move it to build/win/Popcorn-Time
        // then we generate our exe much better, because the
        // current dist didnt allow us to build and use it,
        // without NSIS

        contentsDir = shellAppDir;
        appDir = shellAppDir;

    }else if (process.platform === 'darwin') {

        contentsDir = path.join(shellAppDir, 'Contents')
        appDir = path.join(contentsDir, 'Resources', 'app.nw');

    }else {

        contentsDir = shellAppDir
        appDir = path.join(shellAppDir, 'Popcorn-Time');

    }

    grunt.loadNpmTasks('grunt-node-webkit-builder');
    grunt.loadNpmTasks('grunt-shell');

    grunt.loadTasks('tasks');

    grunt.initConfig({

        popcorntime: {
            // return an object of platforms to build
            buildPlatforms: buildPlatforms,
            // current PT version from package.json
            currentVersion: currentVersion,
            // source root path
            rootPath: path.join(__dirname, ".."),
            // wheres the build are located
            buildDir: buildDir,
            // wheres the build contents
            contentsDir: contentsDir,
            // full path to bundled app
            shellAppDir: shellAppDir,
        },

        nodewebkit: {
            options: {
                version: '0.9.2',
                build_dir:  __dirname, // Where the build version of my node-webkit app is saved
                keep_nw: true,
                embed_nw: false,
                mac_icns: __dirname + '/../src/app/images/popcorntime.icns', // Path to the Mac icon file
                macZip: buildPlatforms.win, // Zip nw for mac in windows. Prevent path too long if build all is used.
                mac: buildPlatforms.mac,
                win: buildPlatforms.win,
                linux32: buildPlatforms.linux32,
                linux64: buildPlatforms.linux64,
                download_url: 'http://get.popcorntime.io/nw/'
            },
            src: buildFiles
        },

        shell: {
			submodule: {
				command: 'git submodule update --init',
                options: {
                    stderr: false,
                    execOptions: {
                        cwd: '../'
                    }
                }
			}
        }

    });

    var buildTasks = ['shell:submodule','nodewebkit'];
    var ciTasks = ['shell:submodule','nodewebkit'];

    ciTasks.push('publish-build');

    return grunt.registerTask('ci', ciTasks);
    return grunt.registerTask('default', buildTasks);

};
