var fs = require('fs')
  , sys = require('sys')
  , request = require('request')
  , Buffers = require('buffers')
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
        doc._attachments[filename] = {content_type: content_type};
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

function parseAddress(address) {
  var parsed = { 
    user: address.substr(0, address.lastIndexOf('@')),
    domain: address.substr(address.lastIndexOf('@') + 1, address.length)
  }
  if (parsed.user.indexOf('+')) {
    var subaddress = parsed.user.split('+');
    parsed.user = subaddress[0];
    parsed.label = subaddress[1];
  }
  return parsed;
}

exports.hook_queue = function(next, connection) {
  var doc = transactions[connection.transaction.uuid].doc()
    , body = connection.transaction.body
    ;
  
  doc['headers'] = body.header.headers_decoded;
  doc['bodytext'] = body.bodytext;
  doc['content_type'] = body.ct;
  doc['parts'] = extractChildren(body.children);
  
  if ('x-forwarded-to' in doc['headers'] && doc['headers']['x-forwarded-to'].length > 0) {
    var db = doc['headers']['x-forwarded-to'][0];
  } else if ('delivered-to' in doc['headers'] && doc['headers']['delivered-to'].length > 0) {
    var db = doc['headers']['delivered-to'][0];
  }
  if (db) {
    var address = parseAddress(db)
      , db = this.couchURL + "/" + this.dbPrefix + address.user;
    if (address.label) doc['label'] = address.label;
  } else {
    var db = this.couchURL + "/" + this.dbPrefix + "blackhole";
  }
  
  function resolve(err, resp, body) {
    if (err) next(DENY, "couch error " + body);
    connection.logdebug(body);
    delete transactions[connection.transaction.uuid];
    next(OK);
  }
  
  var message = {uri: db, method: "POST", headers: headers, body: JSON.stringify(doc)};
  request(message, function(err, resp, body) {
    if (resp.statusCode === 404) {
      var body = JSON.parse(body);
      if (body.error === "not_found" && body.reason === "no_db_file") {
        connection.logdebug(db + " does not exist... creating");
        request({method: "PUT", uri:db, headers:headers}, function(err, resp, body) {
          if (JSON.parse(body).ok === true) {
            request(message, resolve);           
          } else {
            next(DENY, "couch error " + body);
          }
        })
      }
    } else {
      resolve(err, resp, body);
    }
  });
};