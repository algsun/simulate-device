/**
 * Created by LJF on 2014-06-19.
 */
var dgram = require('dgram');
var later = require('later');
var Device = require('./Device.js');
var mysql = require('mysql');
var moment = require("moment");

module.exports = function (gateway) {
    var pri = {
        sendData: function (device) {
            var dataPacket = device.dataPacket();
            pri.udpClient.send(dataPacket, 0, dataPacket.length, pri.serverPort, pri.serverHost, function (err, bytes) {
                console.log(dataPacket.toString('hex'));
            });

//            var statePacket = device.statePacket();
//            pri.udpClient.send(statePacket, 0, statePacket.length, pri.serverPort, pri.serverHost, function (err, bytes) {
//                console.log(statePacket.toString('hex'));
//            });
        },
        schedule: function () {
            pri.devices.forEach(function (element, index, array) {
                pri.sendData(element);
            });
        }
    };

    pri.udpClient = dgram.createSocket("udp4");
    pri.serverHost = gateway.serverHost || "127.0.0.1";
    pri.serverPort = gateway.serverPort || 10000;
    pri.siteId = gateway.siteId;
    pri.status = gateway.status;
    pri.interval = gateway.interval;
    pri.devices = [];


//    ************************************************************
    var conn = mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        database: 'aqms',
        password: 'admin',
        port: 3306
    });

    conn.connect(
        function (error, results) {
            if (error) {
                console.log('Connection Error: ' + error.message);
                return;
            }
            console.log('Connected to MySQL');
        }
    );

    conn.query("CREATE TABLE IF NOT EXISTS `send_records` (" +
        "`id` INT(11) NOT NULL AUTO_INCREMENT COMMENT '自增主键'," +
        "`measure_data_id` INT(11) NOT NULL COMMENT 'measure_data表的id'," +
        "`stamp` datetime NOT NULL COMMENT '时间'," +
        "PRIMARY KEY (`id`)) ENGINE=INNODB DEFAULT CHARSET=utf8", function (err, rows, fields) {
    });

    var startMeasureDataId = 0;

    var sendData = function () {
        conn.query("SELECT MAX(`measure_data_id`) AS measure_data_id FROM `aqms`.`send_records` LIMIT 1", function (err, rows, fields) {
            if (startMeasureDataId != 0) {
                startMeasureDataId = rows[0].measure_data_id + 1;
            } else {
                if (rows.length != 0) {
                    startMeasureDataId = rows[0].measure_data_id + 1;
                }
            }
            var endMeasureDataId = startMeasureDataId + 2;
            var sql = 'SELECT id,M_128,M_126,M_130,M_129,M_127,M_101,M_116,M_108,M_121,M_107,M_102,`dateTime` ' +
                'FROM `measure_data` where id BETWEEN ' + startMeasureDataId + ' AND ' + endMeasureDataId;
            startMeasureDataId = endMeasureDataId;
            conn.query(sql, function (err, rows, fields) {
//                if (pri.status == "init") {
                    for (var v in rows) {
                        var obj = rows[v];
                        var insertSql = "INSERT INTO `send_records` (`measure_data_id`, `stamp`)  VALUES (" + obj.id + ",'" + moment(new Date()).format('YYYY-MM-DD HH:mm:ss') + "')";
                        conn.query(insertSql, function (err, result) {
                            if (err) {
                                console.log('[INSERT ERROR] - ', err.message);
                                return;
                            }
                        });
                    }
//                } else {
//                    var obj = rows[rows.length - 1];
//                    var insertSql = "INSERT INTO `send_records` (`measure_data_id`, `stamp`)  VALUES (" + obj.id + ",'" + moment(new Date()).format('YYYY-MM-DD HH:mm:ss') + "')";
//                    conn.query(insertSql, function (err, result) {
//                        if (err) {
//                            console.log('[INSERT ERROR] - ', err.message);
//                            return;
//                        }
//                    });
//                }
                for (var v in rows) {
                    var obj = rows[v];
                    var sensors = [];
                    if (obj.M_135 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2060;
                        sensor["maxValue"] = obj.M_135;
                        sensors.push(sensor);
                    }

                    if (obj.M_131 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2061;
                        sensor["maxValue"] = obj.M_131;
                        sensors.push(sensor);
                    }

                    if (obj.M_130 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2062;
                        sensor["maxValue"] = obj.M_130;
                        sensors.push(sensor);
                    }

                    if (obj.M_129 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2063;
                        sensor["maxValue"] = obj.M_129;
                        sensors.push(sensor);
                    }

                    if (obj.M_127 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2064;
                        sensor["maxValue"] = obj.M_127;
                        sensors.push(sensor);
                    }

                    if (obj.M_101 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2065;
                        sensor["maxValue"] = obj.M_101;
                        sensors.push(sensor);
                    }

                    if (obj.M_116 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2066;
                        sensor["maxValue"] = obj.M_116;
                        sensors.push(sensor);
                    }

                    if (obj.M_108 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2067;
                        sensor["maxValue"] = obj.M_108;
                        sensors.push(sensor);
                    }

                    if (obj.M_121 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2068;
                        sensor["maxValue"] = obj.M_121;
                        sensors.push(sensor);
                    }

                    if (obj.M_107 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2069;
                        sensor["maxValue"] = obj.M_107;
                        sensors.push(sensor);
                    }

                    if (obj.M_102 != null) {
                        var sensor = {};
                        sensor["sensorId"] = 2070;
                        sensor["maxValue"] = obj.M_102;
                        sensors.push(sensor);
                    }

                    gateway.devices[0].sensors = sensors;
                    var date = new Date(obj.dateTime);
                    gateway.devices[0]["year"] = 15;
                    gateway.devices[0]["month"] = date.getMonth() + 1;
                    gateway.devices[0]["day"] = date.getDate();
                    gateway.devices[0]["hour"] = date.getHours();
                    gateway.devices[0]["minute"] = date.getMinutes();
                    gateway.devices[0]["second"] = date.getSeconds();

                    pri.devices.push(new Device(pri.siteId, gateway.devices[0].deviceId, gateway.devices[0]))
                    pri.schedule();
                }
            });
        });
    };

    setInterval(function () {
        sendData();
    }, pri.interval*1000);
};