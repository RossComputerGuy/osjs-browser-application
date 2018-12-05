const express = require('express');
const fs = require('fs');
const {Transform} = require('stream');
const Unblocker = require('unblocker');

const UA = 'OS.js/3 (OS.js; rv:1.0.0) OS.js/1.0.0';

module.exports = (core,proc) => ({
  init: async () => {
    core.app.use(new Unblocker({
      prefix: proc.resource('/proxy/'),
      processContentTypes: [
        'text/html',
        'text/xml',
        'application/xml+xhtml',
        'application/xhtml+xml',
        'text/css'
      ],
      responseMiddleware: [
        data => {
          if(data.contentType == 'text/html') {
            var injected = false;
            var stream = new Transform({
              decodeStrings: false,
              transform: (chunk,encoding,next) => {
                if(!injected) {
                  stream.push(chunk.toString().split('</html>').join(fs.readFileSync(__dirname+'/src/window.html').toString()+'</html>'));
                }
                next();
              }
            });
            data.stream = data.stream.pipe(stream);
          }
        }
      ]
    }));
    core.app.use(proc.resource('/src/'),express.static(__dirname+'/src/'));
  },
  start: () => {},
  destroy: () => {}
});
