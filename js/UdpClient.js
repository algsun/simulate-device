var Gateway = require('./Gateway');
var config = require('./../config/config');

var gateways = config.gateways;

gateways.forEach(function (element, index, array) {
    new Gateway(element);
});



