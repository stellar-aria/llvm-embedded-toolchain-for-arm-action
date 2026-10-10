const { execSync } = require("child_process");
const fs = require("fs");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// Older toolchains (e.g. 16.0.0) link against libtinfo.so.5. The libtinfo5
// package was dropped in Ubuntu 24.04, so fall back to symlinking libtinfo.so.6.
function run() {
  if (process.platform !== 'linux') {
    return;
  }
  try {
    sh("sudo apt-get install -y libtinfo5");
    return;
  } catch (error) {
    console.log(`apt-get install libtinfo5 failed: ${error.message}`);
  }
  try {
    const dir = sh("dirname \"$(ldconfig -p | awk '/libtinfo\\.so\\.6/ {print $NF; exit}')\"").trim();
    if (!dir || !fs.existsSync(`${dir}/libtinfo.so.6`)) {
      console.log("libtinfo.so.6 not found, cannot provide libtinfo.so.5");
      return;
    }
    sh(`sudo ln -sf ${dir}/libtinfo.so.6 ${dir}/libtinfo.so.5`);
    sh("sudo ldconfig");
  } catch (error) {
    console.log(`libtinfo.so.5 fallback failed: ${error.message}`);
  }
}

module.exports.run = run;
