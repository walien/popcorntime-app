var path = require('path'),
    config;

config = {
    
    language: 'en',

    coversShowRating        : false,
    watchedCovers           : 'fade',
    showAdvancedSettings    : false,
    postersMinWidth         : 134,
    postersMaxWidth         : 294,
    postersMinFontSize      : 0.8,
    postersMaxFontSize      : 1.3,
    postersSizeRatio        : (196 / 134),
    postersMaxWidth         : this.postersMinWidth,
    postersJump             : [134, 154, 174, 194, 214, 234, 254, 274, 294],
    
    playNextEpisodeAuto     : true,

    alwaysOnTop             : false,
    theme                   : 'Official_-_Dark_theme',
    ratingStars             : true,
    startScreen             : 'Movies',
    lastTab                 : '',
    moviesShowQuality       : false,
    movies_quality          : 'all',
    subtitle_language       : 'none',

    yifyApiEndpoint         : 'http://yts.re/api/'
};

// Export config
module.exports = config;