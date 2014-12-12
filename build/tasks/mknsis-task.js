var fs = require('fs-plus');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {

	grunt.registerTask('mknsis', 'Generate Windows Installer', function() {
		var done = this.async();

        var exec = require('child_process').exec;

        var cmd = "C:/psmodules/makensis.exe";
        var rootPath = grunt.config.get('popcorntime.rootPath');
		if (fs.isFileSync(cmd)) {
			return exec(cmd + ' ' + path.join('dist','windows','installer.nsi'), options = {
				cwd: path.join(rootPath),
				maxBuffer: Infinity
			}, function(error, stdout, stderr) {
				console.log(stdout);
				if (error) {
					console.log(error);
					process.exit(1);
				}
				grunt.log.ok("Windows Installer created");
				return done();
		});
		} else {
			grunt.log.ok("C:/psmodules/makensis.exe not found");
			return done();
		}
	});
}
