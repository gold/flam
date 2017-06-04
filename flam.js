#!/usr/bin/env node

// The MIT License (MIT)
//
// Copyright (c) 2015-Eternity Gerry Gold
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/* eslint no-mixed-requires: 0,
   no-process-exit: 0,
   no-shadow: 0,
   no-unused-vars: 0
*/

/* global require */

// --------------------------------------------------------------------
// BEGIN Module Implementation
// --------------------------------------------------------------------
var fs = require('fs'),
  request = require('superagent'),
  random = require('randomstring'),
  isBinaryPath = require('is-binary-path'),
  dateFormat = require('dateformat'),
  Crypto = require('./lib/crypto-kinetic'),
  config = require('./config/config.json');

// The flim-flam begins here.
var Flam = function() {

  Error.stackTraceLimit = 0;

  var GOOGLE_API_ENDPOINT = 'https://www.googleapis.com/urlshortener/v1/url',
    GOOGLE_API_KEY = config.API_KEY,
    GOOGLE_SHORT_URL_BASE = 'http://goo.gl/',
    DATA_URI_PREFIX = 'http://{TOKEN}.arpa/',
    RANDOM_STRING_LENGTH = 7,
    HTTP_REQUEST_HEADERS = {'Content-Type': 'application/json'},
    KEY_LOG_FILENAME = 'keys.log',
    MAX_CONTENT_LENGTH = 47000,
    isCryptoEnabled = true,
    logNewKey;

  GOOGLE_API_ENDPOINT += '?key=' + GOOGLE_API_KEY;

  // date format:                 2015-03-14 19:02:25
  dateFormat.masks.iso8601long = 'yyyy-mm-dd HH:MM:ss';

  this.isKeyLogEnabled = false;

  var getIsCryptoEnabled = function() {
    return isCryptoEnabled;
  };

  var setIsCryptoEnabled = function(isEnabled) {
    isCryptoEnabled = isEnabled;
  };

  // Put the data in the storage facility.
  var put = function(jsonString, callback) {

    // For writing, API key is required.
    if (GOOGLE_API_KEY === '') {
      throw new Error('You must include a Google API Key in config/config.json');
    }

    var randString = random.generate(RANDOM_STRING_LENGTH).toLowerCase();
    var data = encodeURIComponent(jsonString);
    var dataURI = DATA_URI_PREFIX.replace('{TOKEN}', randString) + data;

    var postData = {longUrl: dataURI};

    var postOptions = {headers: HTTP_REQUEST_HEADERS, json: true};

    request
      .post(GOOGLE_API_ENDPOINT)
      .send(postData)
      .set(HTTP_REQUEST_HEADERS)
      .end(function(err, res) {
        if (err) {
          callback('ERROR ' + err, null);
        } else {
          if ('id' in res.body) {
            // SUCCESS!!
            callback(null, res.body.id);
          } else if ('error' in res.body) {
            // Typical error is invalid api key.
            if ('errors' in res.body.error &&
                res.body.error.errors.length > 0 &&
                'reason' in res.body.error.errors[0] &&
                res.body.error.errors[0].reason === 'keyInvalid') {
              callback('ERROR: API key is invalid.');
            } else {
              callback('ERROR ' + JSON.stringify(res.body.error));
            }
          } else {
            callback('ERROR: unknown behavior');
          }
        }
      });
  };

  var get = function(key, callback) {
    request
      .head(GOOGLE_SHORT_URL_BASE + key)
      .end(function(err, res) {
        var locationHeader, urlEncodedString, jsonString;

        if (!res) {
          callback(err.toString());
        } else {
          if ('statusCode' in res && res.statusCode >= 400 &&
              'statusMessage' in res) {
            callback(res.statusCode + ' ' + res.statusMessage);
          } else if ('location' in res.headers) {
            locationHeader = res.headers.location;
            urlEncodedString = locationHeader.substr(20);
            jsonString = decodeURIComponent(urlEncodedString);
            callback(null, jsonString);
          } else {
            callback('key not found');
          }
        }
      });
  };

  var writeDataToDataStore = function(data, callback) {
    var jsonString;

    if (data.length > MAX_CONTENT_LENGTH) {
      callback({
        success: false, key: '',
        message: 'Content exceeds max length (' + MAX_CONTENT_LENGTH + ')'
      });
      return;
    }

    if (isCryptoEnabled) {
      Crypto.setRealCryptoPassword();
      jsonString = JSON.stringify({egogdata: Crypto.encrypt(data)});
    } else {
      Crypto.setNoCryptoPassword();
      jsonString = JSON.stringify({agogdata: Crypto.encrypt(data)});
    }

    put(jsonString, function(err, shortUri) {
      var result = {success: true, key: '', message: ''};
      if (err) {
        result.success = false;
        result.message = err;
        callback(result, null);
      } else {
        result.success = true;
        result.key = shortUri.substr(14);
        if (Flam.isKeyLogEnabled) {
          logNewKey(result.key, 'inline content');
        }
        callback(null, result);
      }
    });
  };

  var writeFileToDataStore = function (filename, callback) {
    var result = {data: '', filename: '', key: ''},
      jsonString,
      isFileBinary,
      readFileEncoding;

    if (fs.existsSync(filename)) {
      isFileBinary = isBinaryPath(filename);
      readFileEncoding = isFileBinary ? 'binary' : 'utf8';
      fs.readFile(filename, readFileEncoding, function(err, data) {
        var dataKey;

        if (err) {
          callback(err, result);
        } else {
          if  (data.length > MAX_CONTENT_LENGTH) {
            callback({
              success: false, key: '',
              message: 'Content exceeds max length (' + MAX_CONTENT_LENGTH + ')'
            });
            return;
          }

          if (err) { throw err; }

          // Binary files must be converted into base64 ASCII
          // before crypto processing.
          if (isFileBinary) {
            // Must convert original binary data to base 64
            data = new Buffer(data, 'binary').toString('base64');
          }

          if (isCryptoEnabled) {
            Crypto.setRealCryptoPassword();
            if (isFileBinary) {
              jsonString = JSON.stringify({'egogdatab': Crypto.encrypt(data)});
            } else {
              jsonString = JSON.stringify({'egogdata': Crypto.encrypt(data)});
            }
          } else {
            Crypto.setNoCryptoPassword();
            if (isFileBinary) {
              jsonString = JSON.stringify({'agogdatab': Crypto.encrypt(data)});
            } else {
              jsonString = JSON.stringify({'agogdata': Crypto.encrypt(data)});
            }
          }

          put(jsonString, function(putErr, shortUri) {
            var result = {success: true, key: '', message: ''};

            if (putErr) {
              result.success = false;
              result.message = putErr;
              callback( result, null );
            } else {
              result.success = true;
              result.key = shortUri.substr(14);
              if (Flam.isKeyLogEnabled) {
                logNewKey(result.key, filename);
              }
              callback(null, result);
            }
          });

        }
      });
    } else {
      callback('Error: cannot access ' + filename + ': no such file', result);
    }
  };

  var readDataFromDataStore = function(key, callback) {
    get(key, function(err, storedData) {
      var result = {success: true, data: '', message: ''},
        data;

      if (err) {
        result.success = false;
        result.message = err;
        callback(result, null);
      } else {
        result.success = true;
        data = JSON.parse(storedData);

        // encrypted, ascii
        if ('egogdata' in data) {
          Crypto.setRealCryptoPassword();
          result.data = Crypto.decrypt(data.egogdata);
          callback(null, result);

          // encrypted, binary
        } else if ('egogdatab' in data) {
          Crypto.setRealCryptoPassword();
          result.data = Crypto.decrypt(data.egogdatab);
          result.data = new Buffer(result.data, 'base64');
          callback(null, result);

          // plaintext, ascii
        } else if ('agogdata' in data) {
          Crypto.setNoCryptoPassword();
          result.data = Crypto.decrypt(data.agogdata);
          callback(null, result);

          // plaintext, binary
        } else if ('agogdatab' in data) {
          Crypto.setNoCryptoPassword();
          result.data = Crypto.decrypt(data.agogdatab);
          result.data = new Buffer(result.data, 'base64');
          callback(null, result);

        } else {
          result.success = false;
          result.message = 'Cannot parse stored data';
          callback(result, null);
        }
      }
    });
  };

  // @param key String
  // @param source String - either filename or 'inline content'
  logNewKey = function(key, source) {
    var timestamp = dateFormat(new Date(), 'iso8601long');
    key = key.replace(/^\//, '');
    fs.appendFileSync(KEY_LOG_FILENAME, key + ' ' + timestamp + ' ' + source + '\n');
  };

  // Interface
  return {
    writeFile: writeFileToDataStore,
    writeData: writeDataToDataStore,
    readData: readDataFromDataStore,
    enableCrypto: setIsCryptoEnabled,
    isCryptoEnabled: getIsCryptoEnabled
  };
}();

module.exports = Flam;
// --------------------------------------------------------------------
// END Module Implementation
// --------------------------------------------------------------------


// --------------------------------------------------------------------
// BEGIN Command Line Section
// --------------------------------------------------------------------
var main = function() {
  var program = require('commander'),
    prompt  = require('synchro-prompt'),
    promptAnswer;

  // In command line context, log the key for subsequent --get access.
  // Logging is disabled by default.
  Flam.isKeyLogEnabled = true;

  program
    .version('1.1.1')
    .option('-f, --file <filename>', 'set filename content to be stored')
    .option('-c, --content <inline data>', 'set data directly in the command line to be stored')
    .option('-g, --get <key>', 'get value referenced by key')
    .option('-d, --disable-encryption', 'disable encryption (default is crypto enabled)')
    .parse(process.argv);

  // User is trying to store content unencrypted. Warn user and require prompt.
  if (program.disableEncryption && (program.file || program.content)) {
    promptAnswer = prompt('WARNING: Do you really want to disable encryption? [No/yes] ');
    if (/^(?:y|yes)$/i.test(promptAnswer)) {
      console.log('\n  Content will be stored unencrypted.');
      Flam.enableCrypto(false);
    } else {
      Flam.enableCrypto(true);
    }
  } else {
    Flam.enableCrypto(true);
  }

  // Store content from file
  if (program.file) {
    Flam.writeFile(program.file, function(err, result) {
      if (err) {
        console.error(err);
        process.exit(1);
      } else {
        console.log('\n  File successfully stored with key: %s\n',
                    result.key.replace(/^\//, ''));
      }
    });

  // Store content expressed directly in the command line.
  } else if (program.content) {
    Flam.writeData(program.content, function( err, result) {
      if (err) {
        console.error(err);
        process.exit(1);
      } else {
        console.log('\n  Content successfully stored with key: %s\n',
                    result.key.replace(/^\//, ''));
      }
    });

  // Retrieve data.
  } else if (program.get) {
    Flam.readData(program.get, function(err, result) {
      if (err) {
        console.error(err);
        process.exit(1);
      } else {
        process.stdout.write(result.data);
      }
    });

  // No valid action detected
  } else {
    program.outputHelp();
    process.exit(1);
  }
};

// Allow running module directly from the command line
if (require.main === module) {
  main();
}
// --------------------------------------------------------------------
// END Command Line Section
// --------------------------------------------------------------------
