# CouchDB Plugin for Haraka

This is a plugin for the excellent node.js [Haraka](https://github.com/baudehlo/Haraka) email server that will receive incoming email, parse and store them as JSON in CouchDB

### Install

The default configuration assumes you have a couch running at `http://localhost:5984` with a database called `mail`. You can change this setting in the file `config/couchdb.url`

    git clone git://github.com/maxogden/haraka-couchdb.git
    cd haraka-couchdb
    npm install -g Haraka
    npm install request
    npm install buffers
    sudo haraka -c .

Note: sudo is usually required to bind to port 25
    
### Test it out

You can execute the included `test_send.rb` ruby script to send a test email to yourself:

    gem install mail mustache
    ruby test_send.rb