var exec = require("child_process").exec;
var fs = require("fs");
var argv = require("optimist").
default ({
  i: 100,
  value: "1"
}).argv;

var a, b, c, total, start, name;

function report(note, start) {
  var time = process.hrtime(start);
  // nano to millisecond conversion
  var elapsed = time[1] / 1000000;
  console.log(
    "%d s, %s ms - %s", time[0], elapsed.toFixed(3), note
  );
  start = process.hrtime();
}

console.log("%d Writes\n---------------------", argv.i);

total = process.hrtime();
// -------------------------------------------

a = process.hrtime();
name = "exec/echo";
try {
  for (var i = 0; i < argv.i; i++) {
    exec("echo -n '" + argv.value + "' > /sys/class/gpio/gpio16/value");
  }
  report(name, a);
} catch (e) {
  console.log("%s failed", name);
}


// -------------------------------------------

b = process.hrtime();
name = "writeFile";
try {
  for (var i = 0; i < argv.i; i++) {
    fs.writeFile("/sys/class/gpio/gpio16/value", argv.value);
  }
  report(name, b);
} catch (e) {
  console.log("%s failed", name);
}


// -------------------------------------------

c = process.hrtime();
name = "writeFileSync";
try {
  for (var i = 0; i < argv.i; i++) {
    fs.writeFileSync("/sys/class/gpio/gpio16/value", argv.value);
  }
  report(name, b);
} catch (e) {
  console.log("%s failed", name);
}

console.log("---------------------");
report("Total", total);


// See: http://forums.trossenrobotics.com/showthread.php?6692-Intel-Galileo&p=62485#post62485
