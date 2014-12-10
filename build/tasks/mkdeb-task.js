var fs = require('fs');
var path = require('path');
var _ = require('underscore-plus');

module.exports = function(grunt) {
  var spawn = require('./task-helper')(grunt).spawn;
  var fillTemplate = function(filePath, data) {
    var template = _.template(String(fs.readFileSync(__dirname + "/../../" + filePath + ".in")));
    var filled = template(data);
    var outputPath = path.join(grunt.config.get('popcorntime.buildDir'), path.basename(filePath));
    grunt.file.write(outputPath, filled);
    return outputPath;
  };
  getInstalledSize = function(buildDir, callback) {
    var cmd = 'du';
    var args = ['-sk', path.join(buildDir, 'Popcorn-Time')];
    return spawn({
      cmd: cmd,
      args: args
    }, function(error, _arg) {
      var _ref;
      var stdout = _arg.stdout;
      var installedSize = ((_ref = stdout.split(/\s+/)) != null ? _ref[0] : void 0) || '200000';
      return callback(null, installedSize);
    });
  };
  return grunt.registerTask('mkdeb', 'Create debian package', function() {
    var rootPath = grunt.config.get('popcorntime.rootPath')
    var arch, buildDir, description, done, iconName, installDir, maintainer, name, section, version, _ref;
    done = this.async();
    buildDir = grunt.config.get('popcorntime.buildDir');
    if (process.arch === 'ia32') {
      arch = 'i386';
    } else if (process.arch === 'x64') {
      arch = 'amd64';
    } else {
      return done("Unsupported arch " + process.arch);
    }
    _ref = grunt.file.readJSON(path.join(rootPath, 'package.json')), name = _ref.name, version = _ref.version, description = _ref.description;
    section = 'devel';
    maintainer = 'Popcorn Time <hello@popcorntime.io>';
    installDir = '/usr';
    iconName = 'popcorntime';
    return getInstalledSize(buildDir, function(error, installedSize) {
      var args, cmd, controlFilePath, data, desktopFilePath, icon;
      data = {
        name: name,
        version: version,
        description: description,
        section: section,
        arch: arch,
        maintainer: maintainer,
        installDir: installDir,
        iconName: iconName,
        installedSize: installedSize
      };
      controlFilePath = fillTemplate(path.join('dist', 'linux', 'debian', 'control'), data);
      desktopFilePath = fillTemplate(path.join('dist', 'linux', 'popcorntime.desktop'), data);
      icon = path.join('src', 'app', 'images', 'icon.png');
      cmd = path.join(__dirname, '..', '..', 'scripts', 'mkdeb');
      args = [version, arch, controlFilePath, desktopFilePath, icon, buildDir];
      
      return spawn({
        cmd: cmd,
        args: args
      }, function(error) {
        if (error != null) {
          return done(error);
        } else {
          grunt.log.ok("Created " + buildDir + "/popcorntime-" + version + "-" + arch + ".deb");
          return done();
        }
      });
    });
  });
};
