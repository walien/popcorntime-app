var fs, path,
__slice = [].slice;
fs = require('fs-plus');
path = require('path');
module.exports = function(grunt) {
    return {
        cp: function(source, destination, _arg) {
            var copyFile, error, filter, onDirectory, onFile;
            filter = (_arg != null ? _arg : {}).filter;
            if (!grunt.file.exists(source)) {
                grunt.fatal("Cannot copy non-existent " + source.cyan + " to " + destination.cyan);
            }
            copyFile = function(sourcePath, destinationPath) {
                var stats;
                if ((typeof filter === "function" ? filter(sourcePath) : void 0) || (filter != null ? typeof filter.test === "function" ? filter.test(sourcePath) : void 0 : void 0)) {
                    return;
                }
                stats = fs.lstatSync(sourcePath);
                if (stats.isSymbolicLink()) {
                    grunt.file.mkdir(path.dirname(destinationPath));
                    fs.symlinkSync(fs.readlinkSync(sourcePath), destinationPath);
                } else if (stats.isFile()) {
                    grunt.file.copy(sourcePath, destinationPath);
                }
                if (grunt.file.exists(destinationPath)) {
                    return fs.chmodSync(destinationPath, fs.statSync(sourcePath).mode);
                }
            };
            if (grunt.file.isFile(source)) {
                copyFile(source, destination);
            } else {
                try {
                    onFile = function(sourcePath) {
                        var destinationPath;
                        destinationPath = path.join(destination, path.relative(source, sourcePath));
                        return copyFile(sourcePath, destinationPath);
                    };
                    onDirectory = function(sourcePath) {
                        var destinationPath;
                        if (fs.isSymbolicLinkSync(sourcePath)) {
                            destinationPath = path.join(destination, path.relative(source, sourcePath));
                            copyFile(sourcePath, destinationPath);
                            return false;
                        } else {
                            return true;
                        }
                    };
                    fs.traverseTreeSync(source, onFile, onDirectory);
                } catch (_error) {
                    error = _error;
                    grunt.fatal(error);
                }
            }
            return grunt.verbose.writeln("Copied " + source.cyan + " to " + destination.cyan + ".");
        },
        mkdir: function() {
            var args, _ref;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            return (_ref = grunt.file).mkdir.apply(_ref, args);
        },
        rm: function() {
            var args, _ref, _ref1;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            if ((_ref = grunt.file).exists.apply(_ref, args)) {
                return (_ref1 = grunt.file)["delete"].apply(_ref1, __slice.call(args).concat([{
                    force: true
                }]));
            }
        },
        spawn: function(options, callback) {
            var childProcess, error, proc, stderr, stdout;
            childProcess = require('child_process');
            stdout = [];
            stderr = [];
            error = null;
            proc = childProcess.spawn(options.cmd, options.args, options.opts);
            proc.stdout.on('data', function(data) {
                return stdout.push(data.toString());
            });
            proc.stderr.on('data', function(data) {
                return stderr.push(data.toString());
            });
            proc.on('error', function(processError) {
                return error != null ? error : error = processError;
            });
            return proc.on('close', function(exitCode, signal) {
                var results;
                if (exitCode !== 0) {
                    if (error == null) {
                        error = new Error(signal);
                    }
                }
                results = {
                    stderr: stderr.join(''),
                    stdout: stdout.join(''),
                    code: exitCode
                };
                if (exitCode !== 0) {
                    grunt.log.error(results.stderr);
                }
                return callback(error, results, exitCode);
            });
        },
        isPopcornPackage: function(packagePath) {
            var engines, error;
            try {
                engines = grunt.file.readJSON(path.join(packagePath, 'package.json')).engines;
                return (engines != null ? engines.popcorntime : void 0) != null;
            } catch (error) {
                return false;
            }
        }
    };
};
