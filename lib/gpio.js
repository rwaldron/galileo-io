var fs = require("fs");
var Emitter = require("events").EventEmitter;

function GPIO(setup) {
  this.supportedModes = setup.modes;
  this.mode = null;
  this.report = 0;
  this.value = 0;
  this.index = setup.index;

  var gpio = GPIO.Pins[setup.index];

  fs.writeFile(GPIO.Port("unexport"), "" + gpio, function() {
    // console.log("Exporting pin: %s to gpio %s", String(setup.index), String(gpio));
    fs.writeFile(GPIO.Port("export"), "" + gpio, function() {});
  });
}

GPIO.Pins = {
  "0": "40",
  "1": "41",
  "2": "31",
  "3": "30",
  "4": "28",
  "5": "17",
  "6": "24",
  "7": "27",
  "8": "26",
  "9": "19",
  "10": "16",
  "11": "25",
  "12": "38",
  "13": "39",

  "A0": "37",
  "A1": "36",
  "A2": "23",
  "A3": "22",
  "A4": "29",
  "A5": "20"
};


GPIO.Analog = {
  // TODO:
  // - MUX pins
  Nums: {
    "A0": "0",
    "A1": "1",
    "A2": "2",
    "A3": "3",
    "A4": "4",
    "A5": "5"
  }
};

GPIO.Digital = {
  Nums: {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    "11": "11",
    "12": "12",
    "13": "13"
  },
  PWM: {
    "3": "3",
    "5": "5",
    "6": "6",
    "9": "1",
    "10": "7",
    "11": "4"
  },
};

GPIO.Modes = [
  "in", "out", "analog", "pwm", "servo"
];

GPIO.Port = function() {
  var args = [].slice.call(arguments);
  return "/sys/class/gpio/" + args.join("/");
  // For some reason this makes node choke?
  // return "/sys/class/gpio/" + [].join.call(arguments, "/");
};

module.exports = GPIO;
