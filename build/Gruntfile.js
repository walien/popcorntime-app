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

module.exports = function (grunt) {
    "use strict";
    var contentsDir, appDir, installDir, killCommand, appName, shellAppDir;
    var buildPlatforms = parseBuildPlatforms();
    var pkgJson = grunt.file.readJSON('../package.json');
    var currentVersion = pkgJson.version;
    var buildDir = getBuildDir(buildPlatforms);
    var cacheDir = path.join(__dirname, "cache/popcorntime");

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
        installDir = path.join(process.env.ProgramFiles, appName);
        killCommand = 'taskkill /F /IM Popcorn-Time.exe'

    }else if (process.platform === 'darwin') {

        contentsDir = path.join(shellAppDir, 'Contents')
        appDir = path.join(contentsDir, 'Resources', 'app.nw');
        installDir = path.join('/Applications', appName);
        killCommand = 'pkill -9 Popcorn-Time'

    }else {

        contentsDir = shellAppDir
        appDir = path.join(shellAppDir, 'Popcorn-Time');
        installDir = (process.env.INSTALL_PREFIX) ? process.env.INSTALL_PREFIX : '/usr/local';
        killCommand ='pkill -9 Popcron-Time'

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
            // wheres we create our tmp build
            cacheDir: cacheDir,
            // wheres the build contents
            contentsDir: contentsDir,
            // full path to bundled app
            shellAppDir: shellAppDir,
            // PT install dir
            installDir: installDir,
            // Kill command usefull for CI
            killCommand: killCommand
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
            src: [path.join(cacheDir, '**')]
        },

        // to be removed ; submodules SUX!
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

    var buildTasks = ['clean-releases', 'prepare-build','shell:submodule','nodewebkit'];
    var ciTasks = buildTasks;

    // pack windows
    if (process.platform === 'win32') {
        ciTasks.push('windows-pack');
        // disabled till we got our workspace path changed...
        // it's too long and generate issue caused by long path
        //ciTasks.push('mknsis');
    }

    if (process.platform === 'linux') {
        ciTasks.push('mkdeb');
        ciTasks.push('linux-installer');
    }

    ciTasks.push('create-releases');

    return grunt.registerTask('ci', ciTasks);
    return grunt.registerTask('default', buildTasks);

};
