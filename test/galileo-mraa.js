"use strict";

global.IS_TEST_MODE = true;

var Galileo = require("../lib/galileo");
var Emitter = require("events").EventEmitter;
var sinon = require("sinon");
var tick = global.setImmediate || process.nextTick;

function restore(target) {
  for (var prop in target) {
    if (target[prop] != null && typeof target[prop].restore === "function") {
      target[prop].restore();
    }
    if (typeof target[prop] === "object") {
      restore(target[prop]);
    }
  }
}

var io = Galileo.__io;
var I2c = io.I2c;

exports["Platform Type Galileo"] = {
  setUp: function(done) {
    this.gpt = sinon.stub(io, "getPlatformType").returns(1);
    this.board = new Galileo();
    done();
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  platformtype: function(test) {
    test.expect(1);
    test.equal(this.board.name, "Galileo-IO (Intel Galileo 2)");
    test.done();
  }
};
exports["Platform Type Edison"] = {
  setUp: function(done) {
    this.gpt = sinon.stub(io, "getPlatformType").returns(2);
    this.board = new Galileo();
    done();
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  platformtype: function(test) {
    test.expect(1);
    test.equal(this.board.name, "Galileo-IO (Intel Edison)");
    test.done();
  }
};

exports["I2C"] = {
  setUp: function(done) {

    this.gpt = sinon.stub(io, "getPlatformType").returns(1);
    this.i2c = {
      write: sinon.spy(I2c.prototype, "write"),
      address: sinon.spy(I2c.prototype, "address")
    };

    this.board = new Galileo();

    this.i2c.read = sinon.stub(I2c.prototype, "read").returns([0x0, 0x1]);
    done();
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  shape: function(test) {
    test.expect(2);

    test.equal(this.board.i2cWrite, this.board.sendI2CWriteRequest);
    test.equal(this.board.i2cRead, this.board.sendI2CReadRequest);

    test.done();
  },
  initAddressOnFirstWrite: function(test) {
    test.expect(3);

    this.board.i2cWrite(0x4, 0x1);

    // Once on initialization, and once for creating new I2C
    test.equal(this.gpt.callCount, 2);
    test.equal(this.i2c.address.callCount, 1);
    test.equal(this.i2c.write.callCount, 1);

    test.done();
  },

  initAddressOnFirstRead: function(test) {
    test.expect(6);

    this.temp = sinon.spy(this.board, "i2cWrite");

    this.board.on("I2C-reply-4", function() {
      test.ok(true);
    });

    this.board.i2cRead(0x4, [1], 2, function() {
      test.equal(this.temp.callCount, 1);
      test.equal(this.i2c.read.callCount, 1);
      test.done();
    }.bind(this));

    test.equal(this.i2c.address.callCount, 1);
    test.equal(this.i2c.write.callCount, 1);

    // Once on initialization, and once for creating new I2C
    test.equal(this.gpt.callCount, 2);
  },
};
