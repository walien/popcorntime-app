var path = require('path'),
    os = require('os'),
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
    postersWidth            : 134,
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
    subtitle_size           : '28px',
    subtitle_color          : '#ffffff',
    subtitle_shadows       : 'true',


    tvshowApiEndpoint       : 'http://eztvapi.re/',
    httpApiPort             : 8008,
    httpApiUsername         : 'popcorn',
    httpApiPassword         : 'popcorn',


    traktUsername           : '',
    traktPassword           : '',
    traktTvVersion          : '0.0.2',    
    syncOnStart             : false,


    connectionLimit         : 100,
    dhtLimit                : 500,
    streamPort              : 0, //random


    tmpLocation             : path.join(os.tmpDir(), 'Popcorn-Time'),
    deleteTmpOnClose        : true,

    updateApiEndpoint       : 'http://popcorntime.re/',
    yifyApiEndpoint         : 'https://yts.re/api/',
    yifyApiEndpointMirror   : 'https://yts.im/api/',

    connectionCheckUrl      : 'http://google.com/',

    version                 : false,
    dbversion               : '0.1.0',
    font                    : 'tahoma',
    defaultWidth            : Math.round(window.screen.availWidth * 0.8),
    defaultHeight           : Math.round(window.screen.availHeight * 0.8),

    tv_detail_jump_to       : 'next',

};

// Export config
module.exports = config;