"use strict";

global.IS_TEST_ENV = true;


var Emitter = require("events").EventEmitter;
var sinon = require("sinon");

var Board = require("../");
var pinMapping = require("../lib/pin-mapping/");
var joulePinMapping = pinMapping[13];

var read = Board.__read;
var IO = Board.__io;
var Gpio = IO.Gpio;
var Aio = IO.Aio;
var Pwm = IO.Pwm;
var I2c = IO.I2c;

var sandbox = sinon.sandbox.create();

var pinModes = [
  null, // There is no pin with the number 0
  { modes: [0, 1] },
  { modes: [0, 1] },
  null,
  { modes: [0, 1] },
  { modes: [0, 1] },
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
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1] },
  null,
  { modes: [0, 1] },
  null,
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1] },
  { modes: [0, 1, 3, 4] },
  null,
  { modes: [0, 1, 3, 4] },
  null,
  { modes: [0, 1, 3, 4] },
  null,
  null,
  { modes: [0, 1] },
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  { modes: [0, 1] },
  null,
  { modes: [0, 1] },
  null,
  { modes: [0, 1] },
  null,
  { modes: [0, 1] },
  null,
  { modes: [0, 1] },
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
  { modes: [0, 1] },
  { modes: [0, 1] },
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
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  // These are actually the LEDs
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1] },
];

exports["Platform Type Joule (Carrier Board)"] = {
  setUp: function(done) {

    this.noConnections = pinModes.reduce(function(accum, value, i) {
      if (value === null) {
        accum.push(i);
      }
      return accum;
    }, []);
    this.connections = pinModes.reduce(function(accum, value, i) {
      if (value !== null) {
        accum.push(i);
      }
      return accum;
    }, []);

    Board.__carrierboard(true);
    Board.__pinmodes(pinModes);
    Board.__platformPinMapping(joulePinMapping);
    done();
  },
  tearDown: function(done) {
    Board.__carrierboard(false);
    Board.__pinmodes();
    Board.__platformPinMapping();
    sandbox.restore();
    Board.reset();
    done();
  },
  carrierBoardErrors: function(test) {
    test.expect(569);

    var board = new Board();
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
    var keys = Object.keys(joulePinMapping);


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
        var pin = joulePinMapping[key];

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

  pinModeGP10: function(test) {
    var nameIndexMap = Object.keys(joulePinMapping).reduce(function(accum, key) {
      var index = joulePinMapping[key];

      if (key.startsWith("GP10")) {
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
  pinModeGPIO: function(test) {
    var nameIndexMap = Object.keys(joulePinMapping).reduce(function(accum, key) {
      var index = joulePinMapping[key];

      if (key.startsWith("GPIO")) {
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
    var nameIndexMap = Object.keys(joulePinMapping).reduce(function(accum, key) {
      var index = joulePinMapping[key];

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
    var keys = Object.keys(joulePinMapping);

    test.expect(keys.length);

    var board = new Board();

    board.on("ready", function() {
      keys.forEach(function(key) {
        var expect = joulePinMapping[key];

        test.equal(this.normalize(key), expect);

      }, this);

      test.done();
    });
  }
};
