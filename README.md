# CouchDB Plugin for Haraka

Caution: this is very beta

This is a plugin for the excellent node.js [Haraka](https://github.com/baudehlo/Haraka) email server that will receive incoming email, parse and store them as JSON in CouchDB. For a mail client to use with this check out [CouchMail](https://github.com/maxogden/couchmail)

### Ubuntu installation:

Here's how to set up your own SMTP server from scratch!

Install `git` (`sudo apt-get install git-core`)

Install `node.js` via [these instructions](https://github.com/joyent/node/wiki/Installation). It is recommended that you build node yourself as opposed to using a package manager because it will make it easier to upgrade later. This app was developed against node version 0.4.8. You can install a specific version by running `git checkout v0.4.8` before running `configure/make/make install`.

Install `npm`, the node package manager: `curl http://npmjs.org/install.sh | sh`
  
Download [CouchBase server community edition](http://info.couchbase.com/couchbaseCEdownload.html). This is a prebuilt binary of CouchDB v1.0.2 with the GeoCouch plugin installed. There are other ways to install CouchDB on Ubuntu but they are a pain. Any Couch greater than v1.0 will work. To install:

    # make the installation package executable
    chmod +x couchbase-server-community_x86_64_1.1.deb
    # install couch
    dpkg -i couchbase-server-community_x86_64_1.1.deb

Install [Haraka](https://github.com/baudehlo/Haraka): `npm install -g Haraka`

The default Haraka configuration assumes you have a couch running at `http://localhost:5984` (this is also Couch's default). You can change this setting in the file `config/couchdb.url`. Be sure to include your admin username and password in the URL if you have one set.

You can also set the database prefix name in the file `config/couchdb.dbPrefix`. The default value is "mail_", which means that messages sent to `bill@yourawesomedomain.com` will be stored in a database called `mail_bill` in Couch.

    git clone git://github.com/maxogden/haraka-couchdb.git
    cd haraka-couchdb
    npm install request
    npm install buffers
    sudo haraka -c .

Note: sudo is usually required to bind to port 25

You are now running a mail server! If you want to receive real mail using Haraka, you simply need to install this on a publicly accessible server and set your domain's MX DNS record to point at that server. For example, if you have an Amazon server with the address `http://ec2-1-2-3.compute-1.amazonaws.com` and you own the domain name `pizzacats.com`, just add two DNS records to `pizzacats.com`: a CNAME record pointing at `ec2-1-2-3.compute-1.amazonaws.com` and an MX record pointing at `pizzacats.com`.

### Test it out

If you have an MX record set up correctly, just send an email to `anyone@yourdomain.com`. A database called `mail_anyone` will be created in your Couch and your message will be stored in it as JSON.

If you just want to test it locally, you can execute the included `test_send.rb` ruby script to send a test email to yourself:

    gem install mail mustache
    ruby test_send.rb
    
In your Couch you should now see a database called `mail_pizza` (since the test messages are sent to a user called pizza) with some messages inside.