var fs = require('fs-plus');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {

	grunt.registerTask('mknsis', 'Generate Windows Installer', function() {

        var spawn = require('./task-helper')(grunt).spawn;
        var cmd = "C:/psmodules/makensis.exe";
        var rootPath = grunt.config.get('popcorntime.rootPath');
		if (fs.isFileSync(cmd)) {
			return spawn({
	          cmd: cmd,
	          args: [path.join(rootPath, 'dist', 'windows', 'installer.nsi')]
	        });
		} else {
			grunt.log.ok("C:/psmodules/makensis.exe not found");
		}

		return;
	});
}
