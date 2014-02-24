var fs = require("fs");
var Emitter = require("events").EventEmitter;

function GPIO(setup) {
  // echo "3" > /sys/class/gpio/export

  this.supportedModes = setup.modes;
  this.mode = setup.analogChannel !== undefined ? 0 : 1;
  this.report = 0;
  this.value = 0;

  // this.fd =
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
  Nums: {
    "A0": "0", "A1": "1", "A2": "2", "A3": "3", "A4": "4", "A5": "5"
  },
};




GPIO.Modes = [
  "in", "out", "analog", "pwm", "servo"
];

//_PWMDICT    = {'3':"3",'5':"5",'6':"6",'9':"1",'10':"7",'11':"4"};
// {
//   0: "in",
//   1: "out",

// };


GPIO.Port = function() {
  var args = [].slice.call(arguments);
  return "/sys/class/gpio/" + args.join("/");
  // For some reason this makes node choke?
  // return "/sys/class/gpio/" + [].join.call(arguments, "/");
};

module.exports = GPIO;
