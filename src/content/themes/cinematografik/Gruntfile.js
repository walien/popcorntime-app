module.exports = function (grunt) {
    "use strict";
    
    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', [
        'stylus:offical'
    ]);
    grunt.initConfig({
        stylus: {
            offical: {
                options: {
                    'resolve url': true,
                    use: ['nib'],
                    compress: false,
                    paths: ['assets/styl']
                },
                expand: true,
                cwd: 'assets/styl',
                src: '*.styl',
                dest: 'assets/css',
                ext: '.css'
            }
        }

    });

};
