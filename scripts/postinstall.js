require("es6-shim");

var exec = require("child_process").exec;
var os = require("os");
var isGalileo = (function() {
  var release = os.release();
  return release.includes("yocto") ||
    release.includes("edison");
})();

if (isGalileo) {
  exec("echo 'src mraa-upm http://iotdk.intel.com/repos/1.1/intelgalactic' > /etc/opkg/mraa-upm.conf", function() {
    exec("opkg update; opkg install libmraa0");
  });
}
