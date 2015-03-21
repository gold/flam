var Flam = require( "../flam" );

var data = "Very secret message...";

Flam.writeData( data, function(err, result) {
    console.log( "result:", result );
});

data = "low-risk, public information";

Flam.enableCrypto( false );
Flam.writeData( data, function(err, result) {
    console.log( "result:", result );
});
