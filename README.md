# CouchDB Plugin for Haraka

Caution: this is very beta

This is a plugin for the excellent node.js [Haraka](https://github.com/baudehlo/Haraka) email server that will receive incoming email, parse and store them as JSON in CouchDB.

### Install

First you need to [install haraka](https://github.com/baudehlo/Haraka)

The default configuration assumes you have a couch running at `http://localhost:5984`. You can change this setting in the file `config/couchdb.url`. Be sure to include your admin username and password in the URL if you have one set.

You can also set the database prefix name in the file `config/couchdb.dbPrefix`. The default value is "mail_", which means that messages sent to `bill@yourawesomedomain.com` will be stored in a database called `mail_bill` in Couch.

    git clone git://github.com/maxogden/haraka-couchdb.git
    cd haraka-couchdb
    npm install request
    npm install buffers
    sudo haraka -c .

Note: sudo is usually required to bind to port 25

If you want to receive real mail using Haraka, you simply need to install this on a publicly accessible server and set your domain's MX DNS record to point at that server.
    
### Test it out

You can execute the included `test_send.rb` ruby script to send a test email to yourself:

    gem install mail mustache
    ruby test_send.rb
    
In your Couch you should now see a database called `mail_pizza` (since the test messages are sent to a user called pizza) with some messages inside.