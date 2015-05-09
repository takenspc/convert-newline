"use strict";
var assert = require("assert");
var fs = require("fs");
var iconv = require("iconv-lite");
var convertNewline = require("./");

//
// const.
//
var UTF8 = "utf8";
var SHIFT_JIS = "shift_jis";

//
// Test Data
//
function getStringTestData() {
	return {
		cr: "AAA\rBBB\rCCC\r",
		crlf: "AAA\r\nBBB\r\nCCC\r\n",
		lf: "AAA\nBBB\nCCC\n"
	};
}

function getUTF8FileTestData() {
	return {
		cr: fs.readFileSync("data/utf8/cr.txt"),
		crlf: fs.readFileSync("data/utf8/crlf.txt"),
		lf: fs.readFileSync("data/utf8/lf.txt")
	};

}

function getUTF8BufferTestData() {
	return {
		cr: new Buffer("AAA\rBBB\rCCC\r"),
		crlf: new Buffer("AAA\r\nBBB\r\nCCC\r\n"),
		lf: new Buffer("AAA\nBBB\nCCC\n")
	};
}

function getShiftJISFileTestData() {
	return {
		cr: fs.readFileSync("data/shift_jis/cr.txt"),
		crlf: fs.readFileSync("data/shift_jis/crlf.txt"),
		lf: fs.readFileSync("data/shift_jis/lf.txt")
	};
}

function getShiftJISBufferTestData() {
	// each hiragana letter is repeated 3 times.
	var HIRAGANA_LETTER_A = [0x82, 0xa0, 0x82, 0xa0, 0x82, 0xa0];
	var HIRAGANA_LETTER_I = [0x82, 0xa2, 0x82, 0xa2, 0x82, 0xa2];
	var HIRAGANA_LETTER_U = [0x82, 0xa4, 0x82, 0xa4, 0x82, 0xa4];
	var CR = 0x0d;
	var LF = 0x0a;

	return {
		cr: new Buffer([].concat(HIRAGANA_LETTER_A, CR, HIRAGANA_LETTER_I, CR, HIRAGANA_LETTER_U, CR)),
		crlf: new Buffer([].concat(HIRAGANA_LETTER_A, CR, LF, HIRAGANA_LETTER_I, CR, LF, HIRAGANA_LETTER_U, CR, LF)),
		lf: new Buffer([].concat(HIRAGANA_LETTER_A, LF, HIRAGANA_LETTER_I, LF, HIRAGANA_LETTER_U, LF))
	};
}

//
// Tests
//
describe("crlf", function() {
	it("string", function() {
		var data = getStringTestData();
		var keys = Object.keys(data);
		keys.forEach(function(key1) {
			var converter = convertNewline(key1).string();
			var reference = data[key1];
			keys.forEach(function(key2) {
				assert.strictEqual(converter(data[key2]), reference, key2 + " were converted to " + key1);
			});
		});
	});

	it("buffer (simple)", function() {
		var data = getUTF8BufferTestData();
		var keys = Object.keys(data);
		keys.forEach(function(key1) {
			var converter = convertNewline(key1).buffer();
			var reference = data[key1];
			keys.forEach(function(key2) {
				assert.ok(reference.equals(converter(data[key2])), key2 + " were converted to " + key1);
			});
		});
	});

	describe("buffer (iconv)", function() {
		var data = getShiftJISBufferTestData();
		var keys = Object.keys(data);
		keys.forEach(function(key1) {
			var converter = convertNewline(key1, SHIFT_JIS).buffer();
			var reference = data[key1];
			keys.forEach(function(key2) {
				assert.ok(reference.equals(converter(data[key2])), key2 + " were converted to " + key1);
			});
		});
	});

	it("load test data (utf8)", function() {
		var filedata = getUTF8FileTestData();
		var bufferdata = getUTF8FileTestData();
		var keys = Object.keys(filedata);
		keys.forEach(function(key1) {
			var reference = bufferdata[key1];
			assert.ok(reference.equals(filedata[key1]), key1 + ".txt is loaded correctly");
			keys.forEach(function(key2) {
				if (key1 !== key2) {
					assert.ok(!reference.equals(filedata[key2]), key1 + ".txt is not same as " + key2 + ".txt");
				}
			});
		});
	});

	it("load test data (shift_jis)", function() {
		var filedata = getShiftJISFileTestData();
		var bufferdata = getShiftJISBufferTestData();
		var keys = Object.keys(filedata);
		keys.forEach(function(key1) {
			assert.ok(bufferdata[key1].equals(filedata[key1]), key1 + ".txt is loaded correctly");
			keys.forEach(function(key2) {
				if (key1 !== key2) {
					assert.ok(!filedata[key1].equals(filedata[key2]), key1 + ".txt is not same as " + key2 + ".txt");
				}
			});
		});
	});

	describe("stream (utf8)", function() {
		function testStream(key1, key2, reference, done) {
			var originalFilename = "data/utf8/" + key2 + ".txt";
			var targetFilename = originalFilename + "." + key1;
			var options = {
				encoding: UTF8
			};
			var reader = fs.createReadStream(originalFilename, options);
			var writer = fs.createWriteStream(targetFilename);
			var converter = convertNewline(key1).stream();
			writer.on("finish", function() {
				var target = fs.readFileSync(targetFilename);
				assert.ok(reference.equals(target), key2 + " were converted to " + key1);
				done();
			});
			reader
				.pipe(converter)
				.pipe(writer);
		}
		var references = getUTF8BufferTestData();
		var keys = Object.keys(references);
		keys.forEach(function (key1) {
			keys.forEach(function(key2) {
				it("Convert " + key2 + " to " + key1, function(done) {
					testStream(key1, key2, references[key1], done);
				});
			});
		});
	});

	describe("stream (shift_jis)", function() {
		function testStream(key1, key2, reference, done) {
			var originalFilename = "data/shift_jis/" + key2 + ".txt";
			var targetFilename = originalFilename + "." + key1;
			var reader = fs.createReadStream(originalFilename);
			var writer = fs.createWriteStream(targetFilename);
			var converter = convertNewline(key1).stream();
			writer.on("finish", function() {
				var target = fs.readFileSync(targetFilename);
				assert.ok(reference.equals(target), key2 + " were converted to " + key1);
				done();
			});
			reader
				.pipe(iconv.decodeStream(SHIFT_JIS))
				.pipe(converter)
				.pipe(iconv.encodeStream(SHIFT_JIS))
				.pipe(writer);
		}
		var references = getShiftJISBufferTestData();
		var keys = Object.keys(references);
		keys.forEach(function (key1) {
			keys.forEach(function(key2) {
				it("Convert " + key2 + " to " + key1, function (done) {
					testStream(key1, key2, references[key1], done);
				});
			});
		});
	});
});
