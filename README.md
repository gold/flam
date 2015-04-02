flam
====

free and secure data storage

Overview
--------

You need a data store. You want it to work. You want it to scale. You want it
simple and secure. You don't want to set it up and configure it. You don't
want to maintain it. And you don't want to pay for it.

Where is the data stored? There's a company in Mountain View, CA which is
known for its search engine. Their servers do all of the heavy lifting.

flam is fun because it's free, and just works!

Security
--------

By default, flam keeps your data safe and cozy via AES crypto, based on the
Rijndael cipher. Belgium makes great ales and cryptographic algorithms.


Installation
------------

npm install flam


Examples
--------

flam can be used in two ways:

1. as a command line program
2. conventionally require flam as any other npm module


Let's try a few examples from the command line. Open up a terminal.

cd into flam's root directory, where `flam.js` is located. Execute the script
without arguments:

    ./flam.js

The following message should display:

    Error: You must change the placeholder password in `config/config.json`.

`flam.js` will not execute unless you change the preset password. Edit
`config/config.json`, as the message instructs.

You've changed the password, right? Good. Let's try that again:

    ./flam.js

What?! Another error message?

Ok, one more tiny hurdle; you need to supply a Google API key.

If you don't have one,
[it's easy to get](https://developers.google.com/url-shortener "Google's URL Shortener API"). There's already a place for you to
put the API key in `config/config.json`.

You added your API key. One more time, I promise!

    ./flam.js

You should see Usage and options:

    Usage: flam [options]

    Options:

      -h, --help                   output usage information
      -V, --version                output the version number
      -f, --file <filename>        set filename content to be stored
      -c, --content <inline data>  set data directly in the command line to be stored
      -g, --get <key>              get value referenced by key
      -d, --disable-encryption     disable encryption (default is crypto enabled)

Let's try a basic example to store content expressed directly in the command
line:

    ./flam.js --content "My Swiss Bank Account No: 1337-1337-1337"

Response is displayed:

    Content successfully stored with key: 191yFg

Of course, the key in this documentation is ficticious; the key that you see
in your own terminal is real.

Let's be sure and retrieve your stored content. Use your key instead of the fake one:

    ./flam --get <key>

The command line interface by default keeps a simple log of write events
(using -f or -c options). View `keys.log` to see your first entry.

Let's safely store the content of a text file.

    ./flam.js --file ~/essential_ingredients.txt

Use the same get option to retrieve the content.

    ./flam.js -g <key>

Another example using flam as a module.

cd in to the examples directory and run the app:

    node app.js


Caveats
-------

To preserve balance in the universe, the free service that flam provides
has some limitations:

  1. A record cannot be updated or deleted.
  2. A content record cannot exceed 45K.
  3. Expiration of stored data, if any exists, is unknown.

These restrictions may be too severe for your requirements in a professional
setting. That is a judgement you must make yourself.

Have fun!

  Gerry Gold
  March 2015
