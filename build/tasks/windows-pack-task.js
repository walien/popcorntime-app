var fs = require('fs');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {

	grunt.registerTask('windows-pack', 'Copy windows files for the build', function() {
		var cp = require('./task-helper')(grunt).cp;
		var rm = require('./task-helper')(grunt).rm;

        var buildDir = grunt.config.get('popcorntime.buildDir');
        var cacheDir = grunt.config.get('popcorntime.cacheDir');

        var files = [
            'package.json',
            'LICENSE.txt',
            'node_modules',
            'ppm',
            'src'
        ];

        // copy default file
        _.each(files, function(file) {
            rm(path.join(buildDir, file));
            cp(path.join(cacheDir, file), path.join(buildDir, file));
        });

        return;
	});
}
