var fs = require("fs");
var Emitter = require("events").EventEmitter;


var _ = null;

var DIGITAL = {
  PINS: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
  ],
  GPIO: [
    50, 51, 32, 18, 28, 17, 24, 27, 26, 19, 16, 25, 38, 39
  ],
  MUX: [
    {
      GPIO: [
        40, 41, 31, 30, _, _, _, _, _, _, 42, 43, 54, 55
      ],
      DRIVE: [
        1, 1, 1, 1, _, _, _, _, _, _, 1, 1, 1, 1
      ]
    },
    {
      GPIO: [
        _, _, 1, 0, _, _, _, _, _, _, _, _, _, _
      ],
      DRIVE: [
        1, 1, 1, 1, _, _, _, _, _, _, 1, 1, 1, 1
      ]
    }
  ]
};

var PWM = {
  PINS: [
    3, 5, 6, 9, 10, 11
  ],
  ALIAS: {
    3: 3, 5: 5, 6: 6, 9: 1, 10: 7, 11: 4
  }
};

var ANALOG = {
  PINS: [
    "A0", "A1", "A2", "A3", "A4", "A5"
  ],
  GPIO: [
    44, 45, 46, 47, 48, 49
  ],
  ALIAS: {
    "A0": 0, "A1": 1, "A2": 2, "A3": 3, "A4": 4, "A5": 5
  },
  OFFSET: {
    "A0": 14, "A1": 15, "A2": 16, "A3": 17, "A4": 18, "A5": 19
  },
  MUX: [
    {
      GPIO: [
        37, 36, 23, 22, 21, 20
      ],
      DRIVE: [
        0, 0, 0, 0, 0, 0
      ]
    },
    {
      GPIO: [
        null, null, null, null, 29, 29
      ],
      DRIVE: [
        null, null, null, null, 1, 1
      ]
    }
  ]
}

function IO() {}

IO.prototype.read = function(file) {


}


function Mux() {

}


function Pins




function Pin(setup) {
  this.supportedModes = setup.modes;
  this.index = setup.index;
  this.report = 0;
  this.value = 0;
  this.mode = null;
  // this.fd = null;

  var gpio = Pin.Pins[setup.index];

  // TODO: There is obviously a better way to do this?
  fs.writeFile(Pin.Port("unexport"), gpio, function() {
    fs.writeFile(Pin.Port("export"), gpio, function() {});
  });
}

Pin.Pins = {
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


Pin.Analog = {
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

Pin.Digital = {
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

Pin.Modes = [
  "in", "out", "analog", "pwm", "servo"
];

Pin.Port = function() {
  var args = [].slice.call(arguments);
  return "/sys/class/gpio/" + args.join("/");
  // For some reason this makes node choke?
  // return "/sys/class/gpio/" + [].join.call(arguments, "/");
};

module.exports = Pin;
