var
	Q = require('q'),
	_ = require('lodash'),
	Player = require('./player'),
	API;

function API() {
	return;
}

API.player = Player;
API.currentStack = function () {
	return window.App.ViewStack[window.App.ViewStack.length - 1];
}
API.viewStack = function () {
	return window.App.ViewStack;
}
API.currentTab = function () {
	return window.App.currentview;
}
module.exports = API;
