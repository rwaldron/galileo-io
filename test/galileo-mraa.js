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
var Gpio = io.Gpio;
var Aio = io.Aio;
var Pwm = io.Pwm;
var I2c = io.I2c;
var reporting = Galileo.__reporting;


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

exports["Digital & Analog"] = {
  setUp: function(done) {
    var protos = {
      gpio: Object.assign({}, Gpio.prototype),
      aio: Object.assign({}, Aio.prototype)
    };

    this.Gpio = sinon.spy(io, "Gpio");
    this.Aio = sinon.spy(io, "Aio");

    ["Gpio", "Aio"].forEach(function(name) {
      var key = name.toLowerCase();
      var target = this[name];

      this[key] = Object.keys(protos[key]).reduce(function(proto, prop) {
        target.prototype[prop] = protos[key][prop];
        proto[prop] = sinon.spy(target.prototype, prop);
        return proto;
      }, {});
    }, this);

    this.clock = sinon.useFakeTimers();

    this.board = new Galileo();
    this.board.on("ready", function() {
      done();
    });

    this.board.emit("ready");
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  initializationDigital: function(test) {
    test.expect(45);

    // 14 Digital IO Pins are initialized, with:
    //    - 14 calls to dir
    //    - 14 calls to useMmap
    //
    test.equal(this.Gpio.callCount, 14);
    test.equal(this.gpio.dir.callCount, 14);
    test.equal(this.gpio.useMmap.callCount, 14);

    // 14 calls to dir received the argument 0
    this.gpio.dir.args.forEach(function(args) {
      test.equal(args[0], 0);
    });

    // 14 calls to write received the argument 0
    this.gpio.write.args.forEach(function(args) {
      test.equal(args[0], 0);
    });

    // 14 calls to dir received the argument true
    this.gpio.useMmap.args.forEach(function(args) {
      test.equal(args[0], true);
    });

    test.done();
  },
  initializationAnalog: function(test) {
    test.expect(1);

    // 6 Digital IO Pins are initialized
    test.equal(this.Aio.callCount, 6);
    test.done();
  },
  blinkAll: function(test) {
    test.expect(6);

    var state = 0;

    for (var i = 0; i < 14; i++) {
      this.board.pinMode(i, this.board.MODES.OUTPUT);
    }

    setInterval(function() {
      state ^= 1;
      for (var i = 0; i < 14; i++) {
        this.board.digitalWrite(i, state);
      }
    }.bind(this), 10);


    this.gpio.write.reset();
    this.clock.tick(10);

    test.equal(this.gpio.write.callCount, 14);
    test.ok(this.gpio.write.alwaysCalledWithExactly(1));

    this.gpio.write.reset();
    this.clock.tick(10);

    test.equal(this.gpio.write.callCount, 14);
    test.ok(this.gpio.write.alwaysCalledWithExactly(0));

    this.gpio.write.reset();
    this.clock.tick(10);

    test.equal(this.gpio.write.callCount, 14);
    test.ok(this.gpio.write.alwaysCalledWithExactly(1));

    test.done();
  }
};

exports["Galileo.prototype.analogRead"] = {
  setUp: function(done) {
    var protos = {
      gpio: Object.assign({}, Gpio.prototype),
      aio: Object.assign({}, Aio.prototype)
    };

    this.Gpio = sinon.spy(io, "Gpio");
    this.Aio = sinon.spy(io, "Aio");

    ["Gpio", "Aio"].forEach(function(name) {
      var key = name.toLowerCase();
      var target = this[name];

      this[key] = Object.keys(protos[key]).reduce(function(proto, prop) {
        target.prototype[prop] = protos[key][prop];
        proto[prop] = sinon.spy(target.prototype, prop);
        return proto;
      }, {});
    }, this);

    this.clock = sinon.useFakeTimers();

    this.board = new Galileo();
    this.board.on("ready", function() {
      done();
    });

    this.board.emit("ready");
  },
  tearDown: function(done) {
    Galileo.reset();

    this.aio.read.override = null;

    restore(this);

    for (var i = 0; i < 14; i++) {
      if (i < 6) {
        this.board.removeAllListeners("analog-read-A" + i);
      }
      if (i > 1) {
        this.board.removeAllListeners("digital-read-" + i);
      }
    }
    done();
  },
  correctMode: function(test) {
    test.expect(1);

    this.board.analogRead("A0", function() {});

    // ANALOG input mode
    test.equal(this.board.pins[14].mode, 2);

    test.done();
  },

  analogPin: function(test) {
    test.expect(1);

    var value = 1023;

    this.aio.read.override = value;

    var handler = function(data) {
      test.equal(data, value);
      test.done();
    };

    this.board.analogRead(0, handler);
  },

  analogName: function(test) {
    test.expect(1);

    var value = 1023;

    this.aio.read.override = value;

    var handler = function(data) {
      test.equal(data, value);
      test.done();
    };

    this.board.analogRead("A0", handler);
  },

  event: function(test) {
    test.expect(1);

    var value = 1023;
    var event = "analog-read-0";

    this.aio.read.override = value;

    this.board.once(event, function(data) {
      test.equal(data, value);
      test.done();
    });

    var handler = function(data) {};

    this.board.analogRead("A0", handler);
  }
};

exports["Galileo.prototype.digitalRead"] = {
  setUp: function(done) {
    var protos = {
      gpio: Object.assign({}, Gpio.prototype),
      aio: Object.assign({}, Aio.prototype)
    };

    this.Gpio = sinon.spy(io, "Gpio");
    this.Aio = sinon.spy(io, "Aio");

    ["Gpio", "Aio"].forEach(function(name) {
      var key = name.toLowerCase();
      var target = this[name];

      this[key] = Object.keys(protos[key]).reduce(function(proto, prop) {
        target.prototype[prop] = protos[key][prop];
        proto[prop] = sinon.spy(target.prototype, prop);
        return proto;
      }, {});
    }, this);

    this.clock = sinon.useFakeTimers();

    this.board = new Galileo();
    this.board.on("ready", function() {
      done();
    });

    this.board.emit("ready");
  },
  tearDown: function(done) {
    Galileo.reset();

    this.gpio.read.override = null;

    restore(this);

    for (var i = 0; i < 14; i++) {
      if (i < 6) {
        this.board.removeAllListeners("analog-read-A" + i);
      }
      if (i > 1) {
        this.board.removeAllListeners("digital-read-" + i);
      }
    }
    done();
  },
  correctMode: function(test) {
    test.expect(1);

    this.board.digitalRead(9, function() {});

    // DIGITAL input mode
    test.equal(this.board.pins[9].mode, 0);

    test.done();
  },

  digitalPin: function(test) {
    test.expect(1);

    var value = 1;

    this.gpio.read.override = value;

    var handler = function(data) {
      test.equal(data, value);
      test.done();
    };

    this.board.digitalRead(9, handler);
  },

  event: function(test) {
    test.expect(1);

    var value = 1;
    var event = "digital-read-9";

    this.gpio.read.override = value;

    this.board.once(event, function(data) {
      test.equal(data, value);
      test.done();
    });

    var handler = function(data) {};

    this.board.digitalRead(9, handler);
  }
};



exports["I2C"] = {
  setUp: function(done) {

    this.gpt = sinon.stub(io, "getPlatformType").returns(1);
    this.i2c = {
      write: sinon.spy(I2c.prototype, "write"),
      writeReg: sinon.spy(I2c.prototype, "writeReg"),
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
    test.expect(3);

    test.equal(this.board.i2cWrite, this.board.sendI2CWriteRequest);
    test.equal(this.board.i2cRead, this.board.sendI2CReadRequest);
    test.equal(this.board.i2cConfig, this.board.sendI2CConfig);

    test.done();
  },
  initAddressOnFirstWrite: function(test) {
    test.expect(3);

    this.board.i2cWrite(0x4, 0x1);

    // Once on initialization
    test.equal(this.gpt.callCount, 1);
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

    // Once on initialization
    test.equal(this.gpt.callCount, 1);
  },

  writeAndReg: function(test) {
    // test.expect(1);

    this.i2cConfig = sinon.spy(this.board, "i2cConfig");
    this.i2cWrite = sinon.spy(this.board, "i2cWrite");
    this.i2cWriteReg = sinon.spy(this.board, "i2cWriteReg");

    // Should invoke writeReg, does NOT invoke write
    this.board.i2cWrite(1, 2, 3);
    // API
    test.equal(this.i2cWriteReg.callCount, 1);
    // Internal
    test.equal(this.i2c.write.callCount, 0);
    test.equal(this.i2c.writeReg.callCount, 1);

    // Should NOT invoke writeReg, does invoke write
    this.board.i2cWrite(1, 2, [3]);
    // API
    test.equal(this.i2cWriteReg.callCount, 1);
    // Internal
    test.equal(this.i2c.write.callCount, 2);
    test.equal(this.i2c.writeReg.callCount, 1);

    // Should NOT invoke writeReg
    this.board.i2cWrite(1, [2, 3]);
    // API
    test.equal(this.i2cWriteReg.callCount, 1);
    // Internal
    test.equal(this.i2c.write.callCount, 4);

    // 3 calls, but one redirected resulting in a
    // 4th call to i2cConfig
    test.equal(this.i2cConfig.callCount, 4);

    test.done();
  },


};
