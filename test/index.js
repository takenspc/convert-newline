"use strict";
var assert = require("power-assert");
var fs = require("fs");
var path = require("path");
var stream = require("stream");
var util = require("util");
var bufferEquals = require("buffer-equals");
var iconv = require("iconv-lite");
var convertNewline = require("../");

//
// const.
//
var PACKAGE_NAME = "convert-newline";
var UTF8 = "utf8";
var SHIFT_JIS = "shift_jis";

//
// Test Data
//
function getStringTestData() {
	return {
		cr: "aaa\rbbb\rccc\r",
		crlf: "aaa\r\nbbb\r\nccc\r\n",
		lf: "aaa\nbbb\nccc\n"
	};
}

function getUTF8FileTestData() {
	return {
		cr: fs.readFileSync(path.join("data", UTF8, "cr.txt")),
		crlf: fs.readFileSync(path.join("data", UTF8, "crlf.txt")),
		lf: fs.readFileSync(path.join("data", UTF8, "lf.txt"))
	};

}

function getUTF8BufferTestData() {
	return {
		cr: new Buffer("aaa\rbbb\rccc\r"),
		crlf: new Buffer("aaa\r\nbbb\r\nccc\r\n"),
		lf: new Buffer("aaa\nbbb\nccc\n")
	};
}

function getShiftJISFileTestData() {
	return {
		cr: fs.readFileSync(path.join("data", SHIFT_JIS, "cr.txt")),
		crlf: fs.readFileSync(path.join("data", SHIFT_JIS, "crlf.txt")),
		lf: fs.readFileSync(path.join("data", SHIFT_JIS, "lf.txt"))
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
describe(PACKAGE_NAME, function() {
	it("should throw for invalid option", function() {
		assert.throws(function() {
			convertNewline("\n");
		}, /Unsupported `newline`/);
	});

	it("should use \"lf\" as default option", function() {
		var testData = getStringTestData();
		var converter = convertNewline().string();
		var newlinews = Object.keys(testData);
		newlinews.forEach(function(fromNewline) {
			assert.strictEqual(converter(testData[fromNewline]), testData.lf);
		});
	});

	describe("in string mode", function() {
		var testData = getStringTestData();
		var newlinews = Object.keys(testData);
		newlinews.forEach(function(toNewline) {
			newlinews.forEach(function(fromNewline) {
				it(util.format("should convert from %s to %s", fromNewline, toNewline), function() {
					var converter = convertNewline(toNewline).string();
					var expected = testData[toNewline];
					assert.strictEqual(converter(testData[fromNewline]), expected);
				});
			});
		});
	});

	describe("in buffer mode (simple)", function() {
		var testData = getUTF8BufferTestData();
		var newlines = Object.keys(testData);
		newlines.forEach(function(toNewline) {
			newlines.forEach(function(fromNewline) {
				it(util.format("should convert from %s to %s", fromNewline, toNewline), function() {
					var converter = convertNewline(toNewline).buffer();
					var expected = testData[toNewline];
					assert.ok(bufferEquals(converter(testData[fromNewline]), expected));
				});
			});
		});
	});

	describe("in buffer mode (iconv)", function() {
		var testData = getShiftJISBufferTestData();
		var newlines = Object.keys(testData);
		newlines.forEach(function(toNewline) {
			newlines.forEach(function(fromNewline) {
				it(util.format("should convert from %s to %s", fromNewline, toNewline), function() {
					var converter = convertNewline(toNewline, SHIFT_JIS).buffer();
					var expected = testData[toNewline];
					assert.ok(bufferEquals(converter(testData[fromNewline]), expected));
				});
			});
		});
	});

	describe("test code (utf8)", function() {
		var testData = getUTF8FileTestData();
		var expectedData = getUTF8BufferTestData();
		var newlines = Object.keys(testData);
		newlines.forEach(function(newline1) {
			it("should load test data correctly", function() {
				newlines.forEach(function (newline2) {
					var actual = testData[newline2];
					var expected = expectedData[newline1];
					if (newline1 === newline2) {
						assert.ok(bufferEquals(actual, expected), util.format("%s test data is loaded correctly", newline1));
					} else {
						assert.ok(!bufferEquals(actual, expected), util.format("%s test data is not same as %s correctly", newline1, newline2));
					}
				});
			});
		});
	});

	describe("test code (utf8)", function() {
		var testData = getShiftJISFileTestData();
		var expectedData = getShiftJISBufferTestData();
		var newlines = Object.keys(testData);
		newlines.forEach(function(newline1) {
			it("should load test data correctly", function() {
				newlines.forEach(function (newline2) {
					var actual = testData[newline2];
					var expected = expectedData[newline1];
					if (newline1 === newline2) {
						assert.ok(bufferEquals(actual, expected), util.format("%s test data is loaded correctly", newline1));
					} else {
						assert.ok(!bufferEquals(actual, expected), util.format("%s test data is not same as %s correctly", newline1, newline2));
					}
				});
			});
		});
	});

	describe("in stream mode (simple)", function() {
		function testStream(toNewline, fromNewline, expected, done) {
			var fromFilename = path.join("data", UTF8, fromNewline + ".txt");
			var targetFilename = fromFilename + "." + toNewline;
			var options = {
				encoding: UTF8
			};

			var reader = fs.createReadStream(fromFilename, options);
			var writer = fs.createWriteStream(targetFilename);
			var converter = convertNewline(toNewline).stream();

			writer.on("finish", function() {
				var actual = fs.readFileSync(targetFilename);
				assert.ok(bufferEquals(actual, expected));
				done();
			});

			reader
				.pipe(converter)
				.pipe(writer);
		}

		var testData = getUTF8BufferTestData();
		var newlines = Object.keys(testData);
		newlines.forEach(function (toNewline) {
			newlines.forEach(function(fromNewline) {
				it(util.format("should convert from %s to %s", fromNewline, toNewline), function(done) {
					testStream(toNewline, fromNewline, testData[toNewline], done);
				});
			});
		});

		it("should throw an error for non string stream", function(done) {
			var newline = "lf";
			var fromFilename = path.join("data", UTF8, newline + ".txt");
			var reader = fs.createReadStream(fromFilename);
			var converter = convertNewline(newline).stream();

			converter.on("error", function (err) {
				assert.ok(err instanceof Error);
				assert.strictEqual(err.message, util.format("%s needs string as its input.", PACKAGE_NAME));
				done();
			});
			reader
				.pipe(converter);
		});

		it("should treat a sequence of \\r and \\n as a newline", function(done) {
			var newline = "lf";
			var converter = convertNewline(newline).stream();
			var actual = [];
			converter.on("data", function (chunk) {
				actual.push(chunk);
			});
			converter.on("end", function () {
				assert.deepEqual(actual, ["aaa", "\n\nbbb", "\nccc", "\n"]);
				done();
			});

			var reader = new stream.Readable({
				encoding: UTF8
			});
			["aaa\r", "\rbbb\r", "\nccc\r"].forEach(function(item) {
				reader.push(item, UTF8);
			});
			reader.push(null);
			reader
				.pipe(converter);
		});

	});

	describe("in stream mode (iconv)", function() {
		function testStream(toNewline, fromNewline, expected, done) {
			var fromFilename = path.join("data", SHIFT_JIS, fromNewline + ".txt");
			var targetFilename = fromFilename + "." + toNewline;

			var reader = fs.createReadStream(fromFilename);
			var writer = fs.createWriteStream(targetFilename);
			var converter = convertNewline(toNewline).stream();

			writer.on("finish", function() {
				var actual = fs.readFileSync(targetFilename);
				assert.ok(bufferEquals(actual, expected));
				done();
			});

			reader
				.pipe(iconv.decodeStream(SHIFT_JIS))
				.pipe(converter)
				.pipe(iconv.encodeStream(SHIFT_JIS))
				.pipe(writer);
		}

		var testData = getShiftJISBufferTestData();
		var newlines = Object.keys(testData);
		newlines.forEach(function (toNewline) {
			newlines.forEach(function(fromNewline) {
				it(util.format("should convert from %s to %s", fromNewline, toNewline), function(done) {
					testStream(toNewline, fromNewline, testData[toNewline], done);
				});
			});
		});
	});
});
