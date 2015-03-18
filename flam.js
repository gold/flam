var fs = require( "fs" ),
    crypto     = require( "crypto" ),
    needle     = require( "needle" ),
    random     = require( "randomstring" ),
    dateFormat = require( "dateformat" );

var Crypto = function() {
    var algorithm = "aes-256-ctr";

    // TODO: read password from config file or from user input
    var password = '! r e p l a c 3   t h | s   s t r i n g';

    var _encrypt = function( plaintext ) {
        var buffer = new Buffer( plaintext, "utf8" );
        var cipher = crypto.createCipher( algorithm, password );
        var ciphertextBinary = Buffer.concat( [cipher.update(buffer), cipher.final()] );
        return ciphertextBinary.toString( "base64" );
    };

    var _decrypt = function( ciphertext ) {
        var buffer = new Buffer( ciphertext, "base64" );
        var decipher = crypto.createDecipher( algorithm, password );
        var plaintextBuffer = Buffer.concat( [decipher.update(buffer) , decipher.final()] );
        return plaintextBuffer.toString( "utf8" );
    };

    return {encrypt: _encrypt, decrypt: _decrypt};
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
    var filename              = "";

    // TESTING
    var cryptoEnabled         = false;

    this.isCommandLine = false;

    var _writeFile = function ( filename, callback ) {
        var result = {filename: filename, key: ""},
            jsonString;

        if ( fs.existsSync(filename) ) {
            fs.readFile( filename, "utf-8", function(err, data) {
                if (err) {
                    callback( err, result );
                } else {
                    if ( cryptoEnabled ) {
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
    return {writeFile: _writeFile};
};

// This function is called only in command line context.
var main = function() {
    var program = require( "commander" ),
        flam;

    program
        .version( "1.0.0" )
        .option( "-f, --file <filename>", "set filename contents to be stored" )
        .option( "-g, --get <key>", "get value referenced by key" )
        .parse( process.argv );

    if ( program.file ) {
        flam = new Flam();
        flam.isCommandLine = true;
        flam.writeFile( program.file, function(err, result) {
            if ( err ) {
                console.log( err );
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

// inspired by python's command line|module import detection mechanism
if ( require.main === module ) {
    main();
}
