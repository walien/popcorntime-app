var helpers = {},
  _ = require('underscore'),
  URI = require('URIjs');
/*
* Format the items to be redeable by PT
*/
function resizeImage (imageUrl, width) {
    var uri = URI(imageUrl),
        ext = uri.suffix(),
        file = uri.filename().split('.' + ext)[0];

    // Don't resize images that don't come from trakt
    //  eg. YTS Movie Covers
    if (uri.domain() !== 'trakt.us') {
        return imageUrl;
    }

    var existingIndex = 0;
    if ((existingIndex = file.search('-\\d\\d\\d$')) !== -1) {
        file = file.slice(0, existingIndex);
    }

    if (file === 'poster-dark') {
        return 'images/posterholder.png'.toString();
    } else {
        return uri.filename(file + '-' + width + '.' + ext).toString();
    }
};

module.exports = function(items) {

    _.each(items, function(item, key) {
      items[key]['images']['fanart'] = resizeImage(items[key]['images']['fanart'], 940);
      items[key]['images']['lowres'] = resizeImage(items[key]['images']['poster'], 300);
    });

    return items;
};
