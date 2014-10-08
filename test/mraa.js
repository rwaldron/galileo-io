"use strict";

global.IS_TEST_MODE = true;

var Pin = require("../lib/mraa.js");
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

function removeNoop(args) {
  return args.map(function(list) {
    return list.slice(0, -1);
  });
}

var pinModes = [
  { modes: [] },
  { modes: [] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 2], analogChannel: 0 },
  { modes: [0, 1, 2], analogChannel: 1 },
  { modes: [0, 1, 2], analogChannel: 2 },
  { modes: [0, 1, 2], analogChannel: 3 },
  { modes: [0, 1, 2], analogChannel: 4 },
  { modes: [0, 1, 2], analogChannel: 5 }
];

var io = Pin.__io;
var Gpio = io.Gpio;
var Aio = io.Aio;
var Pwm = io.Pwm;
var I2c = io.I2c;

exports["Initialization"] = {
  setUp: function(done) {
    var state = {
      awaiting: [],
      ready: 0
    };

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

    // This mocks the initialization from Galileo constructor
    this.pins = pinModes.map(function(pin, index) {
      pin.addr = typeof pin.analogChannel === "number" ?
        "A" + pin.analogChannel : index;

      var gpio = new Pin(pin);

      state.awaiting.push(
        new Promise(function(resolve) {
          gpio.on("ready", function() {
            state.ready++;
            resolve();
          });
        })
      );

      return gpio;
    }, this);

    this.state = state;

    Promise.all(state.awaiting).then(function() {
      done();
    });
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  initialization: function(test) {
    test.expect(48);

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

    // 6 Analog IO Pins are initialized
    test.equal(this.Aio.callCount, 6);

    // 20 ready flags awaited
    test.equal(this.state.awaiting.length, 20);
    // 20 ready flags resolved
    test.equal(this.state.ready, 20);

    test.done();
  }
};

exports["Pin"] = {
  setUp: function(done) {

    this.clock = sinon.useFakeTimers();

    this.gpio = {
      dir: sinon.spy(Gpio.prototype, "dir")
    };

    this.pwm = {
      enable: sinon.spy(Pwm.prototype, "enable")
    };

    this.pin = new Pin({
      addr: 1,
      modes: [0, 1, 4]
    });

    this.proto = {};

    this.proto.functions = [{
      name: "write"
    }, {
      name: "read"
    }];

    this.proto.numbers = [{
      name: "report"
    }, {
      name: "value"
    }, {
      name: "addr"
    }, {
      name: "gpio"
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
      this.proto.functions.length +
      this.proto.numbers.length +
      this.instance.length
    );

    this.proto.functions.forEach(function(method) {
      test.equal(typeof this.pin[method.name], "function");
    }, this);

    this.proto.numbers.forEach(function(method) {
      test.equal(typeof this.pin[method.name], "number");
    }, this);

    this.instance.forEach(function(property) {
      test.notEqual(typeof this.pin[property.name], "undefined");
    }, this);

    test.done();
  },
  modeNull: function(test) {
    test.expect(1);

    test.equal(this.pin.mode, null);
    test.done();
  },
  ready: function(test) {
    test.expect(1);

    this.pin.on("ready", function() {
      test.ok(true);
      test.done();
    });
  },
  direction: function(test) {
    test.expect(4);

    test.equal(this.gpio.dir.callCount, 1);
    this.pin.direction = "in";
    test.equal(this.gpio.dir.callCount, 2);
    this.pin.direction = "out";
    test.equal(this.gpio.dir.callCount, 3);

    test.deepEqual(this.gpio.dir.args, [ [ 0 ], [ 1 ], [ 0 ] ]);
    test.done();
  }
};

exports["Digital"] = {
  setUp: function(done) {

    this.clock = sinon.useFakeTimers();

    this.gpio = {
      dir: sinon.spy(Gpio.prototype, "dir")
    };

    this.pwm = {
      enable: sinon.spy(Pwm.prototype, "enable")
    };

    this.pin = new Pin({
      addr: 3,
      modes: [0, 1, 3, 4]
    });

    done();
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  pin: function(test) {
    test.expect(3);

    test.equal(this.pin.isAnalog, false);

    // default not pwm
    test.equal(this.pin.isPwm, false);

    // default direction
    test.equal(this.pin.direction, "out");

    test.done();
  }
};

exports["Analog"] = {
  setUp: function(done) {

    this.clock = sinon.useFakeTimers();

    this.gpio = {
      dir: sinon.spy(Gpio.prototype, "dir")
    };

    this.aio = {
      read: sinon.spy(Aio.prototype, "read")
    };

    this.pwm = {
      enable: sinon.spy(Pwm.prototype, "enable")
    };

    this.pin = new Pin({
      addr: "A0",
      modes: [0, 1, 2],
      analogChannel: 0
    });

    done();
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  pin: function(test) {
    test.expect(3);

    test.equal(this.pin.isAnalog, true);

    // default not pwm
    test.equal(this.pin.isPwm, false);

    // default direction
    test.equal(this.pin.direction, null);

    test.done();
  }
};


exports["PWM"] = {
  setUp: function(done) {

    this.clock = sinon.useFakeTimers();

    this.gpio = {
      dir: sinon.spy(Gpio.prototype, "dir")
    };

    this.aio = {
      read: sinon.spy(Aio.prototype, "read")
    };

    this.pwm = {
      enable: sinon.spy(Pwm.prototype, "enable"),
      period_us: sinon.spy(Pwm.prototype, "period_us"),
      pulsewidth_us: sinon.spy(Pwm.prototype, "pulsewidth_us"),
      write: sinon.spy(Pwm.prototype, "write"),
    };

    this.pin = new Pin({
      addr: 3,
      modes: [0, 1, 3, 4]
    });

    done();
  },
  tearDown: function(done) {
    restore(this);
    done();
  },
  pin: function(test) {
    test.expect(3);

    test.equal(this.pin.isAnalog, false);

    // default not pwm
    test.equal(this.pin.isPwm, false);

    // default direction
    test.equal(this.pin.direction, "out");

    test.done();
  },
  modeSetsPWM: function(test) {
    test.expect(7);

    test.ok(!this.pin.isPwm);

    this.pin.mode = 3;

    test.equal(this.pwm.enable.callCount, 1);
    test.ok(this.pin.isPwm);

    this.pin.mode = 0;

    test.equal(this.pwm.enable.callCount, 2);
    test.ok(!this.pin.isPwm);

    this.pin.mode = 4;

    test.equal(this.pwm.enable.callCount, 3);
    test.ok(this.pin.isPwm);

    test.done();
  },

  analogWriteLow: function(test) {
    test.expect(4);

    this.pin.mode = 3;
    this.pin.write(0);

    test.ok(this.pwm.period_us.calledWith(700));
    test.ok(this.pwm.write.calledWith(0));

    test.equal(this.pwm.period_us.callCount, 1);
    test.equal(this.pwm.write.callCount, 1);

    test.done();
  },

  analogWriteCenter: function(test) {
    test.expect(4);

    this.pin.mode = 3;
    this.pin.write(127);

    test.ok(this.pwm.period_us.calledWith(700));
    test.ok(this.pwm.write.calledWith(0.4980392156862745));

    test.equal(this.pwm.period_us.callCount, 1);
    test.equal(this.pwm.write.callCount, 1);

    test.done();
  },

  analogWriteHigh: function(test) {
    test.expect(4);

    this.pin.mode = 3;
    this.pin.write(255);

    test.ok(this.pwm.period_us.calledWith(700));
    test.ok(this.pwm.write.calledWith(1));

    test.equal(this.pwm.period_us.callCount, 1);
    test.equal(this.pwm.write.callCount, 1);

    test.done();
  },

  servoWriteLow: function(test) {
    test.expect(4);

    this.pin.mode = 4;
    this.pin.write(0);

    test.ok(this.pwm.period_us.calledWith(7968));
    test.ok(this.pwm.pulsewidth_us.calledWith(600));

    test.equal(this.pwm.period_us.callCount, 1);
    test.equal(this.pwm.pulsewidth_us.callCount, 1);

    test.done();
  },

  servoWriteCenter: function(test) {
    test.expect(4);

    this.pin.mode = 4;
    this.pin.write(90);

    test.ok(this.pwm.period_us.calledWith(7968));
    test.ok(this.pwm.pulsewidth_us.calledWith(1600));

    test.equal(this.pwm.period_us.callCount, 1);
    test.equal(this.pwm.pulsewidth_us.callCount, 1);

    test.done();
  },

  servoWriteHigh: function(test) {
    test.expect(4);

    this.pin.mode = 4;
    this.pin.write(180);

    test.ok(this.pwm.period_us.calledWith(7968));
    test.ok(this.pwm.pulsewidth_us.calledWith(2600));

    test.equal(this.pwm.period_us.callCount, 1);
    test.equal(this.pwm.pulsewidth_us.callCount, 1);

    test.done();
  }
};

