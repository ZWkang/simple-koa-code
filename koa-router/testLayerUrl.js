const layer = require("./lib/layer");

const urlTest = new layer("/test/:url", ["get", "post"], () => {});
const secondUrlTest = new layer("/route/:foo/(.*)", ["get", "post"], () => {});

secondUrlTest.url("xixi", "sss");
