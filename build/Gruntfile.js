var parseBuildPlatforms = function () {
    var inputPlatforms = process.platform + ";" + process.arch;
    inputPlatforms = inputPlatforms.replace("darwin", "mac");
    return inputPlatforms.replace(/;ia|;x|;arm/, "");
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
                build_dir:  __dirname, // Where the build version of my node-webkit app is saved
                keep_nw: true,
                embed_nw: false,
                mac_icns: __dirname + '/../src/app/images/popcorntime.icns', // Path to the Mac icon file
                macZip: buildPlatforms.win, // Zip nw for mac in windows. Prevent path too long if build all is used.
                platforms: [buildPlatforms],
                download_url: 'http://get.popcorntime.io/nw/'
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
