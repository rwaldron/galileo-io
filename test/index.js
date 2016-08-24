"use strict";

global.IS_TEST_ENV = true;

var Board = require("../");
var pinMapping = require("../lib/pin-mapping/");
var edisonPinMapping = pinMapping[2];
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

var read = Board.__read;
var IO = Board.__io;
var Gpio = IO.Gpio;
var Aio = IO.Aio;
var Pwm = IO.Pwm;
var I2c = IO.I2c;

var sandbox = sinon.sandbox.create();

exports["Platform Type Board"] = {
  setUp: function(done) {

    this.gpt = sandbox.stub(IO, "getPlatformType").returns(1);
    this.board = new Board();
    done();
  },
  tearDown: function(done) {
    sandbox.restore();
    Board.reset();
    done();
  },
  platformtype: function(test) {
    test.expect(1);
    test.equal(this.board.name, "Intel Galileo Gen 2");
    test.done();
  },

  pinModeObvious: function(test) {
    var nameIndexMap = {
      0: { index: 0, mode: null },
      1: { index: 1, mode: null },
      2: { index: 2, mode: 1 },
      3: { index: 3, mode: 1 },
      4: { index: 4, mode: 1 },
      5: { index: 5, mode: 1 },
      6: { index: 6, mode: 1 },
      7: { index: 7, mode: 1 },
      8: { index: 8, mode: 1 },
      9: { index: 9, mode: 1 },
      10: { index: 10, mode: 1 },
      11: { index: 11, mode: 1 },
      12: { index: 12, mode: 1 },
      13: { index: 13, mode: 1 },
      "A0": { index: 14, mode: 2 },
      "A1": { index: 15, mode: 2 },
      "A2": { index: 16, mode: 2 },
      "A3": { index: 17, mode: 2 },
      "A4": { index: 18, mode: 2 },
      "A5": { index: 19, mode: 2 },
    };

    var keys = Object.keys(nameIndexMap);

    test.expect(keys.length * 2);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var mapped = nameIndexMap[key];

        test.equal(this.pins[mapped.index].mode, null);

        // Don"t set pinMode for 0 or 1
        if (mapped.mode) {
          this.pinMode(key, mapped.mode);
        }

        test.equal(this.pins[mapped.index].mode, mapped.mode);
      }, this);

      test.done();
    });
  },

  pinModeNonObvious: function(test) {
    var nameIndexMap = {
      0: { index: 14, mode: 2 },
      1: { index: 15, mode: 2 },
      2: { index: 16, mode: 2 },
      3: { index: 17, mode: 2 },
      4: { index: 18, mode: 2 },
      5: { index: 19, mode: 2 },
    };

    var keys = Object.keys(nameIndexMap);

    test.expect(keys.length * 2);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var mapped = nameIndexMap[key];

        test.equal(this.pins[mapped.index].mode, null);

        this.pinMode(Number(key), mapped.mode);

        test.equal(this.pins[mapped.index].mode, mapped.mode);
      }, this);

      test.done();
    });
  },

  normalize1: function(test) {
    var arduinoPinMapping = {
      0: 0,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      11: 11,
      12: 12,
      13: 13,
      // This matches the default Pin
      // normalization in Johnny-Five.
      "A0": 0,
      "A1": 1,
      "A2": 2,
      "A3": 3,
      "A4": 4,
      "A5": 5,
    };

    var keys = Object.keys(arduinoPinMapping);

    test.expect(keys.length);

    this.board = new Board();

    this.board.on("ready", function() {
      keys.forEach(function(key) {
        var expect = arduinoPinMapping[key];

        test.equal(this.normalize(key), expect);

      }, this);

      test.done();
    });
  },
  normalizeAnalogOneToOne: function(test) {
    var arduinoPinMapping = {
      14: 14,
      15: 15,
      16: 16,
      17: 17,
      18: 18,
      19: 19,
    };

    var keys = Object.keys(arduinoPinMapping);

    test.expect(keys.length);

    this.board = new Board();

    this.board.on("ready", function() {
      keys.forEach(function(key) {
        var expect = arduinoPinMapping[key];

        test.equal(this.normalize(key), expect);

      }, this);

      test.done();
    });
  }
};

exports["Platform Type Edison"] = {
  setUp: function(done) {

    this.pinModes = [
      { modes: [] },
      { modes: [] },
      { modes: [0, 1] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1, 2], analogChannel: 0 },
      { modes: [0, 1, 2], analogChannel: 1 },
      { modes: [0, 1, 2], analogChannel: 2 },
      { modes: [0, 1, 2], analogChannel: 3 },
      { modes: [0, 1, 2], analogChannel: 4 },
      { modes: [0, 1, 2], analogChannel: 5 },
    ];

    this.connections = this.pinModes.reduce(function(accum, value, i) {
      if (value !== null) {
        accum.push(i);
      }
      return accum;
    }, []);

    this.analogs = this.pinModes.reduce(function(accum, value, i) {
      if (typeof value.analogChannel === "number") {
        accum.push(i);
      }
      return accum;
    }, []);


    this.gpt = sandbox.stub(IO, "getPlatformType").returns(2);
    this.board = new Board();
    done();
  },
  tearDown: function(done) {
    sandbox.restore();
    Board.reset();
    done();
  },
  platformtype: function(test) {
    test.expect(1);
    test.equal(this.board.name, "Intel Edison");
    test.done();
  },
  arduinoBoardErrors: function(test) {
    test.expect(78);

    var board = new Board();
    var pin = 30;

    // No connection on pin 30
    test.throws(function() {
      board.pinMode(pin, 0);
    });

    test.throws(function() {
      board.digitalWrite(pin, 0);
    });

    test.throws(function() {
      board.digitalRead(pin, function() {});
    });

    test.throws(function() {
      board.analogWrite(pin, 0);
    });

    test.throws(function() {
      board.analogRead(pin, function() {});
    });

    test.throws(function() {
      board.servoWrite(pin, 0);
    });

    this.connections.forEach(function(pin) {
      var isAnalog = typeof this.pinModes[pin].analogChannel === "number";

      if (this.pinModes[pin].modes.length === 0) {
        return;
      }

      if (isAnalog) {
        pin = "A" + this.pinModes[pin].analogChannel;
        test.doesNotThrow(function() {
          board.pinMode(pin, 0);
        });

        test.doesNotThrow(function() {
          board.analogRead(pin, function() {});
        });
      } else {
        test.doesNotThrow(function() {
          board.pinMode(pin, 0);
        });

        test.doesNotThrow(function() {
          board.digitalWrite(pin, 0);
        });

        test.doesNotThrow(function() {
          board.digitalRead(pin, function() {});
        });

        test.doesNotThrow(function() {
          board.analogWrite(pin, 0);
        });

        test.doesNotThrow(function() {
          board.servoWrite(pin, 0);
        });
      }
    }, this);

    test.done();
  },
  pinModeObvious: function(test) {
    var nameIndexMap = {
      0: { index: 0, mode: null },
      1: { index: 1, mode: null },
      2: { index: 2, mode: 1 },
      3: { index: 3, mode: 1 },
      4: { index: 4, mode: 1 },
      5: { index: 5, mode: 1 },
      6: { index: 6, mode: 1 },
      7: { index: 7, mode: 1 },
      8: { index: 8, mode: 1 },
      9: { index: 9, mode: 1 },
      10: { index: 10, mode: 1 },
      11: { index: 11, mode: 1 },
      12: { index: 12, mode: 1 },
      13: { index: 13, mode: 1 },
      "A0": { index: 14, mode: 2 },
      "A1": { index: 15, mode: 2 },
      "A2": { index: 16, mode: 2 },
      "A3": { index: 17, mode: 2 },
      "A4": { index: 18, mode: 2 },
      "A5": { index: 19, mode: 2 },
    };

    var keys = Object.keys(nameIndexMap);

    test.expect(keys.length * 2);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var mapped = nameIndexMap[key];

        test.equal(this.pins[mapped.index].mode, null);

        // Don"t set pinMode for 0 or 1
        if (mapped.mode) {
          this.pinMode(key, mapped.mode);
        }

        test.equal(this.pins[mapped.index].mode, mapped.mode);
      }, this);

      test.done();
    });
  },

  pinModeNonObvious: function(test) {
    var nameIndexMap = {
      0: { index: 14, mode: 2 },
      1: { index: 15, mode: 2 },
      2: { index: 16, mode: 2 },
      3: { index: 17, mode: 2 },
      4: { index: 18, mode: 2 },
      5: { index: 19, mode: 2 },
    };

    var keys = Object.keys(nameIndexMap);

    test.expect(keys.length * 2);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var mapped = nameIndexMap[key];

        test.equal(this.pins[mapped.index].mode, null);

        this.pinMode(Number(key), mapped.mode);

        test.equal(this.pins[mapped.index].mode, mapped.mode);
      }, this);

      test.done();
    });
  },

  normalize1: function(test) {
    var arduinoPinMapping = {
      0: 0,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      11: 11,
      12: 12,
      13: 13,
      "A0": 0,
      "A1": 1,
      "A2": 2,
      "A3": 3,
      "A4": 4,
      "A5": 5,
    };

    var keys = Object.keys(arduinoPinMapping);

    test.expect(keys.length);

    this.board = new Board();

    this.board.on("ready", function() {
      keys.forEach(function(key) {
        var expect = arduinoPinMapping[key];

        test.equal(this.normalize(key), expect);

      }, this);

      test.done();
    });
  },
  normalizeAnalogOneToOne: function(test) {
    var arduinoPinMapping = {
      14: 14,
      15: 15,
      16: 16,
      17: 17,
      18: 18,
      19: 19,
    };

    var keys = Object.keys(arduinoPinMapping);

    test.expect(keys.length);

    this.board = new Board();

    this.board.on("ready", function() {
      keys.forEach(function(key) {
        var expect = arduinoPinMapping[key];

        test.equal(this.normalize(key), expect);

      }, this);

      test.done();
    });
  }
};

exports["Platform Type Edison (Miniboard)"] = {
  setUp: function(done) {

    this.pinModes = [
      { modes: [0, 1, 3, 4] },
      null,
      null,
      null,
      { modes: [0, 1] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1] },
      null,
      null,
      null,
      { modes: [0, 1] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1, 3, 4] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      null,
      null,
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      null,
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
    ];

    this.noConnections = this.pinModes.reduce(function(accum, value, i) {
      if (value === null) {
        accum.push(i);
      }
      return accum;
    }, []);
    this.connections = this.pinModes.reduce(function(accum, value, i) {
      if (value !== null) {
        accum.push(i);
      }
      return accum;
    }, []);

    Board.__miniboard(true);
    Board.__pinmodes(this.pinModes);
    done();
  },
  tearDown: function(done) {
    Board.__miniboard(false);
    Board.__pinmodes();
    sandbox.restore();
    Board.reset();
    done();
  },
  miniBoardErrors: function(test) {
    test.expect(298);

    var board = new Board();

    // Tests for capabilities as shown here:
    // https://github.com/intel-iot-devkit/mraa/blob/master/docs/edison.md
    //

    // No analog read on any
    test.throws(function() {
      board.pinMode("any", 2);
    });

    this.noConnections.forEach(function(pin) {
      test.throws(function() {
        board.pinMode(pin, 0);
      });

      test.throws(function() {
        board.digitalWrite(pin, 0);
      });

      test.throws(function() {
        board.digitalRead(pin, function() {});
      });

      test.throws(function() {
        board.analogWrite(pin, 0);
      });

      test.throws(function() {
        board.analogRead(pin, function() {});
      });

      test.throws(function() {
        board.servoWrite(pin, 0);
      });
    });

    this.connections.forEach(function(pin) {
      test.doesNotThrow(function() {
        board.pinMode(pin, 0);
      });

      test.doesNotThrow(function() {
        board.digitalWrite(pin, 0);
      });

      test.doesNotThrow(function() {
        board.digitalRead(pin, function() {});
      });

      test.doesNotThrow(function() {
        board.analogWrite(pin, 0);
      });

      test.doesNotThrow(function() {
        board.servoWrite(pin, 0);
      });
    });

    test.done();
  },
  pinMapping: function(test) {
    var keys = Object.keys(edisonPinMapping);


    test.expect(keys.length * 5);

    this.board = new Board();

    [
      "pinMode",
      "analogRead",
      "digitalRead",
      "analogWrite",
      "digitalWrite",
      "servoWrite",
      "i2cConfig",
      "i2cWrite",
      "i2cWriteReg",
      "i2cRead",
      "i2cReadOnce",
    ].forEach(function(method) {

      if (this.board[method].restore) {
        this.board[method].restore();
      }
      sandbox.spy(this.board, method);
    }, this);

    this.board.on("ready", function() {
      keys.forEach(function(key) {
        var pin = edisonPinMapping[key];

        // Test Setting Mode
        this.pins[pin].mode = null;
        this.pinMode(key, 1);
        test.equal(this.pins[pin].mode, 1);

        // Test Digital Read
        this.pins[pin].mode = null;
        this.digitalRead(key, function() {});
        test.equal(this.pins[pin].mode, 0);

        // Test Digital Write
        this.pins[pin].mode = null;
        this.digitalWrite(key, function() {});
        test.equal(this.pins[pin].mode, 1);

        // Test Analog Write
        this.pins[pin].mode = null;
        this.analogWrite(key, 255);
        test.equal(this.pins[pin].mode, 3);

        // Test Servo Write
        this.pins[pin].mode = null;
        this.servoWrite(key, 180);
        test.equal(this.pins[pin].mode, 4);
      }, this);

      test.done();
    });
  },

  pinModeGP: function(test) {
    var nameIndexMap = Object.keys(edisonPinMapping).reduce(function(accum, key) {
      var index = edisonPinMapping[key];

      if (key.startsWith("GP")) {
        accum[key] = { index: index, mode: 1 };
      }

      return accum;
    }, {});

    var keys = Object.keys(nameIndexMap);

    test.expect(keys.length * 2);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var mapped = nameIndexMap[key];

        test.equal(this.pins[mapped.index].mode, null);

        // Don"t set pinMode for 0 or 1
        if (mapped.mode) {
          this.pinMode(key, mapped.mode);
        }

        test.equal(this.pins[mapped.index].mode, mapped.mode);
      }, this);

      test.done();
    });
  },

  pinModeJ: function(test) {
    var nameIndexMap = Object.keys(edisonPinMapping).reduce(function(accum, key) {
      var index = edisonPinMapping[key];

      if (key.startsWith("J")) {
        accum[key] = { index: index, mode: 1 };
      }

      return accum;
    }, {});

    var keys = Object.keys(nameIndexMap);

    test.expect(keys.length * 2);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var mapped = nameIndexMap[key];

        test.equal(this.pins[mapped.index].mode, null);

        // Don"t set pinMode for 0 or 1
        if (mapped.mode) {
          this.pinMode(key, mapped.mode);
        }

        test.equal(this.pins[mapped.index].mode, mapped.mode);
      }, this);

      test.done();
    });
  },
  normalize: function(test) {
    var keys = Object.keys(edisonPinMapping);

    test.expect(keys.length);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var expect = edisonPinMapping[key];

        test.equal(this.normalize(key), expect);

      }, this);

      test.done();
    });
  }
};


exports["Digital & Analog"] = {
  setUp: function(done) {
    var protos = {
      gpio: Object.assign({}, Gpio.prototype),
      aio: Object.assign({}, Aio.prototype)
    };

    this.Gpio = sandbox.spy(IO, "Gpio");
    this.Aio = sandbox.spy(IO, "Aio");

    ["Gpio", "Aio"].forEach(function(name) {
      var key = name.toLowerCase();
      var target = this[name];

      this[key] = Object.keys(protos[key]).reduce(function(proto, prop) {
        target.prototype[prop] = protos[key][prop];
        proto[prop] = sandbox.spy(target.prototype, prop);
        return proto;
      }, {});
    }, this);

    this.clock = sandbox.useFakeTimers();

    this.board = new Board();

    for (var i = 2; i < 20; i++) {
      this.board.pins[i].initialize();
    }

    done();
  },
  tearDown: function(done) {
    sandbox.restore();
    Board.reset();
    done();
  },
  initializationDigital: function(test) {
    test.expect(39);


    // 12 Digital IO Pins are initialized, with:
    //    - 12 calls to dir
    //    - 12 calls to useMmap
    //
    test.equal(this.Gpio.callCount, 12);
    test.equal(this.gpio.dir.callCount, 12);
    test.equal(this.gpio.useMmap.callCount, 12);

    // 12 calls to dir received the argument 0
    this.gpio.dir.args.forEach(function(args) {
      test.equal(args[0], 0);
    });

    // 12 calls to write received the argument 0
    this.gpio.write.args.forEach(function(args) {
      test.equal(args[0], 0);
    });

    // 12 calls to dir received the argument true
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

    for (var i = 2; i < 14; i++) {
      this.board.pinMode(i, this.board.MODES.OUTPUT);
    }

    setInterval(function() {
      state ^= 1;
      for (var i = 2; i < 14; i++) {
        this.board.digitalWrite(i, state);
      }
    }.bind(this), 10);


    this.gpio.write.reset();
    this.clock.tick(10);

    test.equal(this.gpio.write.callCount, 12);
    test.ok(this.gpio.write.alwaysCalledWithExactly(1));

    this.gpio.write.reset();
    this.clock.tick(10);

    test.equal(this.gpio.write.callCount, 12);
    test.ok(this.gpio.write.alwaysCalledWithExactly(0));

    this.gpio.write.reset();
    this.clock.tick(10);

    test.equal(this.gpio.write.callCount, 12);
    test.ok(this.gpio.write.alwaysCalledWithExactly(1));

    test.done();
  }
};

exports["Board.prototype.analogRead"] = {
  setUp: function(done) {
    var protos = {
      gpio: Object.assign({}, Gpio.prototype),
      aio: Object.assign({}, Aio.prototype)
    };

    this.Gpio = sandbox.spy(IO, "Gpio");
    this.Aio = sandbox.spy(IO, "Aio");

    ["Gpio", "Aio"].forEach(function(name) {
      var key = name.toLowerCase();
      var target = this[name];

      this[key] = Object.keys(protos[key]).reduce(function(proto, prop) {
        target.prototype[prop] = protos[key][prop];
        proto[prop] = sandbox.spy(target.prototype, prop);
        return proto;
      }, {});
    }, this);

    this.clock = sandbox.useFakeTimers();

    this.board = new Board();

    done();

  },
  tearDown: function(done) {
    this.aio.read.override = null;

    sandbox.restore();

    for (var i = 0; i < 14; i++) {
      if (i < 6) {
        this.board.removeAllListeners("analog-read-" + i);
      }
      if (i > 2) {
        this.board.removeAllListeners("digital-read-" + i);
      }
    }

    Board.reset();
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
    this.clock.tick(10);
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
    this.clock.tick(10);
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
    this.clock.tick(10);
  }
};

exports["Board.prototype.digitalRead"] = {
  setUp: function(done) {
    var protos = {
      gpio: Object.assign({}, Gpio.prototype),
      aio: Object.assign({}, Aio.prototype)
    };

    this.Gpio = sandbox.spy(IO, "Gpio");
    this.Aio = sandbox.spy(IO, "Aio");

    ["Gpio", "Aio"].forEach(function(name) {
      var key = name.toLowerCase();
      var target = this[name];

      this[key] = Object.keys(protos[key]).reduce(function(proto, prop) {
        target.prototype[prop] = protos[key][prop];
        proto[prop] = sandbox.spy(target.prototype, prop);
        return proto;
      }, {});
    }, this);

    this.clock = sandbox.useFakeTimers();

    this.board = new Board();
    done();
  },
  tearDown: function(done) {
    this.gpio.read.override = null;

    sandbox.restore();
    Board.reset();

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
    this.clock.tick(10);
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
    this.clock.tick(10);
  }
};



exports["I2C"] = {
  setUp: function(done) {
    this.clock = sandbox.useFakeTimers();

    this.gpt = sandbox.stub(IO, "getPlatformType").returns(1);
    this.I2C = sandbox.spy(IO, "I2c");

    this.i2c = {
      write: sandbox.spy(I2c.prototype, "write"),
      writeReg: sandbox.spy(I2c.prototype, "writeReg"),
      writeByte: sandbox.spy(I2c.prototype, "writeByte"),
      address: sandbox.spy(I2c.prototype, "address")
    };

    this.board = new Board();

    this.i2c.read = sandbox.stub(I2c.prototype, "read").returns(new Buffer([0x0, 0x1]));
    this.i2c.readBytesReg = sandbox.stub(I2c.prototype, "readBytesReg").returns(new Buffer([0x0, 0x1]));
    done();
  },
  tearDown: function(done) {
    this.clock.restore();
    sandbox.restore();
    done();
  },
  shape: function(test) {
    test.expect(3);

    test.equal(this.board.i2cWrite, this.board.sendI2CWriteRequest);
    test.equal(this.board.i2cReadOnce, this.board.sendI2CReadRequest);
    test.equal(this.board.i2cConfig, this.board.sendI2CConfig);

    test.done();
  },

  explicitBus: function(test) {
    test.expect(1);

    this.I2C.reset();

    var board = new Board({
      i2c: {
        bus: 0xff
      }
    });

    board.i2cConfig();

    test.deepEqual(this.I2C.lastCall.args, [ 255 ]);

    test.done();
  },

  implicitBus: function(test) {
    test.expect(1);

    this.I2C.reset();

    Board.__i2cBus(1);

    var board = new Board();

    board.i2cConfig();

    test.deepEqual(this.I2C.lastCall.args, [ 1 ]);

    test.done();
  },

  explicitZeroBus: function(test) {
    test.expect(1);

    this.I2C.reset();

    var board = new Board({
      i2c: {
        bus: 0
      }
    });

    board.i2cConfig();

    test.deepEqual(this.I2C.lastCall.args, [ 0 ]);

    test.done();
  },

  implicitZeroBus: function(test) {
    test.expect(1);

    this.I2C.reset();

    Board.__i2cBus(0);

    var board = new Board();

    board.i2cConfig();

    test.deepEqual(this.I2C.lastCall.args, [ 0 ]);

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

  initAddressOnFirstReadNoRegister: function(test) {
    test.expect(4);

    var handler = sandbox.spy();
    this.board.i2cConfig({ delay: 1 });
    this.board.i2cRead(0x4, 2, handler);

    this.clock.tick(1);

    test.equal(this.i2c.address.callCount, 1);
    test.equal(this.i2c.read.callCount, 1);
    // Once on initialization
    test.equal(this.gpt.callCount, 1);

    test.equal(handler.callCount, 1);

    test.done();
  },

  initAddressOnFirstReadWithRegister: function(test) {
    test.expect(3);

    var handler = sandbox.spy();
    this.board.i2cConfig({ delay: 1 });
    this.board.i2cRead(0x4, 1, 2, handler);

    this.clock.tick(1);

    test.equal(this.i2c.address.callCount, 1);
    test.equal(this.i2c.readBytesReg.callCount, 1);
    // Once on initialization
    test.equal(this.gpt.callCount, 1);

    test.done();
  },

  initAddressOnFirstReadOnceNoRegister: function(test) {
    test.expect(3);

    this.board.i2cConfig({ delay: 1 });
    this.board.i2cReadOnce(0x4, 2, function() {
      test.equal(this.i2c.address.callCount, 1);
      test.equal(this.i2c.read.callCount, 1);
      test.done();
    }.bind(this));

    // Once on initialization
    test.equal(this.gpt.callCount, 1);

    this.clock.tick(10);
  },

  initAddressOnFirstReadOnceWithRegister: function(test) {
    test.expect(3);

    this.board.i2cConfig({ delay: 1 });
    this.board.i2cReadOnce(0x4, 1, 2, function() {
      test.equal(this.i2c.address.callCount, 1);
      test.equal(this.i2c.readBytesReg.callCount, 1);
      test.done();
    }.bind(this));

    // Once on initialization
    test.equal(this.gpt.callCount, 1);

    this.clock.tick(10);
  },

  warnReadOnceWithRegister: function(test) {
    test.expect(1);

    this.warn = sandbox.stub(console, "warn");
    this.i2c.readBytesReg.restore();
    this.i2c.readBytesReg = sandbox.stub(I2c.prototype, "readBytesReg").returns(new Buffer([]));

    this.board.i2cConfig({ delay: 1 });
    this.board.i2cReadOnce(0x4, 1, 2, function() {
      test.deepEqual(this.warn.lastCall.args, [ "I2C: Could not read %d Bytes from peripheral with address 0x%s", 2, "4" ]);
      test.done();
    }.bind(this));
    this.clock.tick(10);
  },

  warnReadOnceWithNoRegister: function(test) {
    test.expect(1);

    this.warn = sandbox.stub(console, "warn");
    this.i2c.read.restore();
    this.i2c.read = sandbox.stub(I2c.prototype, "read").returns(new Buffer([]));

    this.board.i2cConfig({ delay: 1 });
    this.board.i2cReadOnce(0x4, 2, function() {
      test.deepEqual(this.warn.lastCall.args, [ "I2C: Could not read %d Bytes from peripheral with address 0x%s", 2, "4" ]);
      test.done();
    }.bind(this));
    this.clock.tick(10);
  },


  warnReadWithRegister: function(test) {
    test.expect(1);

    this.warn = sandbox.stub(console, "warn");
    this.i2c.readBytesReg.restore();
    this.i2c.readBytesReg = sandbox.stub(I2c.prototype, "readBytesReg").returns(new Buffer([]));

    this.board.i2cConfig({ delay: 1 });
    this.board.i2cRead(0x4, 1, 2, function() {
      test.deepEqual(this.warn.lastCall.args, [ "I2C: Could not read %d Bytes from peripheral with address 0x%s", 2, "4" ]);
      test.done();
    }.bind(this));
    this.clock.tick(1);
  },

  warnReadWithNoRegister: function(test) {
    test.expect(1);

    this.warn = sandbox.stub(console, "warn");
    this.i2c.read.restore();
    this.i2c.read = sandbox.stub(I2c.prototype, "read").returns(new Buffer([]));

    this.board.i2cConfig({ delay: 1 });
    this.board.i2cRead(0x4, 2, function() {
      test.deepEqual(this.warn.lastCall.args, [ "I2C: Could not read %d Bytes from peripheral with address 0x%s", 2, "4" ]);
      test.done();
    }.bind(this));
    this.clock.tick(1);
  },

  writeAndReg: function(test) {
    // test.expect(1);

    this.i2cConfig = sandbox.spy(this.board, "i2cConfig");
    this.i2cWrite = sandbox.spy(this.board, "i2cWrite");
    this.i2cWriteReg = sandbox.spy(this.board, "i2cWriteReg");

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
    // 2 when using loop
    // test.equal(this.i2c.write.callCount, 2);
    test.equal(this.i2c.write.callCount, 1);
    test.equal(this.i2c.writeReg.callCount, 1);

    // Should NOT invoke writeReg
    this.board.i2cWrite(1, [2, 3]);
    // API
    test.equal(this.i2cWriteReg.callCount, 1);
    // Internal
    test.equal(this.i2c.write.callCount, 2);

    // 1 call to i2cConfig
    test.equal(this.i2cConfig.callCount, 1);

    test.done();
  },

  i2cReadNoRegister: function(test) {
    test.expect(6);

    var handler = sandbox.spy(function() {});

    this.board.i2cConfig(2);
    this.board.i2cRead(0x4, 2, handler);
    this.clock.tick(10);

    test.equal(handler.callCount, 5);
    test.equal(handler.getCall(0).args[0].length, 2);
    test.equal(handler.getCall(1).args[0].length, 2);
    test.equal(handler.getCall(2).args[0].length, 2);
    test.equal(handler.getCall(3).args[0].length, 2);
    test.equal(handler.getCall(4).args[0].length, 2);

    test.done();
  },

  i2cRead: function(test) {
    test.expect(6);

    var handler = sandbox.spy(function() {});

    this.board.i2cConfig(2);
    this.board.i2cRead(0x4, 1, 2, handler);
    this.clock.tick(10);

    test.equal(handler.callCount, 5);
    test.equal(handler.getCall(0).args[0].length, 2);
    test.equal(handler.getCall(1).args[0].length, 2);
    test.equal(handler.getCall(2).args[0].length, 2);
    test.equal(handler.getCall(3).args[0].length, 2);
    test.equal(handler.getCall(4).args[0].length, 2);

    test.done();
  },

  i2cReadOnce: function(test) {
    test.expect(2);

    var handler = sandbox.spy(function() {});

    this.board.i2cConfig(2);
    this.board.i2cReadOnce(0x4, 1, 2, handler);
    this.clock.tick(2);

    test.equal(handler.callCount, 1);
    test.equal(handler.getCall(0).args[0].length, 2);

    test.done();
  },

};

exports["Board.prototype.setSamplingInterval"] = {
  setUp: function(done) {
    this.clock = sandbox.useFakeTimers();
    this.galileo = new Board();

    done();
  },
  tearDown: function(done) {
    sandbox.restore();
    Board.reset();

    done();
  },
  samplingIntervalDefault: function(test) {
    test.expect(1);
    read();
    test.equal(read.samplingInterval, 10);
    test.done();
  },
  samplingIntervalCustom: function(test) {
    test.expect(1);
    read();
    this.galileo.setSamplingInterval(1000);
    test.equal(read.samplingInterval, 1000);
    test.done();
  }
};

exports["Board.prototype.servoConfig"] = {
  setUp: function(done) {
    this.clock = sandbox.useFakeTimers();
    this.pulsewidth_us = sandbox.spy(Pwm.prototype, "pulsewidth_us");
    this.galileo = new Board();

    done();
  },
  tearDown: function(done) {
    sandbox.restore();
    Board.reset();
    done();
  },
  servoConfigDefault: function(test) {
    test.expect(3);

    this.galileo.pinMode(9, this.galileo.MODES.SERVO);
    this.galileo.servoWrite(9, 180);
    test.equal(this.pulsewidth_us.getCall(0).args[0], 2600);

    this.galileo.servoWrite(9, 0);
    test.equal(this.pulsewidth_us.getCall(1).args[0], 600);

    this.galileo.servoWrite(9, 90);
    test.equal(this.pulsewidth_us.getCall(2).args[0], 1600);
    test.done();
  },
  servoConfigCustom: function(test) {
    test.expect(3);

    this.galileo.servoConfig(9, 1000, 2000);
    this.galileo.servoWrite(9, 180);
    test.equal(this.pulsewidth_us.getCall(0).args[0], 2000);

    this.galileo.servoWrite(9, 0);
    test.equal(this.pulsewidth_us.getCall(1).args[0], 1000);

    this.galileo.servoWrite(9, 90);
    test.equal(this.pulsewidth_us.getCall(2).args[0], 1500);
    test.done();
  },

};
