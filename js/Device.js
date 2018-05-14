/**
 * Created by LJF on 2014-06-16.
 */
var ByteBuffer = require('byte');
var CRC16Modbus = require('./CRC16Modbus.js');
var moment = require('moment');
var mathjs = require('mathjs');

module.exports = function (siteId, deviceId, device) {
    math = mathjs();
    var pri = {
        packetHead: function (packetType, length) {
            var buffer = ByteBuffer.allocate(6);
            // 帧头1 帧头2 固定两个字节
            buffer.putShort(0x55aa);
            // 协议类型
            buffer.put(packetType);   // 默认上行数据包
            // 终端类型     网关？中继？节点？
            buffer.put(pri.deviceType);   // 默认节点
            // 协议版本
            buffer.put(0x03);   // 默认 v3
            // 包长
            buffer.put(length);
            return buffer.array();  // Buffer
        },
        dataPacketBody: function () {
            var buffer = ByteBuffer.allocate(1024);
            // 可控标志
            buffer.put(pri.control);   // 默认可控
            // 父节点ID，节点ID 采用 小端模式，低位在前，高位在后
            // 父节点ID
            buffer.order(ByteBuffer.LITTLE_ENDIAN);     // 调整为小端模式
            buffer.putUInt16(pri.parentId);
            // 节点ID
            buffer.putUInt16(pri.deviceId);
            buffer.order(ByteBuffer.BIG_ENDIAN);    // 调整为大端模式
            // 包序列号
            pri.sequence = pri.sequence % 255 + 1;
            buffer.put(pri.sequence);
            // 电压状态
            buffer.put(pri.voltage);   // 默认外部供电
            // RSSI
            if (pri.rssi < 0) {
                pri.rssi = pri.rssi + 256;
            }
            buffer.put(pri.rssi);
            // LQI
            buffer.put(pri.lqi);

            for (var i = 0; i < pri.sensors.length; i++) {
                var sensor = pri.sensors[i];
                buffer.putUInt16(sensor.sensorId);

                if (sensor.sensorId >= 0x0000 && sensor.sensorId <= 0x07FF) {
                    buffer.putUInt16(math.randomInt(sensor.minValue, sensor.maxValue));
                } else if (sensor.sensorId >= 0x0800 && sensor.sensorId <= 0x0BFF) {
                    buffer.putFloat(sensor.maxValue);
                }

            }
            // TODO 将终端参数和包体放在一起
//            buffer.putString(pri.terminalParams());
            return buffer.array();
        },
        statePacketBody: function () {
            var buffer = ByteBuffer.allocate(1024);
            // 父节点ID，节点ID 采用 小端模式，低位在前，高位在后
            // 父节点ID
            buffer.order(ByteBuffer.LITTLE_ENDIAN);     // 调整为小端模式
            buffer.putUInt16(pri.parentId);
            // 节点ID
            buffer.putUInt16(pri.deviceId);
            buffer.order(ByteBuffer.BIG_ENDIAN);    // 调整为大端模式
            // 包序列号
            pri.stateSequence = pri.stateSequence % 255 + 1;
            buffer.put(pri.stateSequence);
            // 电压状态
            buffer.put(pri.voltage);   // 默认外部供电
            // RSSI
            if (pri.rssi < 0) {
                pri.rssi = pri.rssi + 256;
            }
            buffer.put(pri.rssi);
            // LQI
            buffer.put(pri.lqi);
            // 工作周期
            buffer.putUInt16(pri.interval);
            // 工作模式
            buffer.put(pri.workMode);
            // 搜网次数
            buffer.putUInt16(pri.connectionCount);
            // 可控标志
            buffer.put(pri.control);
            // 产品序列号
            buffer.putUInt32(pri.serialNumber);
            // 接入点号
            buffer.putUInt32(pri.siteId);

            // TODO 参数区
            return buffer.array();
        },
        packetCRC: function (source) {
            var buffer = ByteBuffer.allocate(2);
            buffer.order(ByteBuffer.LITTLE_ENDIAN);
            buffer.putUInt16(CRC16Modbus.getCRC16Modbus(source));
            return buffer.array();
        },
        terminalParams: function () {
            var buffer = ByteBuffer.allocate(1024);
            // 工作周期
            buffer.putUInt16(0xA000);
            buffer.putUInt16(pri.interval);    // 0~65535秒
            // 时间戳
            buffer.putUInt16(0xA001);
            // 6 byte
            buffer.put(pri.year);
            buffer.put(pri.month);
            buffer.put(pri.day);
            buffer.put(pri.hour);
            buffer.put(pri.minute);
            buffer.put(pri.second);
//            buffer.put(15);
//            buffer.put(moment().month() + 1);
//            buffer.put(moment().date());
//            buffer.put(moment().hour());
//            buffer.put(moment().minute());
//            buffer.put(moment().second());
            // 站点ID
            buffer.putUInt16(0xA002);
            buffer.putUInt32(pri.siteId);
            // 分包
            buffer.putUInt16(0xA004);
            // 2 Byte
            buffer.putUInt16(0x0101);
            // 断网指数
            buffer.putUInt16(0xA006);
            // 2 Byte
            buffer.putUInt16(0xE470);
            return buffer.array();
        }
    };

    var pub = {
        dataPacket: function () {
            var bufferBody = pri.dataPacketBody();
            var bufferTerminalParams = pri.terminalParams();
            // 协议类型-0x01 上行数据包
            var bufferHead = pri.packetHead(1, Buffer.concat([bufferBody, bufferTerminalParams]).length + 2);
            var bufferCRC = pri.packetCRC(Buffer.concat([bufferHead, bufferBody, bufferTerminalParams]));
            return Buffer.concat([bufferHead, bufferBody, bufferTerminalParams, bufferCRC]);
        },
        statePacket: function () {
            var bufferBody = pri.statePacketBody();
            // 协议类型-0x03 设备状态包
            var bufferHead = pri.packetHead(3, bufferBody.length + 2);
            var bufferCRC = pri.packetCRC(Buffer.concat([bufferHead, bufferBody]));
            return Buffer.concat([bufferHead, bufferBody, bufferCRC]);
        },
        getInterval: function () {
            return pri.interval;
        }
    };

    pri.siteId = siteId;
    pri.deviceId = deviceId;
    pri.parentId = device.parentId || 1;
    pri.deviceType = device.deviceType || 1;
    pri.sequence = device.sequence || 0;
    pri.stateSequence = device.stateSequence || 0;
    pri.interval = device.interval || 600;
    pri.control = device.control || 0;
    pri.voltage = device.voltage || 40;
    pri.rssi = device.rssi || -43;
    pri.lqi = device.lqi || 21
    pri.workMode = 0;
    pri.connectionCount = 1;
    pri.serialNumber = device.serialNumber || 12345678;
    pri.sensors = device.sensors || [];
    pri.thresholdAlarmState = device.thresholdAlarmState || 0;
    pri.thresholds = device.thresholds || [];
    pri.year = device.year;
    pri.month = device.month;
    pri.day = device.day;
    pri.hour = device.hour;
    pri.minute = device.minute;
    pri.second = device.second;

    return pub;
};
