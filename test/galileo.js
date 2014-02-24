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
  },

  writeFileSync: function(path, encoding, cb) {
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

exports["Galileo"] = {
  setUp: function(done) {

    this.clock = sinon.useFakeTimers();

    this.galileo = new Galileo();

    this.proto = {};

    this.proto.functions = [{
      name: "analogRead"
    }, {
      name: "analogWrite"
    }, {
      name: "digitalRead"
    }, {
      name: "digitalWrite"
    }, {
      name: "servoWrite"
    }];

    this.proto.objects = [{
      name: "MODES"
    }];

    this.proto.numbers = [{
      name: "HIGH"
    }, {
      name: "LOW"
    }];

    this.instance = [{
      name: "pins"
    }, {
      name: "analogPins"
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
      this.proto.objects.length +
      this.proto.numbers.length +
      this.instance.length
    );

    this.proto.functions.forEach(function(method) {
      test.equal(typeof this.galileo[method.name], "function");
    }, this);

    this.proto.objects.forEach(function(method) {
      test.equal(typeof this.galileo[method.name], "object");
    }, this);

    this.proto.numbers.forEach(function(method) {
      test.equal(typeof this.galileo[method.name], "number");
    }, this);

    this.instance.forEach(function(property) {
      test.notEqual(typeof this.galileo[property.name], "undefined");
    }, this);

    test.done();
  },
  readonly: function(test) {
    test.expect(7);

    test.equal(this.galileo.HIGH, 1);

    test.throws(function() {
      this.galileo.HIGH = 42;
    });

    test.equal(this.galileo.LOW, 0);

    test.throws(function() {
      this.galileo.LOW = 42;
    });

    test.deepEqual(this.galileo.MODES, {
      INPUT: 0,
      OUTPUT: 1,
      ANALOG: 2,
      PWM: 3,
      SERVO: 4
    });

    test.throws(function() {
      this.galileo.MODES.INPUT = 42;
    });

    test.throws(function() {
      this.galileo.MODES = 42;
    });

    test.done();
  },
  emitter: function(test) {
    test.expect(1);
    test.ok(this.galileo instanceof Emitter);
    test.done();
  },
  connected: function(test) {
    test.expect(1);

    this.galileo.on("connected", function() {
      test.ok(true);
      test.done();
    });
  },
  ready: function(test) {
    test.expect(1);

    this.galileo.on("ready", function() {
      test.ok(true);
      test.done();
    });
  }
};

[
  "analogWrite",
  "digitalWrite",
  "analogRead",
  "digitalRead"
].forEach(function(fn) {
  var entry = "Galileo.prototype." + fn;
  var action = fn.toLowerCase();
  var isAnalog = /^analog/.test(fn);

  var index = isAnalog ? 14 : 9;
  var pin = isAnalog ? "A0" : 9;
  var event, sent, value, scaled, port;

  exports[entry] = {
    setUp: function(done) {

      this.clock = sinon.useFakeTimers();

      this.write = sinon.stub(Galileo.prototype, "write", function() {

      });

      this.galileo = new Galileo();

      done();
    },
    tearDown: function(done) {
      restore(this);

      this.galileo.removeAllListeners("analog-read-A0");
      this.galileo.removeAllListeners("digital-read-9");

      done();
    }
  };

  // *Read Tests
  if (/read/.test(action)) {
    event = (isAnalog ? "analog" : "digital") + "-read-" + pin;
    value = isAnalog ? 1024 : 1;
    scaled = isAnalog ? value >> 2 : 1;
    port = isAnalog ?
      "/sys/bus/iio/devices/iio:device0/in_voltage0_raw" :
      "/sys/class/gpio/gpio19/value";

    exports[entry].correctMode = function(test) {
      test.expect(1);

      if (isAnalog) {
        // Reading from an ANALOG pin should set its mode to 1 ("out")
        this.galileo[fn](pin, function() {});
        test.equal(this.galileo.pins[index].mode, 1);

      } else {
        // Reading from a DIGITAL pin should set its mode to 0 ("in")
        this.galileo[fn](pin, function() {});
        test.equal(this.galileo.pins[index].mode, 0);
      }

      test.done();
    };


    exports[entry].port = function(test) {
      test.expect(1);

      this.readFile = sinon.stub(fsStub, "readFile", function(path, flags, cb) {
        test.equal(port, path);
        test.done();
      });

      var handler = function(data) {};

      this.galileo[fn](pin, handler);
    };

    exports[entry].handler = function(test) {
      test.expect(1);

      this.readFile = sinon.stub(fsStub, "readFile", function(path, flags, cb) {
        cb(null, value);
      });

      var handler = function(data) {
        test.equal(data, scaled);
        test.done();
      };

      this.galileo[fn](pin, handler);
    };

    exports[entry].event = function(test) {
      test.expect(1);

      this.readFile = sinon.stub(fsStub, "readFile", function(path, flags, cb) {
        cb(null, value);
      });

      this.galileo.once(event, function(data) {
        test.equal(data, scaled);
        test.done();
      });

      var handler = function(data) {};

      this.galileo[fn](pin, handler);
    };
  } else {
    // *Write Tests
    value = isAnalog ? 255 : 1;
    sent = isAnalog ? ["/sys/class/gpio/gpio37/value", 255] : ["/sys/class/gpio/gpio19/value", 1];

    exports[entry].modeIsOutput = function(test) {
      test.expect(2);

      // Set pin to INPUT...
      this.galileo.pinMode(pin, 0);
      test.equal(this.galileo.pins[index].mode, 0);

      // Writing to a pin should change its mode to 1
      this.galileo[fn](pin, value);
      test.equal(this.galileo.pins[index].mode, 1);

      test.done();
    };

    exports[entry].write = function(test) {
      test.expect(2);

      this.galileo[fn](pin, value);

      test.ok(this.write.calledOnce);
      test.deepEqual(this.write.firstCall.args, sent);

      test.done();
    };

    exports[entry].stored = function(test) {
      test.expect(1);

      this.galileo[fn](pin, value);

      test.equal(this.galileo.pins[index].value, value);

      test.done();
    };
  }
});


exports["Galileo.prototype.servoWrite"] = {
  setUp: function(done) {
    done();
  },
  tearDown: function(done) {
    done();
  },
  alias: function(test) {
    test.expect(1);
    test.equal(
      Galileo.prototype.servoWrite,
      Galileo.prototype.analogWrite
    );
    test.done();
  }
};


exports["Galileo.prototype.pinMode"] = {
  setUp: function(done) {

    this.clock = sinon.useFakeTimers();
    this.writeFileSync = sinon.stub(fsStub, "writeFileSync", function() {

    });

    this.galileo = new Galileo();

    done();
  },
  tearDown: function(done) {
    restore(this);

    done();
  },
  analogOut: function(test) {
    test.expect(2);

    this.galileo.pinMode("A1", 1);

    test.ok(this.writeFileSync.calledOnce);

    // test.deepEqual(
    //   this.writeFileSync.firstCall.args,
    //   ["/sys/class/gpio/export", "36"]
    // );

    test.deepEqual(
      this.writeFileSync.firstCall.args,
      ["/sys/class/gpio/gpio36/direction", "out"]
    );

    test.done();
  },
  analogIn: function(test) {
    test.expect(2);

    var sent = [0, 11, 1];

    this.galileo.pinMode("A1", 0);

    test.ok(this.writeFileSync.calledOnce);

    // test.deepEqual(
    //   this.writeFileSync.firstCall.args,
    //   ["/sys/class/gpio/export", "36"]
    // );

    test.deepEqual(
      this.writeFileSync.firstCall.args,
      ["/sys/class/gpio/gpio36/direction", "in"]
    );

    test.done();
  },

  digitalOut: function(test) {
    test.expect(2);

    var sent = [0, 11, 1];

    this.galileo.pinMode(9, 1);

    test.ok(this.writeFileSync.calledOnce);

    // test.deepEqual(
    //   this.writeFileSync.firstCall.args,
    //   ["/sys/class/gpio/export", "19"]
    // );

    test.deepEqual(
      this.writeFileSync.firstCall.args,
      ["/sys/class/gpio/gpio19/direction", "out"]
    );

    test.done();
  },
  digitalIn: function(test) {
    test.expect(2);

    var sent = [0, 11, 1];

    this.galileo.pinMode(9, 0);

    test.ok(this.writeFileSync.calledOnce);

    // test.deepEqual(
    //   this.writeFileSync.firstCall.args,
    //   ["/sys/class/gpio/export", "19"]
    // );

    test.deepEqual(
      this.writeFileSync.firstCall.args,
      ["/sys/class/gpio/gpio19/direction", "in"]
    );

    test.done();
  }
};
