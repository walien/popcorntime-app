var fs = require('fs');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {

	grunt.registerTask('clean-releases', 'Clean releases', function() {
		var rm = require('./task-helper')(grunt).rm;

        var buildDir = grunt.config.get('popcorntime.buildDir');
        var cacheDir = grunt.config.get('popcorntime.cacheDir');

        rm(path.join(buildDir));
        rm(path.join(cacheDir));

        return;
	});
}
