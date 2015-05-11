"use strict";
var stream = require("stream");
var util = require("util");
var iconv = require("iconv-lite");


var PACKAGE_NAME = "convert-newline";
var NEWLINES = {
	"cr": "\r",
	"lf": "\n",
	"crlf": "\r\n"
};
// https://iojs.org/api/buffer.html#buffer_buffer
var UTF8 = "utf8";

function stringConverter(newline) {
	var crlf = /\r\n/g;
	var cr = /\r/g;
	var lf = /\n/g;
	return function(str) {
		str = str.replace(crlf, NEWLINES.lf);
		str = str.replace(cr, NEWLINES.lf);
		return str.replace(lf, newline);
	};
}

function bufferConverterSimple(newline) {
	var converter = stringConverter(newline);
	return function bufferconvertersimple(buff) {
		var str = buff.toString();
		str = converter(str, newline);
		return new Buffer(str);
	};
}

function bufferConverterIconv(newline, encoding) {
	var converter = stringConverter(newline);
	return function bufferconvertriconv(buff) {
		var str = iconv.decode(buff, encoding);
		str = converter(str, newline);
		return iconv.encode(str, encoding);
	};
}

function bufferConverter(newline, encoding) {
	return !encoding ? bufferConverterSimple(newline) : bufferConverterIconv(newline, encoding);
}

util.inherits(StreamConverter, stream.Transform);
function StreamConverter(newline, options) {
	options = options || {};
	options.decodeStrings = false;
	options.encoding = UTF8;
	stream.Transform.call(this, options);
	this.converter = stringConverter(newline);
	this.lastIsCr = false;
}

StreamConverter.prototype._transform = function(chunk, encoding, done) {
	// TODO support buffer
	if (typeof chunk !== "string") {
		return done(new Error(util.format("%s needs string as its input.", PACKAGE_NAME)));
	}
	try {
		if (this.lastIsCr) {
			// insert CR
			chunk = NEWLINES.cr + chunk;
		}
		this.lastIsCr = (chunk.lastIndexOf(NEWLINES.cr) === (chunk.length - NEWLINES.cr.length));
		if (this.lastIsCr) {
			// strip CR
			chunk = chunk.slice(0, -1);
		}
		var res = this.converter(chunk);
		if (res && res.length) {
			this.push(res);
		}
		done();
	}
	catch (e) {
		done(e);
	}
};

StreamConverter.prototype._flush = function(done) {
	if (this.lastIsCr) {
		// insert last CR
		this.push(this.converter(NEWLINES.cr));
	}
	this.lastIsCr = false;
	done();
};

module.exports = function(newline, encoding) {
	newline = (newline || "lf").toLowerCase();
	if (!NEWLINES.hasOwnProperty(newline)) {
		throw new Error("Unsupported `newline`");
	}
	newline = NEWLINES[newline];
	return {
		string: function() {
			return stringConverter(newline);
		},
		buffer: function() {
			return bufferConverter(newline, encoding);
		},
		stream: function(options) {
			return new StreamConverter(newline, options);
		}
	};
};
