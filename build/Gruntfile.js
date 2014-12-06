var parseBuildPlatforms = function () {
    if (process.platform === 'linux') {
        return process.platform + process.arch
    } else if (process.platform === 'darwin')  {
        return 'osx';
    } else {
        return process.platform
    }
};

module.exports = function (grunt) {
    "use strict";

    var buildPlatforms = parseBuildPlatforms();
    var pkgJson = grunt.file.readJSON('../package.json');
    var currentVersion = pkgJson.version;

    grunt.loadNpmTasks('grunt-node-webkit-builder');

    grunt.initConfig({

        nodewebkit: {
            options: {
                version: '0.9.2',
                buildDir: __dirname,
                macIcns: __dirname + '/../src/app/images/popcorntime.icns', // Path to the Mac icon file
                macZip: false,
                platforms: [buildPlatforms],
                downloadUrl: 'http://get.popcorntime.io/nw/'
            },
            src: [__dirname +  '/../src/**',
            __dirname + '/../node_modules/**', '!'+__dirname+'/../node_modules/bower/**', '!'+__dirname+'/../node_modules/*grunt*/**',
            '!'+__dirname+'/../**/test*/**', '!'+__dirname+'/../**/doc*/**', '!'+__dirname+'/../**/example*/**', '!'+__dirname+'/../**/demo*/**', '!'+__dirname+'/../**/bin/**', '!'+__dirname+'/../**/build/**', '!'+__dirname+'/../**/.*/**',
            __dirname + '/../package.json', __dirname + '/../README.md', __dirname + '/../LICENSE.txt', __dirname + '/../.git.json', __dirname + '/../ppm/**'
            ]
        },

    });

    var ciTasks = ['nodewebkit'];

    return grunt.registerTask('default', ciTasks);

};
