var fs = require('fs-plus');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {

	grunt.registerTask('mknsis', 'Generate Windows Installer', function() {

        var exec = require('child_process').exec;

        var cmd = "C:/psmodules/makensis.exe";
        var rootPath = grunt.config.get('popcorntime.rootPath');
		if (fs.isFileSync(cmd)) {
			return exec(cmd + ' installer.nsi', options = {
				cwd: path.join(rootPath, 'dist', 'windows'),
				maxBuffer: Infinity
			}, function(error, stdout, stderr) {
			grunt.log.ok("Windows Installer created");
		});
		} else {
			grunt.log.ok("C:/psmodules/makensis.exe not found");
		}
		return;
	});
}
