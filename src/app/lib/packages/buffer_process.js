var BufferedProcess, ChildProcess, _;

_ = require('lodash');

ChildProcess = require('child_process');

module.exports = BufferedProcess = (function () {
	function BufferedProcess(_arg) {
		var args, cmdArgs, cmdOptions, command, exit, exitCode, options, processExited, stderr, stderrClosed, stdout, stdoutClosed, triggerExitCallback, _ref;
		_ref = _arg != null ? _arg : {}, command = _ref.command, args = _ref.args, options = _ref.options, stdout = _ref.stdout, stderr = _ref.stderr, exit = _ref.exit;
		if (options == null) {
			options = {};
		}
		if (process.platform === "win32") {
			if (args != null) {
				cmdArgs = args.map(function (arg) {
					if ((command === 'explorer.exe' || command === 'explorer') && /^\/[a-zA-Z]+,.*$/.test(arg)) {
						return arg;
					} else {
						return "\"" + (arg.replace(/"/g, '\\"')) + "\"";
					}
				});
			} else {
				cmdArgs = [];
			}
			if (/\s/.test(command)) {
				cmdArgs.unshift("\"" + command + "\"");
			} else {
				cmdArgs.unshift(command);
			}
			cmdArgs = ['/s', '/c', "\"" + (cmdArgs.join(' ')) + "\""];
			cmdOptions = _.clone(options);
			cmdOptions.windowsVerbatimArguments = true;
			this.process = ChildProcess.spawn(process.env.comspec || 'cmd.exe', cmdArgs, cmdOptions);
		} else {
			this.process = ChildProcess.spawn(command, args, options);
		}
		this.killed = false;
		stdoutClosed = true;
		stderrClosed = true;
		processExited = true;
		exitCode = 0;
		triggerExitCallback = function () {
			if (this.killed) {
				return;
			}
			if (stdoutClosed && stderrClosed && processExited) {
				return typeof exit === "function" ? exit(exitCode) : void 0;
			}
		};
		if (stdout) {
			stdoutClosed = false;
			this.bufferStream(this.process.stdout, stdout, function () {
				stdoutClosed = true;
				return triggerExitCallback();
			});
		}
		if (stderr) {
			stderrClosed = false;
			this.bufferStream(this.process.stderr, stderr, function () {
				stderrClosed = true;
				return triggerExitCallback();
			});
		}
		if (exit) {
			processExited = false;
			this.process.on('exit', function (code) {
				exitCode = code;
				processExited = true;
				return triggerExitCallback();
			});
		}
	}

	BufferedProcess.prototype.bufferStream = function (stream, onLines, onDone) {
		var buffered;
		stream.setEncoding('utf8');
		buffered = '';
		stream.on('data', (function (_this) {
			return function (data) {
				var lastNewlineIndex;
				if (_this.killed) {
					return;
				}
				buffered += data;
				lastNewlineIndex = buffered.lastIndexOf('\n');
				if (lastNewlineIndex !== -1) {
					onLines(buffered.substring(0, lastNewlineIndex + 1));
					return buffered = buffered.substring(lastNewlineIndex + 1);
				}
			};
		})(this));
		return stream.on('close', (function (_this) {
			return function () {
				if (_this.killed) {
					return;
				}
				if (buffered.length > 0) {
					onLines(buffered);
				}
				return onDone();
			};
		})(this));
	};

	BufferedProcess.prototype.killOnWindows = function () {
		var args, cmd, output, parentPid, wmicProcess;
		parentPid = this.process.pid;
		cmd = 'wmic';
		args = ['process', 'where', "(ParentProcessId=" + parentPid + ")", 'get', 'processid'];
		wmicProcess = ChildProcess.spawn(cmd, args);
		wmicProcess.on('error', function () {});
		output = '';
		wmicProcess.stdout.on('data', function (data) {
			return output += data;
		});
		return wmicProcess.stdout.on('close', (function (_this) {
			return function () {
				var pid, pidsToKill, _i, _len;
				pidsToKill = output.split(/\s+/).filter(function (pid) {
					return /^\d+$/.test(pid);
				}).map(function (pid) {
					return parseInt(pid);
				}).filter(function (pid) {
					return pid !== parentPid && (0 < pid && pid < Infinity);
				});
				for (_i = 0, _len = pidsToKill.length; _i < _len; _i++) {
					pid = pidsToKill[_i];
					try {
						process.kill(pid);
					} catch (_error) {}
				}
				return _this.killProcess();
			};
		})(this));
	};

	BufferedProcess.prototype.killProcess = function () {
		var _ref;
		if ((_ref = this.process) != null) {
			_ref.kill();
		}
		return this.process = null;
	};

	BufferedProcess.prototype.kill = function () {
		if (this.killed) {
			return;
		}
		this.killed = true;
		if (process.platform === 'win32') {
			this.killOnWindows();
		} else {
			this.killProcess();
		}
		return void 0;
	};

	return BufferedProcess;

})();
