/* 
** Discover the meaning behind this module's name:
**
**    ./flam.js -g ChUxCi
**
** The value referenced by this key was put into storage using flam's -d
** switch to disable encryption. Therefore, a password isn't used to retrieve
** and decrypt the content. However, flam still requires a non-default
** password to be set in config.js to run at all.
**
** Have fun!
**
**   Gerry Gold April 2015
*/

var crypto = require( "crypto" ),
  config = require( "../config/config" );

var Crypto = function() {
  var algorithm = "aes-256-ctr";

  var password = config.password;

  // The 3rd party API accepts ciphertext-based URLs only for file references.
  // So when the user wants to disable crypto, we still encrypt under the hood,
  // but use this built-in password for encrypt and decrypt functions. The
  // security is no different than if the data were stored in plaintext.
  var setNoCryptoPassword = function() {
    password = '__password__';
  };

  var setRealCryptoPassword = function() {
    password = config.password;
  };

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
    var plaintextBuffer = Buffer.concat( [decipher.update(buffer), decipher.final()] );
    return plaintextBuffer.toString( "utf8" );
  };

  __init__();

  // Interface
  return {encrypt: encrypt,
          decrypt: decrypt,
          setRealCryptoPassword: setRealCryptoPassword,
          setNoCryptoPassword: setNoCryptoPassword};
}();

module.exports = Crypto;
