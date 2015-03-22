/*
** This demonstrates how you might use flam in your application.
**
** Have fun!
**
**  Gerry Gold, April 2015
*/
var Flam = require( "../flam" );

// All data is stored encrypted. If, however, you wish to store your data in
// its original plaintext, you can disable encryption thusly:
//
//    Flam.enableCrypto( false );

// Safely store data encrypted (default) and then retrieve it.
data = "Very secret message, including binary characters: 小籠包";
Flam.writeData( data, function(err, result) {
    var tip, key = result.key;

    console.log( "writeData result:", result );

    Flam.readData( key, function(err, result) {
        console.log( "readData result using key %s: %j", key, result );

        tip = "\n  With the key, get your secure data from the command line:\n\n";
        tip += "  $ ./flam.js -g " + key + "\n\n  Come on, copy and paste the command to try it. It's fun!\n";
        console.log( tip );

    });
});
