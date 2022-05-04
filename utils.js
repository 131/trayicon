"use strict";

const crypto = require("crypto");


const attr = (name, val) => {
  if(val === undefined)
    return '';
  if(typeof val == "boolean")
    val = val ? "true" : "false";
  return `${name}="${escapeXML(val)}"`;
};

function attrs(dict, keys) {
  let body = [];
  for(let attrName of keys || Object.keys(dict))
    body.push(attr(attrName, dict[attrName]));
  return body.join(' ');
}


function escapeXML(str) {
  str = String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
  return str;
}

function defer() {
  var thisresolve;
  var thisreject;

  var defer = new Promise(function(resolve, reject) {
    thisresolve = resolve;
    thisreject  = reject;
  });

  defer.resolve = function(body) { thisresolve(body); };
  defer.reject  = function(err) { thisreject(err); };
  defer.chain   = function(err, body) {
    if(err)
      return defer.reject(err);
    return defer.resolve(body);
  };

  return defer;
}

function uuid() {
  return crypto.randomBytes(16).toString("hex");
}

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}



module.exports = {escapeXML, attrs, defer, uuid, md5};
