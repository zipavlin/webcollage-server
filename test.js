const webshot = require('webshot');

// https://github.com/brenden/node-webshot

webshot('google.com', 'google.png', {
    screenSize: {
        width: 320,
        height: 480
    }
},function(err) {
    // screenshot now saved to google.png
});

// '\'C:\\server\\www\\5_PLAYGROUND\\webcollage-server\\node_modules\\phantomjs\\lib\\phantom\\bin\\phantomjs.exe\' \'--ignore-ssl-errors=false\'   \'C:\\server\\www\\5_PLAYGROUND\\webcollage-server\\node_modules\\capture-phantomjs/script/render.js\' \'https://twitter.com/\' 1024 768 0 PNG true \'[]\''