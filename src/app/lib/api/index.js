var
    Q = require('q'),
    _ = require('lodash'),
    Player = require('./player'),
    API;

function API() {
    return;
}

API.player = Player;
API.currentStack = function() {
    return window.App.ViewStack[window.App.ViewStack.length - 1];
}

module.exports = API;
