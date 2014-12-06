var parseBuildPlatforms = function () {
    var inputPlatforms = process.platform + ";" + process.arch;
    inputPlatforms = inputPlatforms.replace("darwin", "mac");
    inputPlatforms = inputPlatforms.replace(/;ia|;x|;arm/, "");

    var buildPlatforms = {
        mac: /mac/.test(inputPlatforms),
        win: /win/.test(inputPlatforms),
        linux32: /linux32/.test(inputPlatforms),
        linux64: /linux64/.test(inputPlatforms)
    };

    return buildPlatforms;
};

var helper = {
    include: function(file) {
        return __dirname + '/../' + file ;
    },
    exclude: function(file) {
        return '!' + __dirname + '/../' + file ;
    }
};

var buildFiles = [

    // main includes
    helper.include('src/**'),
    helper.include('ppm/**'),
    helper.include('node_modules/**'),

    // put files to exlude in the build here
    helper.exclude('node_modules/bower/**'),
    helper.exclude('node_modules/*grunt*/**'),
    helper.exclude('**/tests/*.xml'),
    helper.exclude('**/samples/*.json'),
    helper.exclude('**/oniguruma/deps'),
    helper.exclude('**/git-utils/deps'),
    helper.exclude('**/bootstrap/_config.yml'),
    helper.exclude('**/bootstrap/_includes/**'),
    helper.exclude('**/bootstrap/_layouts/**'),
    helper.exclude('**/npm/doc'),
    helper.exclude('**/npm/html'),
    helper.exclude('**/npm/node_modules/.bin/beep'),
    helper.exclude('**/npm/node_modules/.bin/clear'),
    helper.exclude('**/npm/node_modules/.bin/starwars'),
    helper.exclude('**/pegjs/examples/**'),
    helper.exclude('**/test*/**'),
    helper.exclude('**/doc*/**'),
    helper.exclude('**/example*/**'),
    helper.exclude('**/build/binding.Makefile'),
    helper.exclude('**/build/config.gypi'),
    helper.exclude('**/build/gyp-mac-tool'),
    helper.exclude('**/build/Makefile'),
    helper.exclude('**/build/Release/obj.target'),
    helper.exclude('**/build/Release/obj'),
    helper.exclude('**/build/Release/.deps'),
    helper.exclude('**/demo*/**'),
    helper.exclude('node_modules/**/build/**'),
    helper.exclude('node_modules/**/bin/**'),
    helper.exclude('.*/**'),
    
    // make sure we have these files
    helper.include('README.md'),
    helper.include('package.json'),
    helper.include('LICENSE.txt'),
    helper.include('.git.json'),
];

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
                mac: buildPlatforms.mac,
                win: buildPlatforms.win,
                linux32: buildPlatforms.linux32,
                linux64: buildPlatforms.linux64,
                download_url: 'http://get.popcorntime.io/nw/'
            },
            src: buildFiles
        },

    });

    var ciTasks = ['nodewebkit'];

    return grunt.registerTask('default', ciTasks);

};
