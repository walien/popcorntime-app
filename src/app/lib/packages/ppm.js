var _ = require('lodash');
    Q = require('q'),
    semver = require('semver'),
    path = require('path'),
    url = require('url'),
    BufferedProcess = require('./buffer_process');

/*
* Construction
*/
function PPM_Client(options) {

    if (!(this instanceof PPM_Client)) {
        return new PPM_Client(options);
    }

    this.ppmPath = false;
}

PPM_Client.prototype.getPath = function() {
    var commandName = 'ppm';

    if (process.platform === 'win32') {
        commandName += '.cmd'
    }

    // back to our root
    if (!this.ppmPath) {
        this.ppmPath = path.resolve(__dirname, '..', '..', '..', '..', 'ppm', 'node_modules', 'popcorn-package-manager', 'bin', commandName);
    }

    return this.ppmPath;
};

/*
* Paths
*/
PPM_Client.prototype.runCommand = function(args, callback) {
    var command, errorLines, exit, outputLines, stderr, stdout;
    command = this.getPath();
    outputLines = [];
    stdout = function(lines) {
        return outputLines.push(lines);
    };
    errorLines = [];
    stderr = function(lines) {
        return errorLines.push(lines);
    };
    exit = function(code) {
        return callback(code, outputLines.join('\n'), errorLines.join('\n'));
    };
    args.push('--no-color');
    return new BufferedProcess({
        command: command,
        args: args,
        stdout: stdout,
        stderr: stderr,
        exit: exit
    });
};

PPM_Client.prototype.loadPackage = function(packageName, callback) {
    var args;
    args = ['view', packageName, '--json'];
    return this.runCommand(args, function(code, stdout, stderr) {
        var error, packages, _ref;
        if (code === 0) {
            try {
                packages = (_ref = JSON.parse(stdout)) != null ? _ref : [];
            } catch (_error) {
                error = _error;
                callback(error);
                return;
            }
            return callback(null, packages);
        } else {
            error = new Error("Fetching package '" + packageName + "' failed.");
            error.stdout = stdout;
            error.stderr = stderr;
            return callback(error);
        }
    });
};

module.exports = new PPM_Client();
