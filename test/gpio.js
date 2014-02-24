"use strict";
var rewire = require("rewire");
var Galileo = rewire("../lib/galileo");
var Emitter = require("events").EventEmitter;
var sinon = require("sinon");

var fsStub = {
  readFile: function(path, encoding, cb) {
    cb(null, "Success!");
  },
  writeFile: function(path, encoding, cb) {
    if (cb) {
      cb(null, "Success!");
    }
  }
};

Galileo.__set__("fs", fsStub);

function restore(target) {
  for (var prop in target) {
    if (typeof target[prop].restore === "function") {
      target[prop].restore();
    }
  }
}
