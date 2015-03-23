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


// --------------------------------------------------------------------
// BEGIN Module Implementation
// --------------------------------------------------------------------
var fs         = require( "fs" ),
    crypto     = require( "crypto" ),
    needle     = require( "needle" ),
    random     = require( "randomstring" ),
    dateFormat = require( "dateformat" ),
    config     = require( "./config/config.json" );

var Crypto = function() {
    var algorithm = "aes-256-ctr";

    var password = config.password;

    var __init__ = function() {
        if ( "gnirts s|ht 3calper!".split("").reverse().join(" ") === password ) {
            console.error( "Error: You must change the placeholder password in config/config.json." );
            process.exit( 1 );
        }
    };

    var encrypt = function( plaintext ) {
        var buffer = new Buffer( plaintext, "utf8" );
        var cipher = crypto.createCipher( algorithm, password );
        var ciphertextBinary = Buffer.concat( [cipher.update(buffer), cipher.final()] );
        return ciphertextBinary.toString( "base64" );
    };

    var decrypt = function( ciphertext ) {
        var buffer = new Buffer( ciphertext, "base64" );
        var decipher = crypto.createDecipher( algorithm, password );
        var plaintextBuffer = Buffer.concat( [decipher.update(buffer) , decipher.final()] );
        return plaintextBuffer.toString( "utf8" );
    };

    __init__();

    // Interface
    return {encrypt: encrypt, decrypt: decrypt};
}();

// The flim-flam begins here.
var Flam = function() {
    var GOOGLE_API_ENDPOINT   = "https://www.googleapis.com/urlshortener/v1/url",
        GOOGLE_API_KEY        = config.API_KEY,
        GOOGLE_SHORT_URL_BASE = "http://goo.gl/",
        DATA_URI_PREFIX       = "http://{TOKEN}.arpa/",
        RANDOM_STRING_LENGTH  = 7,
        HTTP_REQUEST_HEADERS  = {"Content-Type": "application/json"},
        KEY_LOG_FILENAME      = "keys.log",
        MAX_CONTENT_LENGTH    = 45000,
        isCryptoEnabled       = true;

    if ( GOOGLE_API_KEY === "" ) {
        console.error( "Error: You must include a Google API Key in config/config.json" );
        process.exit( 1 );
    }

    GOOGLE_API_ENDPOINT += "?key=" + GOOGLE_API_KEY;

    // date format:                 2015-03-14 19:02:25
    dateFormat.masks.iso8601long = "yyyy-mm-dd HH:MM:ss";

    this.isKeyLogEnabled = false;

    var getIsCryptoEnabled = function() {
        return isCryptoEnabled;
    };

    var setIsCryptoEnabled = function( isEnabled ) {
        isCryptoEnabled = isEnabled;
    };

    // Put the data in the storage facility.
    var put = function( jsonString, callback ) {
        var randString = random.generate( RANDOM_STRING_LENGTH ).toLowerCase();
        var data = encodeURIComponent( jsonString );
        var dataURI = DATA_URI_PREFIX.replace( "{TOKEN}", randString ) + data;

        var postData = {longUrl: dataURI};

        var postOptions = {headers: HTTP_REQUEST_HEADERS, json: true};
        needle.post( GOOGLE_API_ENDPOINT, postData, postOptions, function(err, res) {            
            if (err) {
                callback( "ERROR " + err, null );
            } else {
                callback( null, res.body.id );
            }
        });
    };

    var get = function( key, callback ) {
        needle.head( GOOGLE_SHORT_URL_BASE + key, function(err, res) {
            var locationHeader, urlEncodedString, jsonString;

            if ( err ) {
                callback( err.message );
            } else {
                if ( "statusCode" in res && res.statusCode >= 400 &&
                     "statusMessage" in res ) {
                    callback(  res.statusCode + " " + res.statusMessage );
                } else if ( "location" in res.headers ) {
                    locationHeader = res.headers.location;
                    urlEncodedString = locationHeader.substr(20);
                    jsonString = decodeURIComponent( urlEncodedString );
                    callback( null, jsonString );
                } else {
                    callback( "key not found" );
                }
            }
        });
    };

    var writeDataToDataStore = function( data, callback ) {
        var jsonString;

        if  ( data.length > MAX_CONTENT_LENGTH ) {
            callback( {success: false, key: "",
                       message: "Content exceeds max length (" + MAX_CONTENT_LENGTH + ")"});
            return;
        }

        if ( isCryptoEnabled ) {
            jsonString = JSON.stringify( {egogdata: Crypto.encrypt(data)} );
        } else {
            jsonString = JSON.stringify( {agogdata: data} );
        }

        put( jsonString, function(err, shortUri) {
            var result = {success: true, key: "", message: ""};
            if ( err ) {
                result.success = false;
                result.message = err;
                callback( result, null );
            } else {
                result.success = true;
                result.key = shortUri.substr( 14 );
                if ( Flam.isKeyLogEnabled ) {
                    logNewKey( result.key, "inline content" );
                }
                callback( null, result );
            }
        });
    };

    var writeFileToDataStore = function ( filename, callback ) {
        var result = {data: "", filename: "", key: ""},
            jsonString;

        if ( fs.existsSync(filename) ) {
            fs.readFile( filename, "utf-8", function(err, data) {
                if (err) {
                    callback( err, result );
                } else {

                    if  ( data.length > MAX_CONTENT_LENGTH ) {
                        callback( {success: false, key: "",
                                   message: "Content exceeds max length (" + MAX_CONTENT_LENGTH + ")"});
                        return;
                    }

                    if ( isCryptoEnabled ) {
                        jsonString = JSON.stringify( {egogdata: Crypto.encrypt(data)} );
                    } else {
                        jsonString = JSON.stringify( {agogdata: data} );
                    }

                    put( jsonString, function(err, shortUri) {
                        var result = {success: true, key: "", message: ""};
                        if ( err ) {
                            result.success = false;
                            result.message = err;
                            callback( result, null );
                        } else {
                            result.success = true;
                            result.key = shortUri.substr( 14 );
                            if ( Flam.isKeyLogEnabled ) {
                                logNewKey( result.key, filename );
                            }
                            callback( null, result );
                        }
                    });
                }
            });
        } else {
            callback( "Error: cannot access " + filename + ": no such file", result );
        }
    };

    var readDataFromDataStore = function( key, callback ) {
        get( key, function(err, storedData) {
            var result = {success: true, data: "", message: ""},
                data;
            if ( err ) {
                result.success = false;
                result.message = err;
                callback( result, null );
            } else {
                result.success = true;
                data = JSON.parse( storedData );
                if ( "egogdata" in data ) {
                    result.data = Crypto.decrypt( data.egogdata );
                    callback( null, result );
                } else if ( "agogdata" in data ) {                    
                    result.data = data.agogdata;
                    callback( null, result );
                } else {
                    result.success = false;
                    result.message = "Cannot parse stored data";
                    callback( result, null );
                }
            }
        });
    };

    // @param key String
    // @param source String - either filename or "inline content"
    var logNewKey = function( key, source ) {
        var timestamp = dateFormat( new Date(), "iso8601long" );
        fs.appendFileSync( KEY_LOG_FILENAME, key + " " + timestamp + " " + source + "\n" );
    };

    // Interface
    return {writeFile:       writeFileToDataStore,
            writeData:       writeDataToDataStore,
            readData:        readDataFromDataStore,
            enableCrypto:    setIsCryptoEnabled,
            isCryptoEnabled: getIsCryptoEnabled};
}();

module.exports = Flam;
// --------------------------------------------------------------------
// END Module Implementation
// --------------------------------------------------------------------


// --------------------------------------------------------------------
// BEGIN Command Line Section
// --------------------------------------------------------------------
var main = function() {
    var program = require( "commander" ),
        prompt  = require( "synchro-prompt" ),
        promptAnswer;

    // In command line context, log the key for subsequent --get access.
    // Logging is disabled by default.
    Flam.isKeyLogEnabled = true;

    program
        .version( "1.0.0" )
        .option( "-f, --file <filename>", "set filename content to be stored" )
        .option( "-c, --content <inline data>", "set data directly in the command line to be stored" )
        .option( "-g, --get <key>", "get value referenced by key" )
        .option( "-d, --disable-encryption", "disable encryption (default is crypto enabled)" )
        .parse( process.argv );

    // User is trying to store content unencrypted. Warn user and require prompt.
    if ( program.disableEncryption && (program.file || program.content) ) {
        promptAnswer = prompt( "WARNING: Do you really want to disable encryption? [No/yes] " );
        if ( /^(?:y|yes)$/i.test(promptAnswer) ) {
            console.log( "\n  Content will be stored unencrypted." );
            Flam.enableCrypto( false );
        } else {
            Flam.enableCrypto( true );
        }
    } else {
        Flam.enableCrypto( true );
    }

    // Store content from file
    if ( program.file ) {
        Flam.writeFile( program.file, function(err, result) {
            if ( err ) {
                console.error( err );
                process.exit( 1 );
            } else {
                console.log( "\n  File successfully stored with key: %s\n", result.key );
            }
        });

    // Store content expressed directly in the command line.
    } else if ( program.content ) {
        Flam.writeData( program.content, function( err, result ) {
            if ( err ) {
                console.error( err );
                process.exit( 1 );
            } else {
                console.log( "\n  Content successfully stored with key: %s\n", result.key );
            }
        });

    // Retrieve data.
    } else if ( program.get ) {
        Flam.readData( program.get, function(err, result) {
            if ( err ) {
                console.error( err );
                process.exit( 1 );
            } else {
                process.stdout.write( result.data );
            }
        });

    // No valid action detected
    } else {
        program.outputHelp();
        process.exit( 1 );
    }
};

// Allow running module directly from the command line
if ( require.main === module ) {
    main();
}
// --------------------------------------------------------------------
// END Command Line Section
// --------------------------------------------------------------------
