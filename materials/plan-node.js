// Runs the in-browser engine (assets/plan-live.js) in node and prints the ladder canon as JSON.
// Usage: node materials/plan-node.js > /tmp/node-canon.json
var E = require("../assets/plan-live.js");
process.stdout.write(JSON.stringify(E.canon(), null, 1) + "\n");
