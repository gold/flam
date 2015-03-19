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

// --------------------------------------------------------------------
// NODE MODULE IMPLENTATION
// --------------------------------------------------------------------

var fs         = require( "fs" ),
    crypto     = require( "crypto" ),
    needle     = require( "needle" ),
    random     = require( "randomstring" ),
    dateFormat = require( "dateformat" );

var Crypto = function() {
    var algorithm = "aes-256-ctr";

    // TODO: Read password from config file or from user input.
    var password = "FIXME! r e p l a c 3   t h | s   s t r i n g";

    var __init__ = function() {
        if ( "gnirts s|ht 3calper!".split("").reverse().join(" ") === password ) {
            console.log( "Error: You must change the placeholder password in flam.js." );
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

// This is where the flim-flam happens
// (or flam-a-diddle if you're a drummer).
var Flam = function() {
    var GOOGLE_API_ENDPOINT   = "https://www.googleapis.com/urlshortener/v1/url";
    var GOOGLE_SHORT_URL_BASE = "http://goo.gl/";
    var DATA_URI_PREFIX       = "http://{TOKEN}.arpa/";
    var RANDOM_STRING_LENGTH  = 7;
    var HTTP_REQUEST_HEADERS  = {"Content-Type": "application/json"};
    var LOG_FILENAME          = "keys.log";
    var isCryptoEnabled       = true;

    // date format:                 2015-03-14 19:02:25
    dateFormat.masks.iso8601long = "yyyy-mm-dd HH:MM:ss";

    var getIsCryptoEnabled = function() {
        return isCryptoEnabled;
    };

    var setIsCryptoEnabled = function( isEnabled ) {
        isCryptoEnabled = isEnabled;
    };

    var writeDataToDataStore = function( data, callback ) {
        var result = {data: null, key: ""},
            jsonString;

        if ( isCryptoEnabled ) {
            jsonString = JSON.stringify( {egogdata: Crypto.encrypt(data)} );
        } else {
            jsonString = JSON.stringify( {agogdata: data} );
        }

        result.data = jsonString;
        callback( null, result );

    };

    var writeFileContentToDataStore = function ( filename, callback ) {
        var result = {filename: filename, key: ""},
            jsonString;

        if ( fs.existsSync(filename) ) {
            fs.readFile( filename, "utf-8", function(err, data) {
                if (err) {
                    callback( err, result );
                } else {
                    if ( isCryptoEnabled ) {
                        jsonString = JSON.stringify( {egogdata: Crypto.encrypt(data)} );
                    } else {
                        jsonString = JSON.stringify( {agogdata: data} );
                    }

                    callback( null, result );
                }
            });
        } else {
            callback( "Error: cannot access " + filename + ": no such file", result );
        }
    };

    // Interface
    return {writeFile: writeFileContentToDataStore, writeData: writeDataToDataStore,
            enableCrypto: setIsCryptoEnabled, isCryptoEnabled: getIsCryptoEnabled};
}();

module.exports = Flam;

// --------------------------------------------------------------------
// COMMAND LINE SECTION - ignored if this is required
// --------------------------------------------------------------------

// This function is called only in command line context.
var mainCLI = function() {
    var program = require( "commander" ),
        prompt  = require(  "synchro-prompt" ),
        promptAnswer;

    program
        .version( "1.0.0" )
        .option( "-f, --file <filename>", "set filename contents to be stored" )
        .option( "-g, --get <key>", "get value referenced by key" )
        .option( "-d, --disable-encryption", "disable encryption" )
        .parse( process.argv );

    if ( program.file ) {

        // User is trying to store content unencrypted. Warn user and require prompt.
        if ( program.disableEncryption ) {
            promptAnswer = prompt( "WARNING: Do you really want to disable encryption? [No/yes] " );
            if ( /^(?:y|yes)$/i.test( promptAnswer) ) {
                console.log( "Content will be stored unencrypted." );
                Flam.enableCrypto( false );
            } else {
                Flam.enableCrypto( true );
            }
        } else {
            Flam.enableCrypto( true );
        }

        Flam.writeFile( program.file, function(err, result) {
            if ( err ) {
                console.log( err );
                process.exit( 1 );
            } else {
                console.log( "Contents of %s stored with key: %s",
                              result.filename, result.key );
            }
        });

    } else if ( program.get ) {
        console.log( "getting value..." );
    } else {
        program.outputHelp();
        process.exit( 1 );
    }
};

if ( require.main === module ) {
    mainCLI();
}
