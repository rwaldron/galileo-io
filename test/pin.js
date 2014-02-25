"use strict";
var rewire = require("rewire");
var GPIO = rewire("../lib/gpio");
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

GPIO.__set__("fs", fsStub);

function restore(target) {
  for (var prop in target) {
    if (typeof target[prop].restore === "function") {
      target[prop].restore();
    }
  }
}

exports["GPIO"] = {
  setUp: function(done) {

    this.clock = sinon.useFakeTimers();

    this.gpio = new GPIO({ index: 1, modes: [0, 1, 4] });

    this.proto = {};

    // this.proto.functions = [{
    //   name: "analogRead"
    // }, {
    //   name: "analogWrite"
    // }, {
    //   name: "digitalRead"
    // }, {
    //   name: "digitalWrite"
    // }, {
    //   name: "servoWrite"
    // }];

    // this.proto.objects = [{
    //   name: "MODES"
    // }];

    this.proto.numbers = [{
      name: "report"
    }, {
      name: "value"
    }, {
      name: "index"
    }];

    this.instance = [{
      name: "mode"
    }];

    done();
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  shape: function(test) {
    test.expect(
      // this.proto.functions.length +
      // this.proto.objects.length +
      this.proto.numbers.length +
      this.instance.length
    );

    // this.proto.functions.forEach(function(method) {
    //   test.equal(typeof this.gpio[method.name], "function");
    // }, this);

    // this.proto.objects.forEach(function(method) {
    //   test.equal(typeof this.gpio[method.name], "object");
    // }, this);

    this.proto.numbers.forEach(function(method) {
      test.equal(typeof this.gpio[method.name], "number");
    }, this);

    this.instance.forEach(function(property) {
      test.notEqual(typeof this.gpio[property.name], "undefined");
    }, this);

    test.done();
  },
  modeNull: function(test) {
    test.expect(1);

    test.equal(this.gpio.mode, null);
    test.done();
  }
};
