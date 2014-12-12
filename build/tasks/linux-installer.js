module.exports = function(grunt) {

	grunt.registerTask('linux-installer', 'Generate Linux Installer', function() {
		var done = this.async();

        var rootPath = grunt.config.get('popcorntime.rootPath');
        var buildDir = grunt.config.get('popcorntime.buildDir');

        var exec = require('child_process').exec;

        // call linux-installer with buildDir arg
        return exec('scripts/linux-installer ' + buildDir, {
            cwd: rootPath,
            maxBuffer: Infinity
        }, function(error, stdout, stderr) {
            if (error) {
                process.exit(1);
            }
            grunt.log.ok("Linux Installer created");
            return done();
        });

	});
}
