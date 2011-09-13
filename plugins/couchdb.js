var fs = require('fs')
  , sys = require('sys')
  , request = require('request')
  , Buffers = require('buffers')
  , _ = require('underscore')
  , headers = {'content-type':'application/json', 'accept':'application/json'}
  , transactions = {}
  ;

exports.register = function () {
  this.couchURL = this.config.get('couchdb.url') || 'http://localhost:5984';
  this.dbPrefix = this.config.get('couchdb.dbPrefix') || 'mail_';
};

function attachment() {
  return function() {
    var bufs = Buffers()
      , doc = {_attachments: {}}
      , filename
      ;
    return {
      start: function(content_type, name) {
        filename = name;
        doc._attachments[filename] = {content_type: content_type.replace(/\n/g, " ")};
      },
      data: function(data) { bufs.push(data) },
      end: function() { if(filename) doc._attachments[filename]['data'] = bufs.slice().toString('base64') },
      doc: function() { return doc }
    }
  }();
}

exports.hook_data = function (next, connection) {
  connection.transaction.parse_body = 1;
  var attach = transactions[connection.transaction.uuid] = attachment();
  connection.transaction.attachment_hooks(attach.start, attach.data, attach.end);
  next();
}

function extractChildren(children) {
  return children.map(function(child) {
    var data = {
      bodytext: child.bodytext,
      headers: child.header.headers_decoded
    }
    if (child.children.length > 0) data.children = extractChildren(child.children);
    return data;
  }) 
}

function parseSubaddress(user) {
  var parsed = {username: user};
  if (user.indexOf('+')) {
    parsed.username = user.split('+')[0];
    parsed.subaddress = user.split('+')[1];
  }
  return parsed;
}

exports.hook_queue = function(next, connection) {
  var common = transactions[connection.transaction.uuid].doc()
    , body = connection.transaction.body
    , docCounter = 0
    , baseURI = this.couchURL + "/" + this.dbPrefix
    ;
  connection.logdebug(JSON.stringify(connection.transaction.rcpt_to));
  common['headers'] = body.header.headers_decoded;
  common['bodytext'] = body.bodytext;
  common['content_type'] = body.ct;
  common['parts'] = extractChildren(body.children);

  var dbs = connection.transaction.rcpt_to.map(function(recipient) {
    docCounter++;
    var db = {doc: {tags: []}};
    var user = parseSubaddress(recipient.user);
    db.uri = baseURI + user.username;
    db.doc.recipient = recipient;
    if (user.subaddress) db.doc.tags.push(user.subaddress);
    db.doc = _.extend({}, db.doc, common);
    return db;
  })
  
  function resolve(err, resp, body) {
    docCounter--;
    if (docCounter === 0) {
      delete transactions[connection.transaction.uuid];
      next(OK); 
    }
  }
  
  dbs.map(function(db) {
    var message = {uri: db.uri, method: "POST", headers: headers, body: JSON.stringify(db.doc)};
    request(message, function(err, resp, body) {
      if (resp.statusCode === 404) {
        var body = JSON.parse(body);
        if (body.error === "not_found" && body.reason === "no_db_file") {
          request({method: "PUT", uri:db.uri, headers:headers}, function(err, resp, body) {
            connection.logdebug(body);            
            if (JSON.parse(body).ok === true) {
              request(message, resolve);
            } else {
              // TODO this sucks :D
              next(DENY, "couch error " + body);
            }
          })
        }
      } else {
        resolve(err, resp, body);
      }
    });
  });
};