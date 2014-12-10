var fs = require('fs');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {

	grunt.registerTask('prepare-build', 'Prepare the app to be built', function() {
		var cp = require('./task-helper')(grunt).cp;
		var mkdir = require('./task-helper')(grunt).mkdir;
		var rm = require('./task-helper')(grunt).rm;
		var isPopcornPackage = require('./task-helper')(grunt).isPopcornPackage;

        var buildDir = grunt.config.get('popcorntime.buildDir');
        var cacheDir = grunt.config.get('popcorntime.cacheDir');
        var rootDir = grunt.config.get('popcorntime.rootPath');

        // make sure path is empty
        rm(path.join(cacheDir));
        mkdir(path.join(cacheDir));

        // copy default file
        cp(path.join(rootDir, 'package.json'), path.join(cacheDir, 'package.json'));
        cp(path.join(rootDir, 'LICENSE.txt'), path.join(cacheDir, 'LICENSE.txt'));

        var packageDirectories = [];
        var nonPackageDirectories = [];
        var devDependencies = grunt.file.readJSON(path.join(rootDir, 'package.json')).devDependencies;

        var modules = fs.readdirSync(path.join(rootDir, 'node_modules'));

        _.each(modules, function(child) {
            var directory = path.join('node_modules', child);
            if (isPopcornPackage(directory)) {
                packageDirectories.push(directory)
            } else {
                nonPackageDirectories.push(directory)
            }
        });

        var ignoredPaths;
        ignoredPaths = [
            path.join('git-utils', 'deps'),
            path.join('oniguruma', 'deps'),
            path.join('less', 'dist'),
            path.join('bootstrap', 'docs'),
            path.join('bootstrap', '_config.yml'),
            path.join('bootstrap', '_includes'),
            path.join('bootstrap', '_layouts'),
            path.join('npm', 'doc'),
            path.join('npm', 'html'),
            path.join('npm', 'man'),
            path.join('npm', 'node_modules', '.bin', 'beep'),
            path.join('npm', 'node_modules', '.bin', 'clear'),
            path.join('npm', 'node_modules', '.bin', 'starwars'),
            path.join('pegjs', 'examples'),
            path.join('jasmine-reporters', 'ext'),
            path.join('jasmine-node', 'node_modules', 'gaze'),
            path.join('jasmine-node', 'spec'),
            path.join('node_modules', 'nan'),
            path.join('build', 'binding.Makefile'),
            path.join('build', 'config.gypi'),
            path.join('build', 'gyp-mac-tool'),
            path.join('build', 'Makefile'),
            path.join('build', 'Release', 'obj.target'),
            path.join('build', 'Release', 'obj'),
            path.join('build', 'Release', '.deps'),
            path.join('vendor', 'ppm'),
            path.join('resources', 'mac'),
            path.join('resources', 'win'),
            path.join('snippets', 'node_modules', 'loophole'),
            path.join('snippets', 'node_modules', 'pegjs'),
            path.join('snippets', 'node_modules', '.bin', 'pegjs'),
            '.DS_Store',
            '.jshintrc',
            '.npmignore',
            '.pairs',
            '.travis.yml'
        ];

        ignoredPaths = ignoredPaths.map(function(ignoredPath) {
          return _.escapeRegExp(ignoredPath);
        });

        ignoredPaths.push(_.escapeRegExp(path.join('spellchecker', 'vendor', 'hunspell') + path.sep) + ".*");
        ignoredPaths.push(_.escapeRegExp(path.join('build', 'Release') + path.sep) + ".*\\.pdb");
        ignoredPaths.push(_.escapeRegExp(path.join('ctags', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('git-utils', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('keytar', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('nslog', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('oniguruma', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('pathwatcher', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('runas', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('scrollbar-style', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.join('spellchecker', 'src') + path.sep) + ".*\\.(cc|h)*");
        ignoredPaths.push(_.escapeRegExp(path.sep) + "binding\\.gyp$");
        ignoredPaths.push(_.escapeRegExp(path.sep) + ".+\\.target.mk$");
        ignoredPaths.push(_.escapeRegExp(path.sep) + "linker\\.lock$");
        ignoredPaths.push(_.escapeRegExp(path.join('build', 'Release') + path.sep) + ".+\\.node\\.dSYM");

        ignoredPaths = ignoredPaths.map(function(ignoredPath) {
          return "(" + ignoredPath + ")";
        });

        var testFolderPattern = new RegExp("" + (_.escapeRegExp(path.sep)) + "te?sts?" + (_.escapeRegExp(path.sep)));
        var exampleFolderPattern = new RegExp("" + (_.escapeRegExp(path.sep)) + "examples?" + (_.escapeRegExp(path.sep)));
        var benchmarkFolderPattern = new RegExp("" + (_.escapeRegExp(path.sep)) + "benchmarks?" + (_.escapeRegExp(path.sep)));

        var nodeModulesFilter = new RegExp(ignoredPaths.join('|'));
        var filterNodeModule = function(pathToCopy) {
            if (benchmarkFolderPattern.test(pathToCopy)) {
                return true;
            }
            pathToCopy = path.resolve(pathToCopy);
            return nodeModulesFilter.test(pathToCopy) || testFolderPattern.test(pathToCopy) || exampleFolderPattern.test(pathToCopy);
        };

        var packageFilter = new RegExp("(" + (ignoredPaths.join('|')) + ")|(.+\\.(cson|coffee)$)");

        filterPackage = function(pathToCopy) {
            if (benchmarkFolderPattern.test(pathToCopy)) {
                return true;
            }
            pathToCopy = path.resolve(pathToCopy);
            return packageFilter.test(pathToCopy) || testFolderPattern.test(pathToCopy) || exampleFolderPattern.test(pathToCopy);
        };

        _.each(nonPackageDirectories, function(directory) {
            cp(path.join(rootDir, directory), path.join(cacheDir, directory), {
              filter: filterNodeModule
            });
        });

        _.each(packageDirectories, function(directory) {
            cp(path.join(rootDir, directory), path.join(cacheDir, directory), {
              filter: filterPackage
            });
        });

        // copy our APP and PPM
        cp(path.join(rootDir, 'src'), path.join(cacheDir, 'src'));
        cp(path.join(rootDir, 'ppm'), path.join(cacheDir, 'ppm'), {
            filter: filterNodeModule
        });



        return;
	});
}
