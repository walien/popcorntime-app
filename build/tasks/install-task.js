var fs = require('fs');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {

	grunt.registerTask('install', 'Install Popcorn Time', function() {

        var buildDir = grunt.config.get('popcorntime.buildDir');
        var cacheDir = grunt.config.get('popcorntime.cacheDir');
        var installDir = grunt.config.get('popcorntime.installDir');

        if (process.platform === 'linux') {
            // only support linux for now
            var binDir = path.join(installDir, 'bin');
            var shareDir = path.join(installDir, 'share', 'Popcorn-Time');
            var binDir = path.join(installDir, 'bin');
            var iconName = path.join(shareDir, 'src', 'app', 'images', 'icon.png');

            mkdir(binDir);
            rm(shareDir);
            mkdir(path.dirname(shareDir))

            cp(buildDir, shareDir);

            process.chdir(binDir);
            rm('ppm');
            fs.symlinkSync(path.join('..', 'share', 'Popcorn-Time', 'ppm', 'node_modules', '.bin', 'ppm'), 'ppm')
        }


        return;
	});
}
