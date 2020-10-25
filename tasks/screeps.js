/*
 * grunt-screeps
 * https://github.com/screeps/grunt-screeps
 *
 * Copyright (c) 2015 Artem Chivchalov
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path'),
    http = require('http'),
    https = require('https'),
    util = require('util');

const fetch = require('node-fetch');

module.exports = function (grunt) {

    grunt.registerMultiTask('screeps', 'A Grunt plugin for commiting code to your Screeps account', function () {

        var options = this.options({});

        var server = options.server || {};

        var modules = {};

        var done = this.async();

        this.files.forEach(function (f) {
            if (!f.src.length) {
                grunt.log.error('No files found. Stopping.');
                done();
                return;
            }

            f.src.filter(function (filepath) {
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function (filepath) {
                var basename = path.basename(filepath),
                    ext = path.extname(basename),
                    name = basename.replace(ext, '');

                if (ext === '.js') {
                    modules[name] = grunt.file.read(filepath, { encoding: 'utf8' });
                }
                else {
                    modules[name] = { binary: grunt.file.read(filepath, { encoding: null }).toString('base64') };
                }
            });

            (async () => {
                try {
                    let hexId = BigInt(options.steam_id).toString(16);
                    const byte1 = hexId.substr(hexId.length - 2, 2);
                    const byte2 = hexId.substr(hexId.length - 4, 2);
                    const byte3 = hexId.substr(hexId.length - 6, 2);
                    const byte4 = hexId.substr(hexId.length - 8, 2);

                    const response = await fetch(`http://${server.host}:${server.port}/api/auth/steam-ticket`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ticket: `----++++----++++----++++${byte1}${byte2}${byte3}${byte4}------------------` })
                    });
                    let json = await response.json();
                    let token = json.token;
                    // console.log(token);

                    var postData = {modules: modules};
                    if(options.branch) {
                        postData.branch = options.branch;
                    }
                    const postCodeResponse = await fetch(`http://${server.host}:${server.port}/api/user/code`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'x-token': token,
                            'x-username': "undefined"
                        },
                        body: JSON.stringify(postData)
                    });
                    let postCodeResponseResult = await postCodeResponse.json();
                    if (postCodeResponseResult.ok != 1) {
                        throw "Code post returned not ok. " + postCodeResponseResult; 
                    }
                    // console.log(postCodeResponseResult);
                }
                catch (error) {
                    grunt.fail.fatal('Error: ' + error);
                }

            })(); 
        });
    });
};
