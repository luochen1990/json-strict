(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.__lazy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

},{"base64-js":3,"ieee754":4,"is-array":5}],3:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],6:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}],7:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))

},{"_process":8}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],9:[function(require,module,exports){
var indexOf = require('indexof');

var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var defineProp = (function() {
    try {
        Object.defineProperty({}, '_', {});
        return function(obj, name, value) {
            Object.defineProperty(obj, name, {
                writable: true,
                enumerable: false,
                configurable: true,
                value: value
            })
        };
    } catch(e) {
        return function(obj, name, value) {
            obj[name] = value;
        };
    }
}());

var globals = ['Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function',
'Infinity', 'JSON', 'Math', 'NaN', 'Number', 'Object', 'RangeError',
'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError',
'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape'];

function Context() {}
Context.prototype = {};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInContext = function (context) {
    if (!(context instanceof Context)) {
        throw new TypeError("needs a 'context' argument.");
    }
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    var wEval = win.eval, wExecScript = win.execScript;

    if (!wEval && wExecScript) {
        // win.eval() magically appears when this is called in IE:
        wExecScript.call(win, 'null');
        wEval = win.eval;
    }
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
    forEach(globals, function (key) {
        if (context[key]) {
            win[key] = context[key];
        }
    });
    
    var winKeys = Object_keys(win);

    var res = wEval.call(win, this.code);
    
    forEach(Object_keys(win), function (key) {
        // Avoid copying circular objects like `top` and `window` by only
        // updating existing context properties or new properties in the `win`
        // that was only introduced after the eval.
        if (key in context || indexOf(winKeys, key) === -1) {
            context[key] = win[key];
        }
    });

    forEach(globals, function (key) {
        if (!(key in context)) {
            defineProp(context, key, win[key]);
        }
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInNewContext = function (context) {
    var ctx = Script.createContext(context);
    var res = this.runInContext(ctx);

    forEach(Object_keys(ctx), function (key) {
        context[key] = ctx[key];
    });

    return res;
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    var copy = new Context();
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};

},{"indexof":10}],10:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],11:[function(require,module,exports){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function(arg) {
    var abs, accept_multi_or_array, best, ceil, combine, curry2, curry3, equal, flip, floor, foldl, greaterEqual, greaterThan, lessEqual, lessThan, minus, notEqual, pack, pluck, plus, precise, seek, sum, uncurry2, uncurry3, unpack;
    best = arg.best, foldl = arg.foldl;
    flip = function(f) {
      return function(x) {
        return function(y) {
          return f(y)(x);
        };
      };
    };
    combine = function(f) {
      return function(g) {
        return function(x) {
          return f(g(x));
        };
      };
    };
    curry2 = function(f) {
      return function(a) {
        return function(b) {
          return f(a, b);
        };
      };
    };
    curry3 = function(f) {
      return function(a) {
        return function(b) {
          return function(c) {
            return f(a, b, c);
          };
        };
      };
    };
    uncurry2 = function(f) {
      return function(a, b) {
        return f(a)(b);
      };
    };
    uncurry3 = function(f) {
      return function(a, b, c) {
        return f(a)(b)(c);
      };
    };
    pack = function(f) {
      return function(arr) {
        return f.apply(null, arr);
      };
    };
    unpack = function(f) {
      return function() {
        var arr;
        arr = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return f(arr);
      };
    };
    seek = function(arr) {
      return function(i) {
        return arr[i];
      };
    };
    pluck = function(attr) {
      return function(d) {
        return d[attr];
      };
    };
    equal = function(it) {
      return function(x) {
        return x === it;
      };
    };
    notEqual = function(it) {
      return function(x) {
        return x !== it;
      };
    };
    lessThan = function(it) {
      return function(x) {
        return x < it;
      };
    };
    greaterThan = function(it) {
      return function(x) {
        return x > it;
      };
    };
    lessEqual = function(it) {
      return function(x) {
        return x <= it;
      };
    };
    greaterEqual = function(it) {
      return function(x) {
        return x >= it;
      };
    };
    plus = function(it) {
      return function(x) {
        return x + it;
      };
    };
    minus = function(it) {
      return function(x) {
        return x - it;
      };
    };
    abs = Math.abs;
    floor = Math.floor;
    ceil = Math.ceil;
    precise = function(n) {
      return function(x) {
        return parseFloat(x.toPrecision(n));
      };
    };
    accept_multi_or_array = function(f) {
      return function() {
        var arr;
        arr = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return f(arr.length === 1 && arr.first instanceof Array ? arr.first : arr);
      };
    };
    sum = foldl((function(a, b) {
      return a + b;
    }), 0);
    return {
      flip: flip,
      combine: combine,
      curry2: curry2,
      curry3: curry3,
      uncurry2: uncurry2,
      uncurry3: uncurry3,
      pack: pack,
      unpack: unpack,
      seek: seek,
      pluck: pluck,
      equal: equal,
      notEqual: notEqual,
      lessThan: lessThan,
      lessEqual: lessEqual,
      greaterThan: greaterThan,
      greaterEqual: greaterEqual,
      plus: plus,
      minus: minus,
      abs: abs,
      floor: floor,
      ceil: ceil,
      precise: precise,
      sum: sum
    };
  };

  module.exports = this_module({
    best: require('lazy-list').best,
    foldl: require('lazy-list').foldl
  });

}).call(this);


},{"lazy-list":19}],12:[function(require,module,exports){
(function() {
  var basics, convertors, funny, lazy, url_helpers, utils;

  utils = require('./utils');

  basics = require('./basics');

  lazy = require('lazy-list');

  funny = require('./funny');

  convertors = require('./convertors');

  url_helpers = require('./url-helpers');

  module.exports = utils.extend({})(utils, basics, lazy, funny, convertors, url_helpers);

}).call(this);


},{"./basics":11,"./convertors":13,"./funny":14,"./url-helpers":16,"./utils":17,"lazy-list":19}],13:[function(require,module,exports){
(function() {
  var this_module;

  this_module = function() {
    var bool, chr, float, hex, int, json, obj, ord, str;
    int = function(s, base) {
      var r;
      if (typeof s === 'string') {
        r = parseInt(s, base);
        if (!((s.slice != null) && r === parseInt(s.slice(0, -1), base))) {
          return r;
        } else {
          return null;
        }
      } else {
        return parseInt(0 + s);
      }
    };
    float = function(s) {
      if (/^-?[0-9]*(\.[0-9]+)?([eE]-?[0-9]+)?$/.test(s)) {
        return parseFloat(s);
      } else {
        return null;
      }
    };
    str = function(x, base) {
      return x.toString(base);
    };
    bool = function(x) {
      if (x === true || x === false) {
        return x;
      } else {
        return null;
      }
    };
    hex = function(x) {
      return x.toString(16);
    };
    ord = function(c) {
      return c.charCodeAt();
    };
    chr = function(x) {
      return String.fromCharCode(x);
    };
    json = function(it, indent) {
      return JSON.stringify(it, null, indent);
    };
    obj = function(s) {
      return JSON.parse(s);
    };
    return {
      int: int,
      float: float,
      bool: bool,
      str: str,
      hex: hex,
      ord: ord,
      chr: chr,
      json: json,
      obj: obj
    };
  };

  module.exports = this_module();

}).call(this);


},{}],14:[function(require,module,exports){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function() {
    var Y, church, fix, memoFix, memoize;
    church = function(n) {
      var iter;
      iter = function(f, n, r) {
        if (n === 0) {
          return r;
        } else {
          return iter(f, n - 1, f(r));
        }
      };
      return function(f) {
        return function(x) {
          return iter(f, n + 0, x);
        };
      };
    };
    Y = function(f) {
      return (function(x) {
        return x(x);
      })((function(x) {
        return f((function(y) {
          return (x(x))(y);
        }));
      }));
    };
    memoize = function(f, get_key) {
      var cache;
      if (get_key == null) {
        get_key = (function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return json(args);
        });
      }
      cache = {};
      return function() {
        var args, cached, key, r;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        key = get_key.apply(null, args);
        cached = cache[key];
        if (cached != null) {
          return cached;
        } else {
          r = f.apply(null, args);
          cache[key] = r;
          return r;
        }
      };
    };
    fix = Y;
    memoFix = function(ff) {
      var f;
      f = memoize(ff((function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return f.apply(null, args);
      })));
      return f;
    };
    return {
      church: church,
      Y: Y,
      memoize: memoize,
      fix: fix,
      memoFix: memoFix
    };
  };

  module.exports = this_module();

}).call(this);


},{}],15:[function(require,module,exports){
(function (global){
(function() {
  var k, mate, v;

  mate = require('./coffee-mate');

  for (k in mate) {
    v = mate[k];
    global[k] = v;
  }

}).call(this);


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./coffee-mate":12}],16:[function(require,module,exports){
(function() {
  var this_module;

  this_module = function() {
    var uri_decoder, uri_encoder;
    uri_encoder = function(component_packer) {
      if (component_packer == null) {
        component_packer = str;
      }
      return function(obj) {
        var k, v;
        return ((function() {
          var results;
          results = [];
          for (k in obj) {
            v = obj[k];
            if (v !== void 0) {
              results.push((encodeURIComponent(k)) + "=" + (encodeURIComponent(component_packer(v))));
            }
          }
          return results;
        })()).join('&');
      };
    };
    uri_decoder = function(component_unpacker) {
      if (component_unpacker == null) {
        component_unpacker = (function(s) {
          return s;
        });
      }
      return function(str) {
        var d, i, j, k, len, ref, ref1, ref2, s, v;
        d = {};
        ref1 = (ref = str.match(/[^?=&]+=[^&]*/g)) != null ? ref : [];
        for (i = 0, len = ref1.length; i < len; i++) {
          s = ref1[i];
          ref2 = s.match(/([^=]+)=(.*)/), j = ref2.length - 2, k = ref2[j++], v = ref2[j++];
          d[decodeURIComponent(k)] = component_unpacker(decodeURIComponent(v));
        }
        return d;
      };
    };
    return {
      uri_encoder: uri_encoder,
      uri_decoder: uri_decoder
    };
  };

  module.exports = this_module();

}).call(this);


},{}],17:[function(require,module,exports){
(function (process){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function() {
    var assert, assertEq, assertEqOn, copy, deepcopy, dict, extend, function_literal, log, overload, ref, securely, time_now, update;
    function_literal = function(f) {
      var expr;
      expr = f.toString().replace(/^\s*function\s?\(\s?\)\s?{\s*return\s*([^]*?);?\s*}$/, '$1');
      if (expr.length <= 100) {
        expr = expr.replace(/[\r\n]{1,2}\s*/g, '');
      }
      return expr;
    };
    time_now = function() {
      return (new Date).getTime();
    };
    log = (function() {
      var dye, factory, got, histories, log_label;
      dye = (function() {
        var cavailable, palette;
        cavailable = (typeof window === "undefined" || window === null) && (typeof process !== "undefined" && process !== null) && !process.env.NODE_DISABLE_COLORS;
        palette = {
          bold: '\x1B[0;1m',
          red: '\x1B[0;31m',
          green: '\x1B[0;32m',
          yellow: '\x1B[0;33m',
          blue: '\x1B[0;34m',
          bold_grey: '\x1B[1;30m'
        };
        if (!cavailable) {
          return function(color) {
            return function(s) {
              return s;
            };
          };
        } else {
          return function(color) {
            return function(s) {
              return "" + palette[color] + s + '\x1B[0m';
            };
          };
        }
      })();
      log_label = (function() {
        var flag_palette, op_flag;
        flag_palette = {
          '#': 'bold_grey',
          'I': 'green',
          'E': 'red',
          'W': 'yellow'
        };
        op_flag = function(op) {
          if (op === 'log') {
            return '#';
          } else {
            return op[0].toUpperCase();
          }
        };
        return function(op) {
          var flag;
          flag = op_flag(op);
          return dye(flag_palette[flag])(flag);
        };
      })();
      histories = [];
      factory = function(op) {
        var prefix;
        prefix = "" + (dye('bold_grey')('#')) + (log_label(op));
        return function() {
          var args, ball, eval_result, expr, f, i, len, start_time, time_used;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          ball = [];
          for (i = 0, len = args.length; i < len; i++) {
            f = args[i];
            if (typeof f === 'function') {
              expr = function_literal(f);
              start_time = time_now();
              eval_result = f();
              time_used = time_now() - start_time;
              ball.push(prefix + " " + (dye('green')(expr)) + " " + (dye('bold_grey')('==>')), eval_result);
              if (time_used > 0) {
                ball.push(dye('yellow')("[" + time_used + "ms]"));
              }
            } else {
              ball.push("" + prefix, f);
            }
          }
          console[op].apply(console, ball);
          histories.push(ball);
          if (histories.length >= 10) {
            histories.shift();
          }
          return null;
        };
      };
      got = factory('log');
      got.histories = histories;
      got.info = factory('info');
      got.warn = factory('warn');
      got.error = got.err = factory('error');
      return got;
    })();
    assert = function(f, msg) {
      var e, r, ref;
      if (!(f instanceof Function)) {
        ref = [msg, f], f = ref[0], msg = ref[1];
      }
      try {
        r = f();
      } catch (_error) {
        e = _error;
        throw Error("Assertion " + (msg != null ? msg : function_literal(f)) + " Unknown:\n" + e);
      }
      if (!r) {
        throw Error("Assertion " + (msg != null ? msg : function_literal(f)) + " Failed!");
      }
    };
    assertEq = function(l, r) {
      var e, lv, rv;
      try {
        lv = l();
        rv = r();
      } catch (_error) {
        e = _error;
        throw Error("Equation Between " + (function_literal(l)) + " And " + (function_literal(r)) + " Unknown:\n" + e);
      }
      if (lv !== rv) {
        throw Error("Equation Failed:\n\t" + (function_literal(l)) + " IS " + lv + " BUT\n\t" + (function_literal(r)) + " IS " + rv + ".");
      }
    };
    assertEqOn = function(f) {
      return function(l, r) {
        var e, flv, frv, lv, rv;
        try {
          lv = l();
          rv = r();
          flv = f(lv);
          frv = f(rv);
        } catch (_error) {
          e = _error;
          throw Error("MAPPED Equation Between " + (function_literal(l)) + " And " + (function_literal(r)) + " Unknown:\n" + e);
        }
        if (flv !== frv) {
          throw Error("Equation Failed:\n\t" + (function_literal(l)) + " IS " + lv + " AND MAPPED TO " + flv + " BUT\n\t" + (function_literal(r)) + " IS " + rv + " AND MAPPED TO " + frv + ".");
        }
      };
    };
    securely = function(f) {
      return function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        args = deepcopy(args);
        return f.apply(null, args);
      };
    };
    dict = function(pairs) {
      var d, i, k, len, ref, v;
      d = {};
      for (i = 0, len = pairs.length; i < len; i++) {
        ref = pairs[i], k = ref[0], v = ref[1];
        d[k] = v;
      }
      return d;
    };
    ref = (function() {
      var cp;
      cp = function(root, dep) {
        var k, r, v;
        if (dep === 0 || (root == null) || typeof root !== 'object') {
          return root;
        }
        if (root instanceof Array) {
          r = (function() {
            var i, len, results;
            results = [];
            for (i = 0, len = root.length; i < len; i++) {
              v = root[i];
              results.push(cp(v, dep - 1));
            }
            return results;
          })();
        } else {
          r = {};
          for (k in root) {
            v = root[k];
            r[k] = cp(v, dep - 1);
          }
        }
        return r;
      };
      return {
        copy: function(obj, depth) {
          if (depth == null) {
            depth = 1;
          }
          return cp(obj, depth);
        },
        deepcopy: function(obj, depth) {
          if (depth == null) {
            depth = Infinity;
          }
          return cp(obj, depth);
        }
      };
    })(), copy = ref.copy, deepcopy = ref.deepcopy;
    extend = function(base) {
      return function() {
        var d, defaults, i, k, len, v;
        defaults = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        for (i = 0, len = defaults.length; i < len; i++) {
          d = defaults[i];
          if (d != null) {
            for (k in d) {
              v = d[k];
              if (base[k] == null) {
                base[k] = v;
              }
            }
          }
        }
        return base;
      };
    };
    update = function(base) {
      return function() {
        var d, i, k, len, updates, v;
        updates = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        for (i = 0, len = updates.length; i < len; i++) {
          d = updates[i];
          if (d != null) {
            for (k in d) {
              v = d[k];
              base[k] = v;
            }
          }
        }
        return base;
      };
    };
    overload = function(_d) {
      var d, fallback;
      d = copy(_d);
      fallback = d['_'];
      if (fallback != null) {
        return function() {
          var args, ref1;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return ((ref1 = d[args.length]) != null ? ref1 : fallback).apply(null, args);
        };
      } else {
        return function() {
          var args, f;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          f = d[args.length];
          if (f == null) {
            throw Error("This Function Can't Accept " + args.length + " Args");
          } else {
            return f.apply(null, args);
          }
        };
      }
    };
    return {
      log: log,
      assert: assert,
      assertEq: assertEq,
      assertEqOn: assertEqOn,
      dict: dict,
      copy: copy,
      deepcopy: deepcopy,
      securely: securely,
      extend: extend,
      update: update,
      overload: overload
    };
  };

  module.exports = this_module();

}).call(this);


}).call(this,require('_process'))

},{"_process":8}],18:[function(require,module,exports){
require('./build/nodejs/global.js');

},{"./build/nodejs/global.js":15}],19:[function(require,module,exports){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function(arg) {
    var Iterator, LazyList, Symbol, all, any, best, brk, cartProd, concat, cons, drop, dropWhile, enumerate, filter, foldl, foreach, fromList, groupOn, head, iterate, last, lazy, length, list, map, maximum, maximumOn, minimum, minimumOn, naturals, nil, partition, permutations, primes, randoms, range, ref, repeat, reverse, scanl, sort, sortOn, streak, streak2, take, takeWhile, zip, zipWith;
    Symbol = arg.Symbol;
    LazyList = function(f) {
      f[Symbol.iterator] = function() {
        return f();
      };
      f.toString = function() {
        return "LazyList";
      };
      return f;
    };
    nil = LazyList(function() {
      return nil;
    });
    nil.toString = function() {
      return 'nil';
    };
    Iterator = function(it) {
      it.next = function() {
        var r;
        r = it();
        return {
          value: r,
          done: r === nil
        };
      };
      it.toString = function() {
        return "Iterator";
      };
      return it;
    };
    naturals = LazyList(function() {
      var i;
      i = -1;
      return Iterator(function() {
        return ++i;
      });
    });
    range = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      if (args.length === 0) {
        return naturals;
      } else if (args.length === 1) {
        return LazyList(function() {
          var i, stop;
          stop = args[0];
          i = -1;
          return Iterator(function() {
            if (++i < stop) {
              return i;
            } else {
              return nil;
            }
          });
        });
      } else if (args.length === 2) {
        return LazyList(function() {
          var i, start, stop;
          start = args[0], stop = args[1];
          if (start < stop) {
            i = start - 1;
            return Iterator(function() {
              if (++i < stop) {
                return i;
              } else {
                return nil;
              }
            });
          } else {
            i = start + 1;
            return Iterator(function() {
              if (--i > stop) {
                return i;
              } else {
                return nil;
              }
            });
          }
        });
      } else {
        return LazyList(function() {
          var i, start, step, stop;
          start = args[0], stop = args[1], step = args[2];
          if (stop !== start && (stop - start) * step < 0) {
            throw 'ERR IN range(): YOU ARE CREATING AN UNLIMITTED RANGE';
          }
          i = start - step;
          if (start < stop) {
            return Iterator(function() {
              if ((i += step) < stop) {
                return i;
              } else {
                return nil;
              }
            });
          } else {
            return Iterator(function() {
              if ((i += step) > stop) {
                return i;
              } else {
                return nil;
              }
            });
          }
        });
      }
    };
    primes = LazyList(function() {
      return filter(function(x) {
        return all(function(p) {
          return x % p !== 0;
        })(takeWhile(function(p) {
          return p * p <= x;
        })(range(2, Infinity)));
      })(range(2, Infinity))();
    });
    lazy = function(xs) {
      var ref;
      if (typeof xs === 'function') {
        if (xs[Symbol.iterator] != null) {
          return xs;
        } else {
          return LazyList(xs);
        }
      } else if ((ref = xs.constructor) === Array || ref === String) {
        return LazyList(function() {
          var i;
          i = -1;
          return Iterator(function() {
            if ((++i) < xs.length) {
              return xs[i];
            } else {
              return nil;
            }
          });
        });
      } else if (xs[Symbol.iterator] != null) {
        return LazyList(function() {
          var it;
          it = xs[Symbol.iterator]();
          return Iterator(function() {
            var r;
            r = it.next();
            if (r.done) {
              return nil;
            } else {
              return r.value;
            }
          });
        });
      } else {
        throw Error('lazy(xs): xs is neither Array nor Iterable');
      }
    };
    enumerate = function(it) {
      if ((it[Symbol.iterator] != null) || it instanceof Array) {
        return zip(naturals, it);
      } else {
        return LazyList(function() {
          var i, keys;
          keys = Object.keys(it);
          i = -1;
          return Iterator(function() {
            var k;
            if (++i < keys.length) {
              return [(k = keys[i]), it[k]];
            } else {
              return nil;
            }
          });
        });
      }
    };
    repeat = function(x) {
      return LazyList(function() {
        return Iterator(function() {
          return x;
        });
      });
    };
    iterate = function(next, init) {
      return LazyList(function() {
        var st;
        st = init;
        return Iterator(function() {
          var r;
          r = st;
          st = next(st);
          return r;
        });
      });
    };
    randoms = (function() {
      var hash, normal, salt;
      salt = Math.PI / 3.0;
      hash = function(x) {
        x = Math.sin(x + salt) * 1e4;
        return x - Math.floor(x);
      };
      normal = function(seed) {
        return iterate(hash, hash(seed));
      };
      return function(opts) {
        var k, ref, ref1, rg, s, seed;
        if (opts == null) {
          return normal(0);
        } else if (typeof opts === 'number') {
          return normal(opts);
        } else {
          seed = (ref = opts.seed) != null ? ref : 0;
          rg = opts.range;
          if (rg != null) {
            if (typeof rg === 'number') {
              return map(function(x) {
                return Math.floor(x * rg);
              })(normal(seed));
            } else {
              ref1 = [rg[0], rg[1] - rg[0] + 1], s = ref1[0], k = ref1[1];
              return map(function(x) {
                return s + Math.floor(x * k);
              })(normal(seed));
            }
          } else {
            return normal(seed);
          }
        }
      };
    })();
    permutations = (function() {
      var next_permutation;
      next_permutation = function(x) {
        var l, m, r, ref, ref1;
        x = x.slice(0);
        l = x.length - 1;
        while (l >= 1 && x[l] <= x[l - 1]) {
          --l;
        }
        if (l !== 0) {
          m = x.length - 1;
          while (m > l - 1 && x[m] <= x[l - 1]) {
            --m;
          }
          ref = [x[l - 1], x[m]], x[m] = ref[0], x[l - 1] = ref[1];
        }
        r = x.length - 1;
        while (l < r) {
          ref1 = [x[r], x[l]], x[l] = ref1[0], x[r] = ref1[1];
          ++l;
          --r;
        }
        return x;
      };
      return function(xs) {
        var arr;
        arr = list(xs);
        if (arr.length === 0) {
          return nil;
        } else {
          return cons(arr.slice(0))(takeWhile(function(ls) {
            return json(ls) !== json(arr);
          })(drop(1)(iterate(next_permutation, arr))));
        }
      };
    })();
    take = function(n) {
      return function(xs) {
        return LazyList(function() {
          var c, iter;
          iter = lazy(xs)[Symbol.iterator]();
          c = -1;
          return Iterator(function() {
            if (++c < n) {
              return iter();
            } else {
              return nil;
            }
          });
        });
      };
    };
    takeWhile = function(ok) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var x;
            if ((x = iter()) !== nil && ok(x)) {
              return x;
            } else {
              return nil;
            }
          });
        });
      };
    };
    drop = function(n) {
      return function(xs) {
        return LazyList(function() {
          var finished, i, iter, j, ref;
          iter = lazy(xs)[Symbol.iterator]();
          finished = false;
          for (i = j = 0, ref = n; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
            finished || (finished = iter() === nil);
            if (finished) {
              break;
            }
          }
          if (finished) {
            return function() {
              return nil;
            };
          } else {
            return iter;
          }
        });
      };
    };
    dropWhile = function(ok) {
      return function(xs) {
        return LazyList(function() {
          var iter, x;
          iter = lazy(xs)[Symbol.iterator]();
          while (ok(x = iter()) && x !== nil) {
            null;
          }
          return Iterator(function() {
            var prevx, ref;
            ref = [x, iter()], prevx = ref[0], x = ref[1];
            return prevx;
          });
        });
      };
    };
    cons = function(x) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = null;
          return Iterator(function() {
            if (iter === null) {
              iter = lazy(xs)[Symbol.iterator]();
              return x;
            } else {
              return iter();
            }
          });
        });
      };
    };
    map = function(f) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var x;
            if ((x = iter()) !== nil) {
              return f(x);
            } else {
              return nil;
            }
          });
        });
      };
    };
    filter = function(ok) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var x;
            while ((x = iter()) !== nil && !ok(x)) {
              null;
            }
            return x;
          });
        });
      };
    };
    scanl = function(f, r) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var got, x;
            got = r;
            r = (x = iter()) !== nil ? f(r, x) : nil;
            return got;
          });
        });
      };
    };
    streak = function(n) {
      if (n < 1) {
        return nil;
      } else {
        return function(xs) {
          return drop(n - 1)(LazyList(function() {
            var buf, iter;
            iter = lazy(xs)[Symbol.iterator]();
            buf = [];
            return Iterator(function() {
              var x;
              if ((x = iter()) === nil) {
                return nil;
              }
              buf.push(x);
              if (buf.length > n) {
                buf.shift(1);
              }
              return buf.slice(0);
            });
          }));
        };
      }
    };
    streak2 = function(n) {
      return function(xs) {
        return streak(n)(concat([xs, take(n - 1)(xs)]));
      };
    };
    reverse = function(xs) {
      var ref;
      if ((ref = xs.constructor) === Array || ref === String) {
        return LazyList(function() {
          var i;
          i = xs.length;
          return Iterator(function() {
            if ((--i) >= 0) {
              return xs[i];
            } else {
              return nil;
            }
          });
        });
      } else {
        return list(lazy(xs)).reverse();
      }
    };
    sort = function(xs) {
      var arr;
      arr = list(lazy(xs));
      return arr.sort(function(a, b) {
        return (a > b) - (a < b);
      });
    };
    sortOn = function(f) {
      return function(xs) {
        var arr;
        arr = list(lazy(xs));
        return arr.sort(function(a, b) {
          var fa, fb;
          return ((fa = f(a)) > (fb = f(b))) - (fa < fb);
        });
      };
    };
    groupOn = function(f) {
      return function(xs) {
        var k, memo, v;
        memo = {};
        foreach(xs, function(x) {
          var y;
          y = f(x);
          if (memo[y] == null) {
            memo[y] = [];
          }
          return memo[y].push(x);
        });
        return (function() {
          var results;
          results = [];
          for (k in memo) {
            v = memo[k];
            results.push(v);
          }
          return results;
        })();
      };
    };
    partition = function(f) {
      return function(xs) {
        var memo;
        memo = [[], []];
        foreach(xs, function(x) {
          var y;
          y = !f(x) + 0;
          return memo[y].push(x);
        });
        return memo;
      };
    };
    concat = function(xss) {
      xss = filter(function(x) {
        var ref;
        return ((ref = x.constructor) !== Array && ref !== String) || x.length > 0;
      })(xss);
      return LazyList(function() {
        var iter, xs, xs_iter;
        xs_iter = lazy(xss)[Symbol.iterator]();
        xs = xs_iter();
        iter = lazy(xs)[Symbol.iterator]();
        return Iterator(function() {
          var x;
          if ((x = iter()) !== nil) {
            return x;
          } else if ((xs = xs_iter()) !== nil) {
            iter = lazy(xs)[Symbol.iterator]();
            return iter();
          } else {
            return nil;
          }
        });
      });
    };
    ref = (function() {
      var finished, zip, zipWith;
      finished = function(arr) {
        var j, len1, x;
        for (j = 0, len1 = arr.length; j < len1; j++) {
          x = arr[j];
          if (x === nil) {
            return true;
          }
        }
        return false;
      };
      zip = function() {
        var xss;
        xss = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return LazyList(function() {
          var iters, xs;
          iters = (function() {
            var j, len1, results;
            results = [];
            for (j = 0, len1 = xss.length; j < len1; j++) {
              xs = xss[j];
              results.push(lazy(xs)[Symbol.iterator]());
            }
            return results;
          })();
          return Iterator(function() {
            var iter, next;
            next = (function() {
              var j, len1, results;
              results = [];
              for (j = 0, len1 = iters.length; j < len1; j++) {
                iter = iters[j];
                results.push(iter());
              }
              return results;
            })();
            if (finished(next)) {
              return nil;
            } else {
              return next;
            }
          });
        });
      };
      zipWith = function(f) {
        return function() {
          var xss;
          xss = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return LazyList(function() {
            var iters, xs;
            iters = (function() {
              var j, len1, results;
              results = [];
              for (j = 0, len1 = xss.length; j < len1; j++) {
                xs = xss[j];
                results.push(lazy(xs)[Symbol.iterator]());
              }
              return results;
            })();
            return Iterator(function() {
              var iter, next;
              next = (function() {
                var j, len1, results;
                results = [];
                for (j = 0, len1 = iters.length; j < len1; j++) {
                  iter = iters[j];
                  results.push(iter());
                }
                return results;
              })();
              if (finished(next)) {
                return nil;
              } else {
                return f.apply(null, next);
              }
            });
          });
        };
      };
      return {
        zip: zip,
        zipWith: zipWith
      };
    })(), zip = ref.zip, zipWith = ref.zipWith;
    cartProd = (function() {
      var apply_vector, inc_vector;
      inc_vector = function(limits) {
        var len_minus_1;
        len_minus_1 = limits.length - 1;
        return function(vec) {
          var i;
          i = len_minus_1;
          while (!(++vec[i] < limits[i] || i <= 0)) {
            vec[i--] = 0;
          }
          return vec;
        };
      };
      apply_vector = function(space) {
        var len;
        len = space.length;
        return function(vec) {
          var i, j, ref1, results;
          results = [];
          for (i = j = 0, ref1 = len; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
            results.push(space[i][vec[i]]);
          }
          return results;
        };
      };
      return function() {
        var xss;
        xss = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return LazyList(function() {
          var get_value, i, inc, j, len, len1, limits, v, xs;
          xss = (function() {
            var j, len1, results;
            results = [];
            for (j = 0, len1 = xss.length; j < len1; j++) {
              xs = xss[j];
              results.push(list(xs));
            }
            return results;
          })();
          limits = (function() {
            var j, ref1, results;
            results = [];
            for (i = j = 0, ref1 = xss.length; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
              results.push(xss[i].length);
            }
            return results;
          })();
          for (j = 0, len1 = limits.length; j < len1; j++) {
            len = limits[j];
            if (len === 0) {
              return nil;
            }
          }
          inc = inc_vector(limits);
          get_value = apply_vector(xss);
          v = (function() {
            var o, ref1, results;
            results = [];
            for (i = o = 0, ref1 = xss.length; 0 <= ref1 ? o < ref1 : o > ref1; i = 0 <= ref1 ? ++o : --o) {
              results.push(0);
            }
            return results;
          })();
          return Iterator(function() {
            var r;
            if (v[0] < limits[0]) {
              r = get_value(v);
              inc(v);
              return r;
            } else {
              return nil;
            }
          });
        });
      };
    })();
    list = function(xs) {
      var it, n, results, results1, x;
      if (xs instanceof Array) {
        return xs;
      } else if (typeof xs === 'function') {
        it = xs[Symbol.iterator]();
        results = [];
        while ((x = it()) !== nil) {
          results.push(x);
        }
        return results;
      } else if (xs[Symbol.iterator] != null) {
        it = lazy(xs)[Symbol.iterator]();
        results1 = [];
        while ((x = it()) !== nil) {
          results1.push(x);
        }
        return results1;
      } else if (typeof xs === 'number') {
        n = xs;
        return function(xs) {
          return list(take(n)(xs));
        };
      } else {
        throw Error({
          message: 'list(xs): xs is neither Array nor Iterable',
          info: {
            "xs": xs,
            "xs.constructor": xs != null ? xs.constructor : void 0
          }
        });
      }
    };
    head = function(xs) {
      var iter, r, ref1;
      if ((ref1 = xs.constructor) === Array || ref1 === String) {
        if (xs.length > 0) {
          return xs[0];
        } else {
          throw "Error: head() used on empty list.";
        }
      } else {
        iter = lazy(xs)[Symbol.iterator]();
        if ((r = iter()) !== nil) {
          return r;
        } else {
          throw "Error: head() used on empty list.";
        }
      }
    };
    last = function(xs) {
      var iter, r, ref1, ref2, x;
      if ((ref1 = xs.constructor) === Array || ref1 === String) {
        return (ref2 = xs[xs.length - 1]) != null ? ref2 : nil;
      } else {
        iter = lazy(xs)[Symbol.iterator]();
        r = nil;
        while ((x = iter()) !== nil) {
          r = x;
        }
        return r;
      }
    };
    length = function(xs) {
      var iter, r, ref1, x;
      if ((ref1 = xs.constructor) === Array || ref1 === String) {
        return xs.length;
      } else {
        iter = lazy(xs)[Symbol.iterator]();
        r = 0;
        while ((x = iter()) !== nil) {
          ++r;
        }
        return r;
      }
    };
    foldl = function(f, init) {
      return function(xs) {
        var iter, r, x;
        r = init;
        iter = lazy(xs)[Symbol.iterator]();
        while ((x = iter()) !== nil) {
          r = f(r, x);
        }
        return r;
      };
    };
    best = function(better) {
      return function(xs) {
        var it, iter, r;
        iter = lazy(xs)[Symbol.iterator]();
        if ((r = iter()) === nil) {
          return null;
        }
        while ((it = iter()) !== nil) {
          r = better(it, r) ? it : r;
        }
        return r;
      };
    };
    maximumOn = function(f) {
      return best(function(a, b) {
        return f(a) > f(b);
      });
    };
    minimumOn = function(f) {
      return best(function(a, b) {
        return f(a) > f(b);
      });
    };
    maximum = best(function(x, y) {
      return x > y;
    });
    minimum = best(function(x, y) {
      return x < y;
    });
    all = function(f) {
      if (typeof f !== 'function') {
        f = (function(x) {
          return x === f;
        });
      }
      return function(xs) {
        var iter, x;
        iter = lazy(xs)[Symbol.iterator]();
        while ((x = iter()) !== nil) {
          if (!f(x)) {
            return false;
          }
        }
        return true;
      };
    };
    any = function(f) {
      var all_not;
      all_not = all(function(x) {
        return !f(x);
      });
      return function(xs) {
        return !(all_not(xs));
      };
    };
    fromList = function(pairs) {
      var r;
      r = {};
      foreach(pairs, function(arg1) {
        var k, v;
        k = arg1[0], v = arg1[1];
        return r[k] = v;
      });
      return r;
    };
    brk = function() {
      return brk;
    };
    brk.toString = function() {
      return 'foreach.break';
    };
    foreach = function(xs, callback, fruit) {
      var iter, x;
      iter = lazy(xs)[Symbol.iterator]();
      while ((x = iter()) !== nil) {
        if (callback(x, fruit) === brk) {
          break;
        }
      }
      return fruit;
    };
    Object.defineProperties(foreach, {
      "break": {
        writable: false,
        configurable: false,
        enumerable: false,
        value: brk
      }
    });
    return {
      nil: nil,
      LazyList: LazyList,
      Iterator: Iterator,
      Symbol: Symbol,
      naturals: naturals,
      range: range,
      primes: primes,
      lazy: lazy,
      enumerate: enumerate,
      repeat: repeat,
      iterate: iterate,
      randoms: randoms,
      permutations: permutations,
      cons: cons,
      map: map,
      filter: filter,
      take: take,
      takeWhile: takeWhile,
      drop: drop,
      dropWhile: dropWhile,
      scanl: scanl,
      streak: streak,
      streak2: streak2,
      reverse: reverse,
      sort: sort,
      sortOn: sortOn,
      groupOn: groupOn,
      partition: partition,
      concat: concat,
      zip: zip,
      zipWith: zipWith,
      cartProd: cartProd,
      list: list,
      head: head,
      last: last,
      length: length,
      foldl: foldl,
      best: best,
      maximum: maximum,
      minimum: minimum,
      maximumOn: maximumOn,
      minimumOn: minimumOn,
      all: all,
      any: any,
      fromList: fromList,
      foreach: foreach
    };
  };

  module.exports = this_module({
    Symbol: typeof Symbol !== "undefined" && Symbol !== null ? Symbol : {
      iterator: 'iter'
    }
  });

}).call(this);


},{}],20:[function(require,module,exports){
(function (process,global){
// Generated by CoffeeScript 1.10.0
(function() {
  var Lexer, SourceMap, base, compile, ext, formatSourcePosition, fs, getSourceMap, helpers, i, len, lexer, parser, path, ref, sourceMaps, vm, withPrettyErrors,
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs');

  vm = require('vm');

  path = require('path');

  Lexer = require('./lexer').Lexer;

  parser = require('./parser').parser;

  helpers = require('./helpers');

  SourceMap = require('./sourcemap');

  exports.VERSION = '1.10.0';

  exports.FILE_EXTENSIONS = ['.coffee', '.litcoffee', '.coffee.md'];

  exports.helpers = helpers;

  withPrettyErrors = function(fn) {
    return function(code, options) {
      var err, error;
      if (options == null) {
        options = {};
      }
      try {
        return fn.call(this, code, options);
      } catch (error) {
        err = error;
        if (typeof code !== 'string') {
          throw err;
        }
        throw helpers.updateSyntaxError(err, code, options.filename);
      }
    };
  };

  exports.compile = compile = withPrettyErrors(function(code, options) {
    var answer, currentColumn, currentLine, extend, fragment, fragments, header, i, js, len, map, merge, newLines, token, tokens;
    merge = helpers.merge, extend = helpers.extend;
    options = extend({}, options);
    if (options.sourceMap) {
      map = new SourceMap;
    }
    tokens = lexer.tokenize(code, options);
    options.referencedVars = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = tokens.length; i < len; i++) {
        token = tokens[i];
        if (token.variable) {
          results.push(token[1]);
        }
      }
      return results;
    })();
    fragments = parser.parse(tokens).compileToFragments(options);
    currentLine = 0;
    if (options.header) {
      currentLine += 1;
    }
    if (options.shiftLine) {
      currentLine += 1;
    }
    currentColumn = 0;
    js = "";
    for (i = 0, len = fragments.length; i < len; i++) {
      fragment = fragments[i];
      if (options.sourceMap) {
        if (fragment.locationData && !/^[;\s]*$/.test(fragment.code)) {
          map.add([fragment.locationData.first_line, fragment.locationData.first_column], [currentLine, currentColumn], {
            noReplace: true
          });
        }
        newLines = helpers.count(fragment.code, "\n");
        currentLine += newLines;
        if (newLines) {
          currentColumn = fragment.code.length - (fragment.code.lastIndexOf("\n") + 1);
        } else {
          currentColumn += fragment.code.length;
        }
      }
      js += fragment.code;
    }
    if (options.header) {
      header = "Generated by CoffeeScript " + this.VERSION;
      js = "// " + header + "\n" + js;
    }
    if (options.sourceMap) {
      answer = {
        js: js
      };
      answer.sourceMap = map;
      answer.v3SourceMap = map.generate(options, code);
      return answer;
    } else {
      return js;
    }
  });

  exports.tokens = withPrettyErrors(function(code, options) {
    return lexer.tokenize(code, options);
  });

  exports.nodes = withPrettyErrors(function(source, options) {
    if (typeof source === 'string') {
      return parser.parse(lexer.tokenize(source, options));
    } else {
      return parser.parse(source);
    }
  });

  exports.run = function(code, options) {
    var answer, dir, mainModule, ref;
    if (options == null) {
      options = {};
    }
    mainModule = require.main;
    mainModule.filename = process.argv[1] = options.filename ? fs.realpathSync(options.filename) : '.';
    mainModule.moduleCache && (mainModule.moduleCache = {});
    dir = options.filename ? path.dirname(fs.realpathSync(options.filename)) : fs.realpathSync('.');
    mainModule.paths = require('module')._nodeModulePaths(dir);
    if (!helpers.isCoffee(mainModule.filename) || require.extensions) {
      answer = compile(code, options);
      code = (ref = answer.js) != null ? ref : answer;
    }
    return mainModule._compile(code, mainModule.filename);
  };

  exports["eval"] = function(code, options) {
    var Module, _module, _require, createContext, i, isContext, js, k, len, o, r, ref, ref1, ref2, ref3, sandbox, v;
    if (options == null) {
      options = {};
    }
    if (!(code = code.trim())) {
      return;
    }
    createContext = (ref = vm.Script.createContext) != null ? ref : vm.createContext;
    isContext = (ref1 = vm.isContext) != null ? ref1 : function(ctx) {
      return options.sandbox instanceof createContext().constructor;
    };
    if (createContext) {
      if (options.sandbox != null) {
        if (isContext(options.sandbox)) {
          sandbox = options.sandbox;
        } else {
          sandbox = createContext();
          ref2 = options.sandbox;
          for (k in ref2) {
            if (!hasProp.call(ref2, k)) continue;
            v = ref2[k];
            sandbox[k] = v;
          }
        }
        sandbox.global = sandbox.root = sandbox.GLOBAL = sandbox;
      } else {
        sandbox = global;
      }
      sandbox.__filename = options.filename || 'eval';
      sandbox.__dirname = path.dirname(sandbox.__filename);
      if (!(sandbox !== global || sandbox.module || sandbox.require)) {
        Module = require('module');
        sandbox.module = _module = new Module(options.modulename || 'eval');
        sandbox.require = _require = function(path) {
          return Module._load(path, _module, true);
        };
        _module.filename = sandbox.__filename;
        ref3 = Object.getOwnPropertyNames(require);
        for (i = 0, len = ref3.length; i < len; i++) {
          r = ref3[i];
          if (r !== 'paths' && r !== 'arguments' && r !== 'caller') {
            _require[r] = require[r];
          }
        }
        _require.paths = _module.paths = Module._nodeModulePaths(process.cwd());
        _require.resolve = function(request) {
          return Module._resolveFilename(request, _module);
        };
      }
    }
    o = {};
    for (k in options) {
      if (!hasProp.call(options, k)) continue;
      v = options[k];
      o[k] = v;
    }
    o.bare = true;
    js = compile(code, o);
    if (sandbox === global) {
      return vm.runInThisContext(js);
    } else {
      return vm.runInContext(js, sandbox);
    }
  };

  exports.register = function() {
    return require('./register');
  };

  if (require.extensions) {
    ref = this.FILE_EXTENSIONS;
    for (i = 0, len = ref.length; i < len; i++) {
      ext = ref[i];
      if ((base = require.extensions)[ext] == null) {
        base[ext] = function() {
          throw new Error("Use CoffeeScript.register() or require the coffee-script/register module to require " + ext + " files.");
        };
      }
    }
  }

  exports._compileFile = function(filename, sourceMap) {
    var answer, err, error, raw, stripped;
    if (sourceMap == null) {
      sourceMap = false;
    }
    raw = fs.readFileSync(filename, 'utf8');
    stripped = raw.charCodeAt(0) === 0xFEFF ? raw.substring(1) : raw;
    try {
      answer = compile(stripped, {
        filename: filename,
        sourceMap: sourceMap,
        literate: helpers.isLiterate(filename)
      });
    } catch (error) {
      err = error;
      throw helpers.updateSyntaxError(err, stripped, filename);
    }
    return answer;
  };

  lexer = new Lexer;

  parser.lexer = {
    lex: function() {
      var tag, token;
      token = parser.tokens[this.pos++];
      if (token) {
        tag = token[0], this.yytext = token[1], this.yylloc = token[2];
        parser.errorToken = token.origin || token;
        this.yylineno = this.yylloc.first_line;
      } else {
        tag = '';
      }
      return tag;
    },
    setInput: function(tokens) {
      parser.tokens = tokens;
      return this.pos = 0;
    },
    upcomingInput: function() {
      return "";
    }
  };

  parser.yy = require('./nodes');

  parser.yy.parseError = function(message, arg) {
    var errorLoc, errorTag, errorText, errorToken, token, tokens;
    token = arg.token;
    errorToken = parser.errorToken, tokens = parser.tokens;
    errorTag = errorToken[0], errorText = errorToken[1], errorLoc = errorToken[2];
    errorText = (function() {
      switch (false) {
        case errorToken !== tokens[tokens.length - 1]:
          return 'end of input';
        case errorTag !== 'INDENT' && errorTag !== 'OUTDENT':
          return 'indentation';
        case errorTag !== 'IDENTIFIER' && errorTag !== 'NUMBER' && errorTag !== 'STRING' && errorTag !== 'STRING_START' && errorTag !== 'REGEX' && errorTag !== 'REGEX_START':
          return errorTag.replace(/_START$/, '').toLowerCase();
        default:
          return helpers.nameWhitespaceCharacter(errorText);
      }
    })();
    return helpers.throwSyntaxError("unexpected " + errorText, errorLoc);
  };

  formatSourcePosition = function(frame, getSourceMapping) {
    var as, column, fileLocation, fileName, functionName, isConstructor, isMethodCall, line, methodName, source, tp, typeName;
    fileName = void 0;
    fileLocation = '';
    if (frame.isNative()) {
      fileLocation = "native";
    } else {
      if (frame.isEval()) {
        fileName = frame.getScriptNameOrSourceURL();
        if (!fileName) {
          fileLocation = (frame.getEvalOrigin()) + ", ";
        }
      } else {
        fileName = frame.getFileName();
      }
      fileName || (fileName = "<anonymous>");
      line = frame.getLineNumber();
      column = frame.getColumnNumber();
      source = getSourceMapping(fileName, line, column);
      fileLocation = source ? fileName + ":" + source[0] + ":" + source[1] : fileName + ":" + line + ":" + column;
    }
    functionName = frame.getFunctionName();
    isConstructor = frame.isConstructor();
    isMethodCall = !(frame.isToplevel() || isConstructor);
    if (isMethodCall) {
      methodName = frame.getMethodName();
      typeName = frame.getTypeName();
      if (functionName) {
        tp = as = '';
        if (typeName && functionName.indexOf(typeName)) {
          tp = typeName + ".";
        }
        if (methodName && functionName.indexOf("." + methodName) !== functionName.length - methodName.length - 1) {
          as = " [as " + methodName + "]";
        }
        return "" + tp + functionName + as + " (" + fileLocation + ")";
      } else {
        return typeName + "." + (methodName || '<anonymous>') + " (" + fileLocation + ")";
      }
    } else if (isConstructor) {
      return "new " + (functionName || '<anonymous>') + " (" + fileLocation + ")";
    } else if (functionName) {
      return functionName + " (" + fileLocation + ")";
    } else {
      return fileLocation;
    }
  };

  sourceMaps = {};

  getSourceMap = function(filename) {
    var answer, ref1;
    if (sourceMaps[filename]) {
      return sourceMaps[filename];
    }
    if (ref1 = path != null ? path.extname(filename) : void 0, indexOf.call(exports.FILE_EXTENSIONS, ref1) < 0) {
      return;
    }
    answer = exports._compileFile(filename, true);
    return sourceMaps[filename] = answer.sourceMap;
  };

  Error.prepareStackTrace = function(err, stack) {
    var frame, frames, getSourceMapping;
    getSourceMapping = function(filename, line, column) {
      var answer, sourceMap;
      sourceMap = getSourceMap(filename);
      if (sourceMap) {
        answer = sourceMap.sourceLocation([line - 1, column - 1]);
      }
      if (answer) {
        return [answer[0] + 1, answer[1] + 1];
      } else {
        return null;
      }
    };
    frames = (function() {
      var j, len1, results;
      results = [];
      for (j = 0, len1 = stack.length; j < len1; j++) {
        frame = stack[j];
        if (frame.getFunction() === exports.run) {
          break;
        }
        results.push("  at " + (formatSourcePosition(frame, getSourceMapping)));
      }
      return results;
    })();
    return (err.toString()) + "\n" + (frames.join('\n')) + "\n";
  };

}).call(this);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./helpers":21,"./lexer":22,"./nodes":23,"./parser":24,"./register":25,"./sourcemap":28,"_process":8,"fs":1,"module":1,"path":7,"vm":9}],21:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.10.0
(function() {
  var buildLocationData, extend, flatten, ref, repeat, syntaxErrorToString;

  exports.starts = function(string, literal, start) {
    return literal === string.substr(start, literal.length);
  };

  exports.ends = function(string, literal, back) {
    var len;
    len = literal.length;
    return literal === string.substr(string.length - len - (back || 0), len);
  };

  exports.repeat = repeat = function(str, n) {
    var res;
    res = '';
    while (n > 0) {
      if (n & 1) {
        res += str;
      }
      n >>>= 1;
      str += str;
    }
    return res;
  };

  exports.compact = function(array) {
    var i, item, len1, results;
    results = [];
    for (i = 0, len1 = array.length; i < len1; i++) {
      item = array[i];
      if (item) {
        results.push(item);
      }
    }
    return results;
  };

  exports.count = function(string, substr) {
    var num, pos;
    num = pos = 0;
    if (!substr.length) {
      return 1 / 0;
    }
    while (pos = 1 + string.indexOf(substr, pos)) {
      num++;
    }
    return num;
  };

  exports.merge = function(options, overrides) {
    return extend(extend({}, options), overrides);
  };

  extend = exports.extend = function(object, properties) {
    var key, val;
    for (key in properties) {
      val = properties[key];
      object[key] = val;
    }
    return object;
  };

  exports.flatten = flatten = function(array) {
    var element, flattened, i, len1;
    flattened = [];
    for (i = 0, len1 = array.length; i < len1; i++) {
      element = array[i];
      if ('[object Array]' === Object.prototype.toString.call(element)) {
        flattened = flattened.concat(flatten(element));
      } else {
        flattened.push(element);
      }
    }
    return flattened;
  };

  exports.del = function(obj, key) {
    var val;
    val = obj[key];
    delete obj[key];
    return val;
  };

  exports.some = (ref = Array.prototype.some) != null ? ref : function(fn) {
    var e, i, len1;
    for (i = 0, len1 = this.length; i < len1; i++) {
      e = this[i];
      if (fn(e)) {
        return true;
      }
    }
    return false;
  };

  exports.invertLiterate = function(code) {
    var line, lines, maybe_code;
    maybe_code = true;
    lines = (function() {
      var i, len1, ref1, results;
      ref1 = code.split('\n');
      results = [];
      for (i = 0, len1 = ref1.length; i < len1; i++) {
        line = ref1[i];
        if (maybe_code && /^([ ]{4}|[ ]{0,3}\t)/.test(line)) {
          results.push(line);
        } else if (maybe_code = /^\s*$/.test(line)) {
          results.push(line);
        } else {
          results.push('# ' + line);
        }
      }
      return results;
    })();
    return lines.join('\n');
  };

  buildLocationData = function(first, last) {
    if (!last) {
      return first;
    } else {
      return {
        first_line: first.first_line,
        first_column: first.first_column,
        last_line: last.last_line,
        last_column: last.last_column
      };
    }
  };

  exports.addLocationDataFn = function(first, last) {
    return function(obj) {
      if (((typeof obj) === 'object') && (!!obj['updateLocationDataIfMissing'])) {
        obj.updateLocationDataIfMissing(buildLocationData(first, last));
      }
      return obj;
    };
  };

  exports.locationDataToString = function(obj) {
    var locationData;
    if (("2" in obj) && ("first_line" in obj[2])) {
      locationData = obj[2];
    } else if ("first_line" in obj) {
      locationData = obj;
    }
    if (locationData) {
      return ((locationData.first_line + 1) + ":" + (locationData.first_column + 1) + "-") + ((locationData.last_line + 1) + ":" + (locationData.last_column + 1));
    } else {
      return "No location data";
    }
  };

  exports.baseFileName = function(file, stripExt, useWinPathSep) {
    var parts, pathSep;
    if (stripExt == null) {
      stripExt = false;
    }
    if (useWinPathSep == null) {
      useWinPathSep = false;
    }
    pathSep = useWinPathSep ? /\\|\// : /\//;
    parts = file.split(pathSep);
    file = parts[parts.length - 1];
    if (!(stripExt && file.indexOf('.') >= 0)) {
      return file;
    }
    parts = file.split('.');
    parts.pop();
    if (parts[parts.length - 1] === 'coffee' && parts.length > 1) {
      parts.pop();
    }
    return parts.join('.');
  };

  exports.isCoffee = function(file) {
    return /\.((lit)?coffee|coffee\.md)$/.test(file);
  };

  exports.isLiterate = function(file) {
    return /\.(litcoffee|coffee\.md)$/.test(file);
  };

  exports.throwSyntaxError = function(message, location) {
    var error;
    error = new SyntaxError(message);
    error.location = location;
    error.toString = syntaxErrorToString;
    error.stack = error.toString();
    throw error;
  };

  exports.updateSyntaxError = function(error, code, filename) {
    if (error.toString === syntaxErrorToString) {
      error.code || (error.code = code);
      error.filename || (error.filename = filename);
      error.stack = error.toString();
    }
    return error;
  };

  syntaxErrorToString = function() {
    var codeLine, colorize, colorsEnabled, end, filename, first_column, first_line, last_column, last_line, marker, ref1, ref2, ref3, ref4, start;
    if (!(this.code && this.location)) {
      return Error.prototype.toString.call(this);
    }
    ref1 = this.location, first_line = ref1.first_line, first_column = ref1.first_column, last_line = ref1.last_line, last_column = ref1.last_column;
    if (last_line == null) {
      last_line = first_line;
    }
    if (last_column == null) {
      last_column = first_column;
    }
    filename = this.filename || '[stdin]';
    codeLine = this.code.split('\n')[first_line];
    start = first_column;
    end = first_line === last_line ? last_column + 1 : codeLine.length;
    marker = codeLine.slice(0, start).replace(/[^\s]/g, ' ') + repeat('^', end - start);
    if (typeof process !== "undefined" && process !== null) {
      colorsEnabled = ((ref2 = process.stdout) != null ? ref2.isTTY : void 0) && !((ref3 = process.env) != null ? ref3.NODE_DISABLE_COLORS : void 0);
    }
    if ((ref4 = this.colorful) != null ? ref4 : colorsEnabled) {
      colorize = function(str) {
        return "\x1B[1;31m" + str + "\x1B[0m";
      };
      codeLine = codeLine.slice(0, start) + colorize(codeLine.slice(start, end)) + codeLine.slice(end);
      marker = colorize(marker);
    }
    return filename + ":" + (first_line + 1) + ":" + (first_column + 1) + ": error: " + this.message + "\n" + codeLine + "\n" + marker;
  };

  exports.nameWhitespaceCharacter = function(string) {
    switch (string) {
      case ' ':
        return 'space';
      case '\n':
        return 'newline';
      case '\r':
        return 'carriage return';
      case '\t':
        return 'tab';
      default:
        return string;
    }
  };

}).call(this);

}).call(this,require('_process'))

},{"_process":8}],22:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var BOM, BOOL, CALLABLE, CODE, COFFEE_ALIASES, COFFEE_ALIAS_MAP, COFFEE_KEYWORDS, COMMENT, COMPARE, COMPOUND_ASSIGN, HERECOMMENT_ILLEGAL, HEREDOC_DOUBLE, HEREDOC_INDENT, HEREDOC_SINGLE, HEREGEX, HEREGEX_OMIT, IDENTIFIER, INDENTABLE_CLOSERS, INDEXABLE, INVALID_ESCAPE, INVERSES, JSTOKEN, JS_FORBIDDEN, JS_KEYWORDS, LEADING_BLANK_LINE, LINE_BREAK, LINE_CONTINUER, LOGIC, Lexer, MATH, MULTI_DENT, NOT_REGEX, NUMBER, OPERATOR, POSSIBLY_DIVISION, REGEX, REGEX_FLAGS, REGEX_ILLEGAL, RELATION, RESERVED, Rewriter, SHIFT, SIMPLE_STRING_OMIT, STRICT_PROSCRIBED, STRING_DOUBLE, STRING_OMIT, STRING_SINGLE, STRING_START, TRAILING_BLANK_LINE, TRAILING_SPACES, UNARY, UNARY_MATH, VALID_FLAGS, WHITESPACE, compact, count, invertLiterate, key, locationDataToString, ref, ref1, repeat, starts, throwSyntaxError,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  ref = require('./rewriter'), Rewriter = ref.Rewriter, INVERSES = ref.INVERSES;

  ref1 = require('./helpers'), count = ref1.count, starts = ref1.starts, compact = ref1.compact, repeat = ref1.repeat, invertLiterate = ref1.invertLiterate, locationDataToString = ref1.locationDataToString, throwSyntaxError = ref1.throwSyntaxError;

  exports.Lexer = Lexer = (function() {
    function Lexer() {}

    Lexer.prototype.tokenize = function(code, opts) {
      var consumed, end, i, ref2;
      if (opts == null) {
        opts = {};
      }
      this.literate = opts.literate;
      this.indent = 0;
      this.baseIndent = 0;
      this.indebt = 0;
      this.outdebt = 0;
      this.indents = [];
      this.ends = [];
      this.tokens = [];
      this.seenFor = false;
      this.chunkLine = opts.line || 0;
      this.chunkColumn = opts.column || 0;
      code = this.clean(code);
      i = 0;
      while (this.chunk = code.slice(i)) {
        consumed = this.identifierToken() || this.commentToken() || this.whitespaceToken() || this.lineToken() || this.stringToken() || this.numberToken() || this.regexToken() || this.jsToken() || this.literalToken();
        ref2 = this.getLineAndColumnFromChunk(consumed), this.chunkLine = ref2[0], this.chunkColumn = ref2[1];
        i += consumed;
        if (opts.untilBalanced && this.ends.length === 0) {
          return {
            tokens: this.tokens,
            index: i
          };
        }
      }
      this.closeIndentation();
      if (end = this.ends.pop()) {
        this.error("missing " + end.tag, end.origin[2]);
      }
      if (opts.rewrite === false) {
        return this.tokens;
      }
      return (new Rewriter).rewrite(this.tokens);
    };

    Lexer.prototype.clean = function(code) {
      if (code.charCodeAt(0) === BOM) {
        code = code.slice(1);
      }
      code = code.replace(/\r/g, '').replace(TRAILING_SPACES, '');
      if (WHITESPACE.test(code)) {
        code = "\n" + code;
        this.chunkLine--;
      }
      if (this.literate) {
        code = invertLiterate(code);
      }
      return code;
    };

    Lexer.prototype.identifierToken = function() {
      var alias, colon, colonOffset, forcedIdentifier, id, idLength, input, match, poppedToken, prev, ref2, ref3, ref4, ref5, tag, tagToken;
      if (!(match = IDENTIFIER.exec(this.chunk))) {
        return 0;
      }
      input = match[0], id = match[1], colon = match[2];
      idLength = id.length;
      poppedToken = void 0;
      if (id === 'own' && this.tag() === 'FOR') {
        this.token('OWN', id);
        return id.length;
      }
      if (id === 'from' && this.tag() === 'YIELD') {
        this.token('FROM', id);
        return id.length;
      }
      ref2 = this.tokens, prev = ref2[ref2.length - 1];
      forcedIdentifier = colon || (prev != null) && (((ref3 = prev[0]) === '.' || ref3 === '?.' || ref3 === '::' || ref3 === '?::') || !prev.spaced && prev[0] === '@');
      tag = 'IDENTIFIER';
      if (!forcedIdentifier && (indexOf.call(JS_KEYWORDS, id) >= 0 || indexOf.call(COFFEE_KEYWORDS, id) >= 0)) {
        tag = id.toUpperCase();
        if (tag === 'WHEN' && (ref4 = this.tag(), indexOf.call(LINE_BREAK, ref4) >= 0)) {
          tag = 'LEADING_WHEN';
        } else if (tag === 'FOR') {
          this.seenFor = true;
        } else if (tag === 'UNLESS') {
          tag = 'IF';
        } else if (indexOf.call(UNARY, tag) >= 0) {
          tag = 'UNARY';
        } else if (indexOf.call(RELATION, tag) >= 0) {
          if (tag !== 'INSTANCEOF' && this.seenFor) {
            tag = 'FOR' + tag;
            this.seenFor = false;
          } else {
            tag = 'RELATION';
            if (this.value() === '!') {
              poppedToken = this.tokens.pop();
              id = '!' + id;
            }
          }
        }
      }
      if (indexOf.call(JS_FORBIDDEN, id) >= 0) {
        if (forcedIdentifier) {
          tag = 'IDENTIFIER';
          id = new String(id);
          id.reserved = true;
        } else if (indexOf.call(RESERVED, id) >= 0) {
          this.error("reserved word '" + id + "'", {
            length: id.length
          });
        }
      }
      if (!forcedIdentifier) {
        if (indexOf.call(COFFEE_ALIASES, id) >= 0) {
          alias = id;
          id = COFFEE_ALIAS_MAP[id];
        }
        tag = (function() {
          switch (id) {
            case '!':
              return 'UNARY';
            case '==':
            case '!=':
              return 'COMPARE';
            case '&&':
            case '||':
              return 'LOGIC';
            case 'true':
            case 'false':
              return 'BOOL';
            case 'break':
            case 'continue':
              return 'STATEMENT';
            default:
              return tag;
          }
        })();
      }
      tagToken = this.token(tag, id, 0, idLength);
      if (alias) {
        tagToken.origin = [tag, alias, tagToken[2]];
      }
      tagToken.variable = !forcedIdentifier;
      if (poppedToken) {
        ref5 = [poppedToken[2].first_line, poppedToken[2].first_column], tagToken[2].first_line = ref5[0], tagToken[2].first_column = ref5[1];
      }
      if (colon) {
        colonOffset = input.lastIndexOf(':');
        this.token(':', ':', colonOffset, colon.length);
      }
      return input.length;
    };

    Lexer.prototype.numberToken = function() {
      var binaryLiteral, lexedLength, match, number, octalLiteral;
      if (!(match = NUMBER.exec(this.chunk))) {
        return 0;
      }
      number = match[0];
      lexedLength = number.length;
      if (/^0[BOX]/.test(number)) {
        this.error("radix prefix in '" + number + "' must be lowercase", {
          offset: 1
        });
      } else if (/E/.test(number) && !/^0x/.test(number)) {
        this.error("exponential notation in '" + number + "' must be indicated with a lowercase 'e'", {
          offset: number.indexOf('E')
        });
      } else if (/^0\d*[89]/.test(number)) {
        this.error("decimal literal '" + number + "' must not be prefixed with '0'", {
          length: lexedLength
        });
      } else if (/^0\d+/.test(number)) {
        this.error("octal literal '" + number + "' must be prefixed with '0o'", {
          length: lexedLength
        });
      }
      if (octalLiteral = /^0o([0-7]+)/.exec(number)) {
        number = '0x' + parseInt(octalLiteral[1], 8).toString(16);
      }
      if (binaryLiteral = /^0b([01]+)/.exec(number)) {
        number = '0x' + parseInt(binaryLiteral[1], 2).toString(16);
      }
      this.token('NUMBER', number, 0, lexedLength);
      return lexedLength;
    };

    Lexer.prototype.stringToken = function() {
      var $, attempt, delimiter, doc, end, heredoc, i, indent, indentRegex, match, quote, ref2, ref3, regex, token, tokens;
      quote = (STRING_START.exec(this.chunk) || [])[0];
      if (!quote) {
        return 0;
      }
      regex = (function() {
        switch (quote) {
          case "'":
            return STRING_SINGLE;
          case '"':
            return STRING_DOUBLE;
          case "'''":
            return HEREDOC_SINGLE;
          case '"""':
            return HEREDOC_DOUBLE;
        }
      })();
      heredoc = quote.length === 3;
      ref2 = this.matchWithInterpolations(regex, quote), tokens = ref2.tokens, end = ref2.index;
      $ = tokens.length - 1;
      delimiter = quote.charAt(0);
      if (heredoc) {
        indent = null;
        doc = ((function() {
          var j, len, results;
          results = [];
          for (i = j = 0, len = tokens.length; j < len; i = ++j) {
            token = tokens[i];
            if (token[0] === 'NEOSTRING') {
              results.push(token[1]);
            }
          }
          return results;
        })()).join('#{}');
        while (match = HEREDOC_INDENT.exec(doc)) {
          attempt = match[1];
          if (indent === null || (0 < (ref3 = attempt.length) && ref3 < indent.length)) {
            indent = attempt;
          }
        }
        if (indent) {
          indentRegex = RegExp("^" + indent, "gm");
        }
        this.mergeInterpolationTokens(tokens, {
          delimiter: delimiter
        }, (function(_this) {
          return function(value, i) {
            value = _this.formatString(value);
            if (i === 0) {
              value = value.replace(LEADING_BLANK_LINE, '');
            }
            if (i === $) {
              value = value.replace(TRAILING_BLANK_LINE, '');
            }
            if (indentRegex) {
              value = value.replace(indentRegex, '');
            }
            return value;
          };
        })(this));
      } else {
        this.mergeInterpolationTokens(tokens, {
          delimiter: delimiter
        }, (function(_this) {
          return function(value, i) {
            value = _this.formatString(value);
            value = value.replace(SIMPLE_STRING_OMIT, function(match, offset) {
              if ((i === 0 && offset === 0) || (i === $ && offset + match.length === value.length)) {
                return '';
              } else {
                return ' ';
              }
            });
            return value;
          };
        })(this));
      }
      return end;
    };

    Lexer.prototype.commentToken = function() {
      var comment, here, match;
      if (!(match = this.chunk.match(COMMENT))) {
        return 0;
      }
      comment = match[0], here = match[1];
      if (here) {
        if (match = HERECOMMENT_ILLEGAL.exec(comment)) {
          this.error("block comments cannot contain " + match[0], {
            offset: match.index,
            length: match[0].length
          });
        }
        if (here.indexOf('\n') >= 0) {
          here = here.replace(RegExp("\\n" + (repeat(' ', this.indent)), "g"), '\n');
        }
        this.token('HERECOMMENT', here, 0, comment.length);
      }
      return comment.length;
    };

    Lexer.prototype.jsToken = function() {
      var match, script;
      if (!(this.chunk.charAt(0) === '`' && (match = JSTOKEN.exec(this.chunk)))) {
        return 0;
      }
      this.token('JS', (script = match[0]).slice(1, -1), 0, script.length);
      return script.length;
    };

    Lexer.prototype.regexToken = function() {
      var body, closed, end, flags, index, match, origin, prev, ref2, ref3, ref4, regex, tokens;
      switch (false) {
        case !(match = REGEX_ILLEGAL.exec(this.chunk)):
          this.error("regular expressions cannot begin with " + match[2], {
            offset: match.index + match[1].length
          });
          break;
        case !(match = this.matchWithInterpolations(HEREGEX, '///')):
          tokens = match.tokens, index = match.index;
          break;
        case !(match = REGEX.exec(this.chunk)):
          regex = match[0], body = match[1], closed = match[2];
          this.validateEscapes(body, {
            isRegex: true,
            offsetInChunk: 1
          });
          index = regex.length;
          ref2 = this.tokens, prev = ref2[ref2.length - 1];
          if (prev) {
            if (prev.spaced && (ref3 = prev[0], indexOf.call(CALLABLE, ref3) >= 0)) {
              if (!closed || POSSIBLY_DIVISION.test(regex)) {
                return 0;
              }
            } else if (ref4 = prev[0], indexOf.call(NOT_REGEX, ref4) >= 0) {
              return 0;
            }
          }
          if (!closed) {
            this.error('missing / (unclosed regex)');
          }
          break;
        default:
          return 0;
      }
      flags = REGEX_FLAGS.exec(this.chunk.slice(index))[0];
      end = index + flags.length;
      origin = this.makeToken('REGEX', null, 0, end);
      switch (false) {
        case !!VALID_FLAGS.test(flags):
          this.error("invalid regular expression flags " + flags, {
            offset: index,
            length: flags.length
          });
          break;
        case !(regex || tokens.length === 1):
          if (body == null) {
            body = this.formatHeregex(tokens[0][1]);
          }
          this.token('REGEX', "" + (this.makeDelimitedLiteral(body, {
            delimiter: '/'
          })) + flags, 0, end, origin);
          break;
        default:
          this.token('REGEX_START', '(', 0, 0, origin);
          this.token('IDENTIFIER', 'RegExp', 0, 0);
          this.token('CALL_START', '(', 0, 0);
          this.mergeInterpolationTokens(tokens, {
            delimiter: '"',
            double: true
          }, this.formatHeregex);
          if (flags) {
            this.token(',', ',', index, 0);
            this.token('STRING', '"' + flags + '"', index, flags.length);
          }
          this.token(')', ')', end, 0);
          this.token('REGEX_END', ')', end, 0);
      }
      return end;
    };

    Lexer.prototype.lineToken = function() {
      var diff, indent, match, noNewlines, size;
      if (!(match = MULTI_DENT.exec(this.chunk))) {
        return 0;
      }
      indent = match[0];
      this.seenFor = false;
      size = indent.length - 1 - indent.lastIndexOf('\n');
      noNewlines = this.unfinished();
      if (size - this.indebt === this.indent) {
        if (noNewlines) {
          this.suppressNewlines();
        } else {
          this.newlineToken(0);
        }
        return indent.length;
      }
      if (size > this.indent) {
        if (noNewlines) {
          this.indebt = size - this.indent;
          this.suppressNewlines();
          return indent.length;
        }
        if (!this.tokens.length) {
          this.baseIndent = this.indent = size;
          return indent.length;
        }
        diff = size - this.indent + this.outdebt;
        this.token('INDENT', diff, indent.length - size, size);
        this.indents.push(diff);
        this.ends.push({
          tag: 'OUTDENT'
        });
        this.outdebt = this.indebt = 0;
        this.indent = size;
      } else if (size < this.baseIndent) {
        this.error('missing indentation', {
          offset: indent.length
        });
      } else {
        this.indebt = 0;
        this.outdentToken(this.indent - size, noNewlines, indent.length);
      }
      return indent.length;
    };

    Lexer.prototype.outdentToken = function(moveOut, noNewlines, outdentLength) {
      var decreasedIndent, dent, lastIndent, ref2;
      decreasedIndent = this.indent - moveOut;
      while (moveOut > 0) {
        lastIndent = this.indents[this.indents.length - 1];
        if (!lastIndent) {
          moveOut = 0;
        } else if (lastIndent === this.outdebt) {
          moveOut -= this.outdebt;
          this.outdebt = 0;
        } else if (lastIndent < this.outdebt) {
          this.outdebt -= lastIndent;
          moveOut -= lastIndent;
        } else {
          dent = this.indents.pop() + this.outdebt;
          if (outdentLength && (ref2 = this.chunk[outdentLength], indexOf.call(INDENTABLE_CLOSERS, ref2) >= 0)) {
            decreasedIndent -= dent - moveOut;
            moveOut = dent;
          }
          this.outdebt = 0;
          this.pair('OUTDENT');
          this.token('OUTDENT', moveOut, 0, outdentLength);
          moveOut -= dent;
        }
      }
      if (dent) {
        this.outdebt -= moveOut;
      }
      while (this.value() === ';') {
        this.tokens.pop();
      }
      if (!(this.tag() === 'TERMINATOR' || noNewlines)) {
        this.token('TERMINATOR', '\n', outdentLength, 0);
      }
      this.indent = decreasedIndent;
      return this;
    };

    Lexer.prototype.whitespaceToken = function() {
      var match, nline, prev, ref2;
      if (!((match = WHITESPACE.exec(this.chunk)) || (nline = this.chunk.charAt(0) === '\n'))) {
        return 0;
      }
      ref2 = this.tokens, prev = ref2[ref2.length - 1];
      if (prev) {
        prev[match ? 'spaced' : 'newLine'] = true;
      }
      if (match) {
        return match[0].length;
      } else {
        return 0;
      }
    };

    Lexer.prototype.newlineToken = function(offset) {
      while (this.value() === ';') {
        this.tokens.pop();
      }
      if (this.tag() !== 'TERMINATOR') {
        this.token('TERMINATOR', '\n', offset, 0);
      }
      return this;
    };

    Lexer.prototype.suppressNewlines = function() {
      if (this.value() === '\\') {
        this.tokens.pop();
      }
      return this;
    };

    Lexer.prototype.literalToken = function() {
      var match, prev, ref2, ref3, ref4, ref5, ref6, tag, token, value;
      if (match = OPERATOR.exec(this.chunk)) {
        value = match[0];
        if (CODE.test(value)) {
          this.tagParameters();
        }
      } else {
        value = this.chunk.charAt(0);
      }
      tag = value;
      ref2 = this.tokens, prev = ref2[ref2.length - 1];
      if (value === '=' && prev) {
        if (!prev[1].reserved && (ref3 = prev[1], indexOf.call(JS_FORBIDDEN, ref3) >= 0)) {
          if (prev.origin) {
            prev = prev.origin;
          }
          this.error("reserved word '" + prev[1] + "' can't be assigned", prev[2]);
        }
        if ((ref4 = prev[1]) === '||' || ref4 === '&&') {
          prev[0] = 'COMPOUND_ASSIGN';
          prev[1] += '=';
          return value.length;
        }
      }
      if (value === ';') {
        this.seenFor = false;
        tag = 'TERMINATOR';
      } else if (indexOf.call(MATH, value) >= 0) {
        tag = 'MATH';
      } else if (indexOf.call(COMPARE, value) >= 0) {
        tag = 'COMPARE';
      } else if (indexOf.call(COMPOUND_ASSIGN, value) >= 0) {
        tag = 'COMPOUND_ASSIGN';
      } else if (indexOf.call(UNARY, value) >= 0) {
        tag = 'UNARY';
      } else if (indexOf.call(UNARY_MATH, value) >= 0) {
        tag = 'UNARY_MATH';
      } else if (indexOf.call(SHIFT, value) >= 0) {
        tag = 'SHIFT';
      } else if (indexOf.call(LOGIC, value) >= 0 || value === '?' && (prev != null ? prev.spaced : void 0)) {
        tag = 'LOGIC';
      } else if (prev && !prev.spaced) {
        if (value === '(' && (ref5 = prev[0], indexOf.call(CALLABLE, ref5) >= 0)) {
          if (prev[0] === '?') {
            prev[0] = 'FUNC_EXIST';
          }
          tag = 'CALL_START';
        } else if (value === '[' && (ref6 = prev[0], indexOf.call(INDEXABLE, ref6) >= 0)) {
          tag = 'INDEX_START';
          switch (prev[0]) {
            case '?':
              prev[0] = 'INDEX_SOAK';
          }
        }
      }
      token = this.makeToken(tag, value);
      switch (value) {
        case '(':
        case '{':
        case '[':
          this.ends.push({
            tag: INVERSES[value],
            origin: token
          });
          break;
        case ')':
        case '}':
        case ']':
          this.pair(value);
      }
      this.tokens.push(token);
      return value.length;
    };

    Lexer.prototype.tagParameters = function() {
      var i, stack, tok, tokens;
      if (this.tag() !== ')') {
        return this;
      }
      stack = [];
      tokens = this.tokens;
      i = tokens.length;
      tokens[--i][0] = 'PARAM_END';
      while (tok = tokens[--i]) {
        switch (tok[0]) {
          case ')':
            stack.push(tok);
            break;
          case '(':
          case 'CALL_START':
            if (stack.length) {
              stack.pop();
            } else if (tok[0] === '(') {
              tok[0] = 'PARAM_START';
              return this;
            } else {
              return this;
            }
        }
      }
      return this;
    };

    Lexer.prototype.closeIndentation = function() {
      return this.outdentToken(this.indent);
    };

    Lexer.prototype.matchWithInterpolations = function(regex, delimiter) {
      var close, column, firstToken, index, lastToken, line, nested, offsetInChunk, open, ref2, ref3, ref4, str, strPart, tokens;
      tokens = [];
      offsetInChunk = delimiter.length;
      if (this.chunk.slice(0, offsetInChunk) !== delimiter) {
        return null;
      }
      str = this.chunk.slice(offsetInChunk);
      while (true) {
        strPart = regex.exec(str)[0];
        this.validateEscapes(strPart, {
          isRegex: delimiter.charAt(0) === '/',
          offsetInChunk: offsetInChunk
        });
        tokens.push(this.makeToken('NEOSTRING', strPart, offsetInChunk));
        str = str.slice(strPart.length);
        offsetInChunk += strPart.length;
        if (str.slice(0, 2) !== '#{') {
          break;
        }
        ref2 = this.getLineAndColumnFromChunk(offsetInChunk + 1), line = ref2[0], column = ref2[1];
        ref3 = new Lexer().tokenize(str.slice(1), {
          line: line,
          column: column,
          untilBalanced: true
        }), nested = ref3.tokens, index = ref3.index;
        index += 1;
        open = nested[0], close = nested[nested.length - 1];
        open[0] = open[1] = '(';
        close[0] = close[1] = ')';
        close.origin = ['', 'end of interpolation', close[2]];
        if (((ref4 = nested[1]) != null ? ref4[0] : void 0) === 'TERMINATOR') {
          nested.splice(1, 1);
        }
        tokens.push(['TOKENS', nested]);
        str = str.slice(index);
        offsetInChunk += index;
      }
      if (str.slice(0, delimiter.length) !== delimiter) {
        this.error("missing " + delimiter, {
          length: delimiter.length
        });
      }
      firstToken = tokens[0], lastToken = tokens[tokens.length - 1];
      firstToken[2].first_column -= delimiter.length;
      lastToken[2].last_column += delimiter.length;
      if (lastToken[1].length === 0) {
        lastToken[2].last_column -= 1;
      }
      return {
        tokens: tokens,
        index: offsetInChunk + delimiter.length
      };
    };

    Lexer.prototype.mergeInterpolationTokens = function(tokens, options, fn) {
      var converted, firstEmptyStringIndex, firstIndex, i, j, lastToken, len, locationToken, lparen, plusToken, ref2, rparen, tag, token, tokensToPush, value;
      if (tokens.length > 1) {
        lparen = this.token('STRING_START', '(', 0, 0);
      }
      firstIndex = this.tokens.length;
      for (i = j = 0, len = tokens.length; j < len; i = ++j) {
        token = tokens[i];
        tag = token[0], value = token[1];
        switch (tag) {
          case 'TOKENS':
            if (value.length === 2) {
              continue;
            }
            locationToken = value[0];
            tokensToPush = value;
            break;
          case 'NEOSTRING':
            converted = fn(token[1], i);
            if (converted.length === 0) {
              if (i === 0) {
                firstEmptyStringIndex = this.tokens.length;
              } else {
                continue;
              }
            }
            if (i === 2 && (firstEmptyStringIndex != null)) {
              this.tokens.splice(firstEmptyStringIndex, 2);
            }
            token[0] = 'STRING';
            token[1] = this.makeDelimitedLiteral(converted, options);
            locationToken = token;
            tokensToPush = [token];
        }
        if (this.tokens.length > firstIndex) {
          plusToken = this.token('+', '+');
          plusToken[2] = {
            first_line: locationToken[2].first_line,
            first_column: locationToken[2].first_column,
            last_line: locationToken[2].first_line,
            last_column: locationToken[2].first_column
          };
        }
        (ref2 = this.tokens).push.apply(ref2, tokensToPush);
      }
      if (lparen) {
        lastToken = tokens[tokens.length - 1];
        lparen.origin = [
          'STRING', null, {
            first_line: lparen[2].first_line,
            first_column: lparen[2].first_column,
            last_line: lastToken[2].last_line,
            last_column: lastToken[2].last_column
          }
        ];
        rparen = this.token('STRING_END', ')');
        return rparen[2] = {
          first_line: lastToken[2].last_line,
          first_column: lastToken[2].last_column,
          last_line: lastToken[2].last_line,
          last_column: lastToken[2].last_column
        };
      }
    };

    Lexer.prototype.pair = function(tag) {
      var lastIndent, prev, ref2, ref3, wanted;
      ref2 = this.ends, prev = ref2[ref2.length - 1];
      if (tag !== (wanted = prev != null ? prev.tag : void 0)) {
        if ('OUTDENT' !== wanted) {
          this.error("unmatched " + tag);
        }
        ref3 = this.indents, lastIndent = ref3[ref3.length - 1];
        this.outdentToken(lastIndent, true);
        return this.pair(tag);
      }
      return this.ends.pop();
    };

    Lexer.prototype.getLineAndColumnFromChunk = function(offset) {
      var column, lastLine, lineCount, ref2, string;
      if (offset === 0) {
        return [this.chunkLine, this.chunkColumn];
      }
      if (offset >= this.chunk.length) {
        string = this.chunk;
      } else {
        string = this.chunk.slice(0, +(offset - 1) + 1 || 9e9);
      }
      lineCount = count(string, '\n');
      column = this.chunkColumn;
      if (lineCount > 0) {
        ref2 = string.split('\n'), lastLine = ref2[ref2.length - 1];
        column = lastLine.length;
      } else {
        column += string.length;
      }
      return [this.chunkLine + lineCount, column];
    };

    Lexer.prototype.makeToken = function(tag, value, offsetInChunk, length) {
      var lastCharacter, locationData, ref2, ref3, token;
      if (offsetInChunk == null) {
        offsetInChunk = 0;
      }
      if (length == null) {
        length = value.length;
      }
      locationData = {};
      ref2 = this.getLineAndColumnFromChunk(offsetInChunk), locationData.first_line = ref2[0], locationData.first_column = ref2[1];
      lastCharacter = Math.max(0, length - 1);
      ref3 = this.getLineAndColumnFromChunk(offsetInChunk + lastCharacter), locationData.last_line = ref3[0], locationData.last_column = ref3[1];
      token = [tag, value, locationData];
      return token;
    };

    Lexer.prototype.token = function(tag, value, offsetInChunk, length, origin) {
      var token;
      token = this.makeToken(tag, value, offsetInChunk, length);
      if (origin) {
        token.origin = origin;
      }
      this.tokens.push(token);
      return token;
    };

    Lexer.prototype.tag = function() {
      var ref2, token;
      ref2 = this.tokens, token = ref2[ref2.length - 1];
      return token != null ? token[0] : void 0;
    };

    Lexer.prototype.value = function() {
      var ref2, token;
      ref2 = this.tokens, token = ref2[ref2.length - 1];
      return token != null ? token[1] : void 0;
    };

    Lexer.prototype.unfinished = function() {
      var ref2;
      return LINE_CONTINUER.test(this.chunk) || ((ref2 = this.tag()) === '\\' || ref2 === '.' || ref2 === '?.' || ref2 === '?::' || ref2 === 'UNARY' || ref2 === 'MATH' || ref2 === 'UNARY_MATH' || ref2 === '+' || ref2 === '-' || ref2 === 'YIELD' || ref2 === '**' || ref2 === 'SHIFT' || ref2 === 'RELATION' || ref2 === 'COMPARE' || ref2 === 'LOGIC' || ref2 === 'THROW' || ref2 === 'EXTENDS');
    };

    Lexer.prototype.formatString = function(str) {
      return str.replace(STRING_OMIT, '$1');
    };

    Lexer.prototype.formatHeregex = function(str) {
      return str.replace(HEREGEX_OMIT, '$1$2');
    };

    Lexer.prototype.validateEscapes = function(str, options) {
      var before, hex, invalidEscape, match, message, octal, ref2, unicode;
      if (options == null) {
        options = {};
      }
      match = INVALID_ESCAPE.exec(str);
      if (!match) {
        return;
      }
      match[0], before = match[1], octal = match[2], hex = match[3], unicode = match[4];
      if (options.isRegex && octal && octal.charAt(0) !== '0') {
        return;
      }
      message = octal ? "octal escape sequences are not allowed" : "invalid escape sequence";
      invalidEscape = "\\" + (octal || hex || unicode);
      return this.error(message + " " + invalidEscape, {
        offset: ((ref2 = options.offsetInChunk) != null ? ref2 : 0) + match.index + before.length,
        length: invalidEscape.length
      });
    };

    Lexer.prototype.makeDelimitedLiteral = function(body, options) {
      var regex;
      if (options == null) {
        options = {};
      }
      if (body === '' && options.delimiter === '/') {
        body = '(?:)';
      }
      regex = RegExp("(\\\\\\\\)|(\\\\0(?=[1-7]))|\\\\?(" + options.delimiter + ")|\\\\?(?:(\\n)|(\\r)|(\\u2028)|(\\u2029))|(\\\\.)", "g");
      body = body.replace(regex, function(match, backslash, nul, delimiter, lf, cr, ls, ps, other) {
        switch (false) {
          case !backslash:
            if (options.double) {
              return backslash + backslash;
            } else {
              return backslash;
            }
          case !nul:
            return '\\x00';
          case !delimiter:
            return "\\" + delimiter;
          case !lf:
            return '\\n';
          case !cr:
            return '\\r';
          case !ls:
            return '\\u2028';
          case !ps:
            return '\\u2029';
          case !other:
            if (options.double) {
              return "\\" + other;
            } else {
              return other;
            }
        }
      });
      return "" + options.delimiter + body + options.delimiter;
    };

    Lexer.prototype.error = function(message, options) {
      var first_column, first_line, location, ref2, ref3, ref4;
      if (options == null) {
        options = {};
      }
      location = 'first_line' in options ? options : ((ref3 = this.getLineAndColumnFromChunk((ref2 = options.offset) != null ? ref2 : 0), first_line = ref3[0], first_column = ref3[1], ref3), {
        first_line: first_line,
        first_column: first_column,
        last_column: first_column + ((ref4 = options.length) != null ? ref4 : 1) - 1
      });
      return throwSyntaxError(message, location);
    };

    return Lexer;

  })();

  JS_KEYWORDS = ['true', 'false', 'null', 'this', 'new', 'delete', 'typeof', 'in', 'instanceof', 'return', 'throw', 'break', 'continue', 'debugger', 'yield', 'if', 'else', 'switch', 'for', 'while', 'do', 'try', 'catch', 'finally', 'class', 'extends', 'super'];

  COFFEE_KEYWORDS = ['undefined', 'then', 'unless', 'until', 'loop', 'of', 'by', 'when'];

  COFFEE_ALIAS_MAP = {
    and: '&&',
    or: '||',
    is: '==',
    isnt: '!=',
    not: '!',
    yes: 'true',
    no: 'false',
    on: 'true',
    off: 'false'
  };

  COFFEE_ALIASES = (function() {
    var results;
    results = [];
    for (key in COFFEE_ALIAS_MAP) {
      results.push(key);
    }
    return results;
  })();

  COFFEE_KEYWORDS = COFFEE_KEYWORDS.concat(COFFEE_ALIASES);

  RESERVED = ['case', 'default', 'function', 'var', 'void', 'with', 'const', 'let', 'enum', 'export', 'import', 'native', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static'];

  STRICT_PROSCRIBED = ['arguments', 'eval', 'yield*'];

  JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED).concat(STRICT_PROSCRIBED);

  exports.RESERVED = RESERVED.concat(JS_KEYWORDS).concat(COFFEE_KEYWORDS).concat(STRICT_PROSCRIBED);

  exports.STRICT_PROSCRIBED = STRICT_PROSCRIBED;

  BOM = 65279;

  IDENTIFIER = /^(?!\d)((?:(?!\s)[$\w\x7f-\uffff])+)([^\n\S]*:(?!:))?/;

  NUMBER = /^0b[01]+|^0o[0-7]+|^0x[\da-f]+|^\d*\.?\d+(?:e[+-]?\d+)?/i;

  OPERATOR = /^(?:[-=]>|[-+*\/%<>&|^!?=]=|>>>=?|([-+:])\1|([&|<>*\/%])\2=?|\?(\.|::)|\.{2,3})/;

  WHITESPACE = /^[^\n\S]+/;

  COMMENT = /^###([^#][\s\S]*?)(?:###[^\n\S]*|###$)|^(?:\s*#(?!##[^#]).*)+/;

  CODE = /^[-=]>/;

  MULTI_DENT = /^(?:\n[^\n\S]*)+/;

  JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;

  STRING_START = /^(?:'''|"""|'|")/;

  STRING_SINGLE = /^(?:[^\\']|\\[\s\S])*/;

  STRING_DOUBLE = /^(?:[^\\"#]|\\[\s\S]|\#(?!\{))*/;

  HEREDOC_SINGLE = /^(?:[^\\']|\\[\s\S]|'(?!''))*/;

  HEREDOC_DOUBLE = /^(?:[^\\"#]|\\[\s\S]|"(?!"")|\#(?!\{))*/;

  STRING_OMIT = /((?:\\\\)+)|\\[^\S\n]*\n\s*/g;

  SIMPLE_STRING_OMIT = /\s*\n\s*/g;

  HEREDOC_INDENT = /\n+([^\n\S]*)(?=\S)/g;

  REGEX = /^\/(?!\/)((?:[^[\/\n\\]|\\[^\n]|\[(?:\\[^\n]|[^\]\n\\])*\])*)(\/)?/;

  REGEX_FLAGS = /^\w*/;

  VALID_FLAGS = /^(?!.*(.).*\1)[imgy]*$/;

  HEREGEX = /^(?:[^\\\/#]|\\[\s\S]|\/(?!\/\/)|\#(?!\{))*/;

  HEREGEX_OMIT = /((?:\\\\)+)|\\(\s)|\s+(?:#.*)?/g;

  REGEX_ILLEGAL = /^(\/|\/{3}\s*)(\*)/;

  POSSIBLY_DIVISION = /^\/=?\s/;

  HERECOMMENT_ILLEGAL = /\*\//;

  LINE_CONTINUER = /^\s*(?:,|\??\.(?![.\d])|::)/;

  INVALID_ESCAPE = /((?:^|[^\\])(?:\\\\)*)\\(?:(0[0-7]|[1-7])|(x(?![\da-fA-F]{2}).{0,2})|(u(?![\da-fA-F]{4}).{0,4}))/;

  LEADING_BLANK_LINE = /^[^\n\S]*\n/;

  TRAILING_BLANK_LINE = /\n[^\n\S]*$/;

  TRAILING_SPACES = /\s+$/;

  COMPOUND_ASSIGN = ['-=', '+=', '/=', '*=', '%=', '||=', '&&=', '?=', '<<=', '>>=', '>>>=', '&=', '^=', '|=', '**=', '//=', '%%='];

  UNARY = ['NEW', 'TYPEOF', 'DELETE', 'DO'];

  UNARY_MATH = ['!', '~'];

  LOGIC = ['&&', '||', '&', '|', '^'];

  SHIFT = ['<<', '>>', '>>>'];

  COMPARE = ['==', '!=', '<', '>', '<=', '>='];

  MATH = ['*', '/', '%', '//', '%%'];

  RELATION = ['IN', 'OF', 'INSTANCEOF'];

  BOOL = ['TRUE', 'FALSE'];

  CALLABLE = ['IDENTIFIER', ')', ']', '?', '@', 'THIS', 'SUPER'];

  INDEXABLE = CALLABLE.concat(['NUMBER', 'STRING', 'STRING_END', 'REGEX', 'REGEX_END', 'BOOL', 'NULL', 'UNDEFINED', '}', '::']);

  NOT_REGEX = INDEXABLE.concat(['++', '--']);

  LINE_BREAK = ['INDENT', 'OUTDENT', 'TERMINATOR'];

  INDENTABLE_CLOSERS = [')', '}', ']'];

}).call(this);

},{"./helpers":21,"./rewriter":26}],23:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var Access, Arr, Assign, Base, Block, Call, Class, Code, CodeFragment, Comment, Existence, Expansion, Extends, For, HEXNUM, IDENTIFIER, IS_REGEX, IS_STRING, If, In, Index, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, Literal, NEGATE, NO, NUMBER, Obj, Op, Param, Parens, RESERVED, Range, Return, SIMPLENUM, STRICT_PROSCRIBED, Scope, Slice, Splat, Switch, TAB, THIS, Throw, Try, UTILITIES, Value, While, YES, addLocationDataFn, compact, del, ends, extend, flatten, fragmentsToText, isComplexOrAssignable, isLiteralArguments, isLiteralThis, locationDataToString, merge, multident, parseNum, ref1, ref2, some, starts, throwSyntaxError, unfoldSoak, utility,
    extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  Error.stackTraceLimit = Infinity;

  Scope = require('./scope').Scope;

  ref1 = require('./lexer'), RESERVED = ref1.RESERVED, STRICT_PROSCRIBED = ref1.STRICT_PROSCRIBED;

  ref2 = require('./helpers'), compact = ref2.compact, flatten = ref2.flatten, extend = ref2.extend, merge = ref2.merge, del = ref2.del, starts = ref2.starts, ends = ref2.ends, some = ref2.some, addLocationDataFn = ref2.addLocationDataFn, locationDataToString = ref2.locationDataToString, throwSyntaxError = ref2.throwSyntaxError;

  exports.extend = extend;

  exports.addLocationDataFn = addLocationDataFn;

  YES = function() {
    return true;
  };

  NO = function() {
    return false;
  };

  THIS = function() {
    return this;
  };

  NEGATE = function() {
    this.negated = !this.negated;
    return this;
  };

  exports.CodeFragment = CodeFragment = (function() {
    function CodeFragment(parent, code) {
      var ref3;
      this.code = "" + code;
      this.locationData = parent != null ? parent.locationData : void 0;
      this.type = (parent != null ? (ref3 = parent.constructor) != null ? ref3.name : void 0 : void 0) || 'unknown';
    }

    CodeFragment.prototype.toString = function() {
      return "" + this.code + (this.locationData ? ": " + locationDataToString(this.locationData) : '');
    };

    return CodeFragment;

  })();

  fragmentsToText = function(fragments) {
    var fragment;
    return ((function() {
      var j, len1, results;
      results = [];
      for (j = 0, len1 = fragments.length; j < len1; j++) {
        fragment = fragments[j];
        results.push(fragment.code);
      }
      return results;
    })()).join('');
  };

  exports.Base = Base = (function() {
    function Base() {}

    Base.prototype.compile = function(o, lvl) {
      return fragmentsToText(this.compileToFragments(o, lvl));
    };

    Base.prototype.compileToFragments = function(o, lvl) {
      var node;
      o = extend({}, o);
      if (lvl) {
        o.level = lvl;
      }
      node = this.unfoldSoak(o) || this;
      node.tab = o.indent;
      if (o.level === LEVEL_TOP || !node.isStatement(o)) {
        return node.compileNode(o);
      } else {
        return node.compileClosure(o);
      }
    };

    Base.prototype.compileClosure = function(o) {
      var args, argumentsNode, func, jumpNode, meth, parts, ref3;
      if (jumpNode = this.jumps()) {
        jumpNode.error('cannot use a pure statement in an expression');
      }
      o.sharedScope = true;
      func = new Code([], Block.wrap([this]));
      args = [];
      if ((argumentsNode = this.contains(isLiteralArguments)) || this.contains(isLiteralThis)) {
        args = [new Literal('this')];
        if (argumentsNode) {
          meth = 'apply';
          args.push(new Literal('arguments'));
        } else {
          meth = 'call';
        }
        func = new Value(func, [new Access(new Literal(meth))]);
      }
      parts = (new Call(func, args)).compileNode(o);
      if (func.isGenerator || ((ref3 = func.base) != null ? ref3.isGenerator : void 0)) {
        parts.unshift(this.makeCode("(yield* "));
        parts.push(this.makeCode(")"));
      }
      return parts;
    };

    Base.prototype.cache = function(o, level, isComplex) {
      var complex, ref, sub;
      complex = isComplex != null ? isComplex(this) : this.isComplex();
      if (complex) {
        ref = new Literal(o.scope.freeVariable('ref'));
        sub = new Assign(ref, this);
        if (level) {
          return [sub.compileToFragments(o, level), [this.makeCode(ref.value)]];
        } else {
          return [sub, ref];
        }
      } else {
        ref = level ? this.compileToFragments(o, level) : this;
        return [ref, ref];
      }
    };

    Base.prototype.cacheToCodeFragments = function(cacheValues) {
      return [fragmentsToText(cacheValues[0]), fragmentsToText(cacheValues[1])];
    };

    Base.prototype.makeReturn = function(res) {
      var me;
      me = this.unwrapAll();
      if (res) {
        return new Call(new Literal(res + ".push"), [me]);
      } else {
        return new Return(me);
      }
    };

    Base.prototype.contains = function(pred) {
      var node;
      node = void 0;
      this.traverseChildren(false, function(n) {
        if (pred(n)) {
          node = n;
          return false;
        }
      });
      return node;
    };

    Base.prototype.lastNonComment = function(list) {
      var i;
      i = list.length;
      while (i--) {
        if (!(list[i] instanceof Comment)) {
          return list[i];
        }
      }
      return null;
    };

    Base.prototype.toString = function(idt, name) {
      var tree;
      if (idt == null) {
        idt = '';
      }
      if (name == null) {
        name = this.constructor.name;
      }
      tree = '\n' + idt + name;
      if (this.soak) {
        tree += '?';
      }
      this.eachChild(function(node) {
        return tree += node.toString(idt + TAB);
      });
      return tree;
    };

    Base.prototype.eachChild = function(func) {
      var attr, child, j, k, len1, len2, ref3, ref4;
      if (!this.children) {
        return this;
      }
      ref3 = this.children;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        attr = ref3[j];
        if (this[attr]) {
          ref4 = flatten([this[attr]]);
          for (k = 0, len2 = ref4.length; k < len2; k++) {
            child = ref4[k];
            if (func(child) === false) {
              return this;
            }
          }
        }
      }
      return this;
    };

    Base.prototype.traverseChildren = function(crossScope, func) {
      return this.eachChild(function(child) {
        var recur;
        recur = func(child);
        if (recur !== false) {
          return child.traverseChildren(crossScope, func);
        }
      });
    };

    Base.prototype.invert = function() {
      return new Op('!', this);
    };

    Base.prototype.unwrapAll = function() {
      var node;
      node = this;
      while (node !== (node = node.unwrap())) {
        continue;
      }
      return node;
    };

    Base.prototype.children = [];

    Base.prototype.isStatement = NO;

    Base.prototype.jumps = NO;

    Base.prototype.isComplex = YES;

    Base.prototype.isChainable = NO;

    Base.prototype.isAssignable = NO;

    Base.prototype.unwrap = THIS;

    Base.prototype.unfoldSoak = NO;

    Base.prototype.assigns = NO;

    Base.prototype.updateLocationDataIfMissing = function(locationData) {
      if (this.locationData) {
        return this;
      }
      this.locationData = locationData;
      return this.eachChild(function(child) {
        return child.updateLocationDataIfMissing(locationData);
      });
    };

    Base.prototype.error = function(message) {
      return throwSyntaxError(message, this.locationData);
    };

    Base.prototype.makeCode = function(code) {
      return new CodeFragment(this, code);
    };

    Base.prototype.wrapInBraces = function(fragments) {
      return [].concat(this.makeCode('('), fragments, this.makeCode(')'));
    };

    Base.prototype.joinFragmentArrays = function(fragmentsList, joinStr) {
      var answer, fragments, i, j, len1;
      answer = [];
      for (i = j = 0, len1 = fragmentsList.length; j < len1; i = ++j) {
        fragments = fragmentsList[i];
        if (i) {
          answer.push(this.makeCode(joinStr));
        }
        answer = answer.concat(fragments);
      }
      return answer;
    };

    return Base;

  })();

  exports.Block = Block = (function(superClass1) {
    extend1(Block, superClass1);

    function Block(nodes) {
      this.expressions = compact(flatten(nodes || []));
    }

    Block.prototype.children = ['expressions'];

    Block.prototype.push = function(node) {
      this.expressions.push(node);
      return this;
    };

    Block.prototype.pop = function() {
      return this.expressions.pop();
    };

    Block.prototype.unshift = function(node) {
      this.expressions.unshift(node);
      return this;
    };

    Block.prototype.unwrap = function() {
      if (this.expressions.length === 1) {
        return this.expressions[0];
      } else {
        return this;
      }
    };

    Block.prototype.isEmpty = function() {
      return !this.expressions.length;
    };

    Block.prototype.isStatement = function(o) {
      var exp, j, len1, ref3;
      ref3 = this.expressions;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        exp = ref3[j];
        if (exp.isStatement(o)) {
          return true;
        }
      }
      return false;
    };

    Block.prototype.jumps = function(o) {
      var exp, j, jumpNode, len1, ref3;
      ref3 = this.expressions;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        exp = ref3[j];
        if (jumpNode = exp.jumps(o)) {
          return jumpNode;
        }
      }
    };

    Block.prototype.makeReturn = function(res) {
      var expr, len;
      len = this.expressions.length;
      while (len--) {
        expr = this.expressions[len];
        if (!(expr instanceof Comment)) {
          this.expressions[len] = expr.makeReturn(res);
          if (expr instanceof Return && !expr.expression) {
            this.expressions.splice(len, 1);
          }
          break;
        }
      }
      return this;
    };

    Block.prototype.compileToFragments = function(o, level) {
      if (o == null) {
        o = {};
      }
      if (o.scope) {
        return Block.__super__.compileToFragments.call(this, o, level);
      } else {
        return this.compileRoot(o);
      }
    };

    Block.prototype.compileNode = function(o) {
      var answer, compiledNodes, fragments, index, j, len1, node, ref3, top;
      this.tab = o.indent;
      top = o.level === LEVEL_TOP;
      compiledNodes = [];
      ref3 = this.expressions;
      for (index = j = 0, len1 = ref3.length; j < len1; index = ++j) {
        node = ref3[index];
        node = node.unwrapAll();
        node = node.unfoldSoak(o) || node;
        if (node instanceof Block) {
          compiledNodes.push(node.compileNode(o));
        } else if (top) {
          node.front = true;
          fragments = node.compileToFragments(o);
          if (!node.isStatement(o)) {
            fragments.unshift(this.makeCode("" + this.tab));
            fragments.push(this.makeCode(";"));
          }
          compiledNodes.push(fragments);
        } else {
          compiledNodes.push(node.compileToFragments(o, LEVEL_LIST));
        }
      }
      if (top) {
        if (this.spaced) {
          return [].concat(this.joinFragmentArrays(compiledNodes, '\n\n'), this.makeCode("\n"));
        } else {
          return this.joinFragmentArrays(compiledNodes, '\n');
        }
      }
      if (compiledNodes.length) {
        answer = this.joinFragmentArrays(compiledNodes, ', ');
      } else {
        answer = [this.makeCode("void 0")];
      }
      if (compiledNodes.length > 1 && o.level >= LEVEL_LIST) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    Block.prototype.compileRoot = function(o) {
      var exp, fragments, i, j, len1, name, prelude, preludeExps, ref3, ref4, rest;
      o.indent = o.bare ? '' : TAB;
      o.level = LEVEL_TOP;
      this.spaced = true;
      o.scope = new Scope(null, this, null, (ref3 = o.referencedVars) != null ? ref3 : []);
      ref4 = o.locals || [];
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        name = ref4[j];
        o.scope.parameter(name);
      }
      prelude = [];
      if (!o.bare) {
        preludeExps = (function() {
          var k, len2, ref5, results;
          ref5 = this.expressions;
          results = [];
          for (i = k = 0, len2 = ref5.length; k < len2; i = ++k) {
            exp = ref5[i];
            if (!(exp.unwrap() instanceof Comment)) {
              break;
            }
            results.push(exp);
          }
          return results;
        }).call(this);
        rest = this.expressions.slice(preludeExps.length);
        this.expressions = preludeExps;
        if (preludeExps.length) {
          prelude = this.compileNode(merge(o, {
            indent: ''
          }));
          prelude.push(this.makeCode("\n"));
        }
        this.expressions = rest;
      }
      fragments = this.compileWithDeclarations(o);
      if (o.bare) {
        return fragments;
      }
      return [].concat(prelude, this.makeCode("(function() {\n"), fragments, this.makeCode("\n}).call(this);\n"));
    };

    Block.prototype.compileWithDeclarations = function(o) {
      var assigns, declars, exp, fragments, i, j, len1, post, ref3, ref4, ref5, rest, scope, spaced;
      fragments = [];
      post = [];
      ref3 = this.expressions;
      for (i = j = 0, len1 = ref3.length; j < len1; i = ++j) {
        exp = ref3[i];
        exp = exp.unwrap();
        if (!(exp instanceof Comment || exp instanceof Literal)) {
          break;
        }
      }
      o = merge(o, {
        level: LEVEL_TOP
      });
      if (i) {
        rest = this.expressions.splice(i, 9e9);
        ref4 = [this.spaced, false], spaced = ref4[0], this.spaced = ref4[1];
        ref5 = [this.compileNode(o), spaced], fragments = ref5[0], this.spaced = ref5[1];
        this.expressions = rest;
      }
      post = this.compileNode(o);
      scope = o.scope;
      if (scope.expressions === this) {
        declars = o.scope.hasDeclarations();
        assigns = scope.hasAssignments;
        if (declars || assigns) {
          if (i) {
            fragments.push(this.makeCode('\n'));
          }
          fragments.push(this.makeCode(this.tab + "var "));
          if (declars) {
            fragments.push(this.makeCode(scope.declaredVariables().join(', ')));
          }
          if (assigns) {
            if (declars) {
              fragments.push(this.makeCode(",\n" + (this.tab + TAB)));
            }
            fragments.push(this.makeCode(scope.assignedVariables().join(",\n" + (this.tab + TAB))));
          }
          fragments.push(this.makeCode(";\n" + (this.spaced ? '\n' : '')));
        } else if (fragments.length && post.length) {
          fragments.push(this.makeCode("\n"));
        }
      }
      return fragments.concat(post);
    };

    Block.wrap = function(nodes) {
      if (nodes.length === 1 && nodes[0] instanceof Block) {
        return nodes[0];
      }
      return new Block(nodes);
    };

    return Block;

  })(Base);

  exports.Literal = Literal = (function(superClass1) {
    extend1(Literal, superClass1);

    function Literal(value1) {
      this.value = value1;
    }

    Literal.prototype.makeReturn = function() {
      if (this.isStatement()) {
        return this;
      } else {
        return Literal.__super__.makeReturn.apply(this, arguments);
      }
    };

    Literal.prototype.isAssignable = function() {
      return IDENTIFIER.test(this.value);
    };

    Literal.prototype.isStatement = function() {
      var ref3;
      return (ref3 = this.value) === 'break' || ref3 === 'continue' || ref3 === 'debugger';
    };

    Literal.prototype.isComplex = NO;

    Literal.prototype.assigns = function(name) {
      return name === this.value;
    };

    Literal.prototype.jumps = function(o) {
      if (this.value === 'break' && !((o != null ? o.loop : void 0) || (o != null ? o.block : void 0))) {
        return this;
      }
      if (this.value === 'continue' && !(o != null ? o.loop : void 0)) {
        return this;
      }
    };

    Literal.prototype.compileNode = function(o) {
      var answer, code, ref3;
      code = this.value === 'this' ? ((ref3 = o.scope.method) != null ? ref3.bound : void 0) ? o.scope.method.context : this.value : this.value.reserved ? "\"" + this.value + "\"" : this.value;
      answer = this.isStatement() ? "" + this.tab + code + ";" : code;
      return [this.makeCode(answer)];
    };

    Literal.prototype.toString = function() {
      return ' "' + this.value + '"';
    };

    return Literal;

  })(Base);

  exports.Undefined = (function(superClass1) {
    extend1(Undefined, superClass1);

    function Undefined() {
      return Undefined.__super__.constructor.apply(this, arguments);
    }

    Undefined.prototype.isAssignable = NO;

    Undefined.prototype.isComplex = NO;

    Undefined.prototype.compileNode = function(o) {
      return [this.makeCode(o.level >= LEVEL_ACCESS ? '(void 0)' : 'void 0')];
    };

    return Undefined;

  })(Base);

  exports.Null = (function(superClass1) {
    extend1(Null, superClass1);

    function Null() {
      return Null.__super__.constructor.apply(this, arguments);
    }

    Null.prototype.isAssignable = NO;

    Null.prototype.isComplex = NO;

    Null.prototype.compileNode = function() {
      return [this.makeCode("null")];
    };

    return Null;

  })(Base);

  exports.Bool = (function(superClass1) {
    extend1(Bool, superClass1);

    Bool.prototype.isAssignable = NO;

    Bool.prototype.isComplex = NO;

    Bool.prototype.compileNode = function() {
      return [this.makeCode(this.val)];
    };

    function Bool(val1) {
      this.val = val1;
    }

    return Bool;

  })(Base);

  exports.Return = Return = (function(superClass1) {
    extend1(Return, superClass1);

    function Return(expression) {
      this.expression = expression;
    }

    Return.prototype.children = ['expression'];

    Return.prototype.isStatement = YES;

    Return.prototype.makeReturn = THIS;

    Return.prototype.jumps = THIS;

    Return.prototype.compileToFragments = function(o, level) {
      var expr, ref3;
      expr = (ref3 = this.expression) != null ? ref3.makeReturn() : void 0;
      if (expr && !(expr instanceof Return)) {
        return expr.compileToFragments(o, level);
      } else {
        return Return.__super__.compileToFragments.call(this, o, level);
      }
    };

    Return.prototype.compileNode = function(o) {
      var answer, exprIsYieldReturn, ref3;
      answer = [];
      exprIsYieldReturn = (ref3 = this.expression) != null ? typeof ref3.isYieldReturn === "function" ? ref3.isYieldReturn() : void 0 : void 0;
      if (!exprIsYieldReturn) {
        answer.push(this.makeCode(this.tab + ("return" + (this.expression ? " " : ""))));
      }
      if (this.expression) {
        answer = answer.concat(this.expression.compileToFragments(o, LEVEL_PAREN));
      }
      if (!exprIsYieldReturn) {
        answer.push(this.makeCode(";"));
      }
      return answer;
    };

    return Return;

  })(Base);

  exports.Value = Value = (function(superClass1) {
    extend1(Value, superClass1);

    function Value(base, props, tag) {
      if (!props && base instanceof Value) {
        return base;
      }
      this.base = base;
      this.properties = props || [];
      if (tag) {
        this[tag] = true;
      }
      return this;
    }

    Value.prototype.children = ['base', 'properties'];

    Value.prototype.add = function(props) {
      this.properties = this.properties.concat(props);
      return this;
    };

    Value.prototype.hasProperties = function() {
      return !!this.properties.length;
    };

    Value.prototype.bareLiteral = function(type) {
      return !this.properties.length && this.base instanceof type;
    };

    Value.prototype.isArray = function() {
      return this.bareLiteral(Arr);
    };

    Value.prototype.isRange = function() {
      return this.bareLiteral(Range);
    };

    Value.prototype.isComplex = function() {
      return this.hasProperties() || this.base.isComplex();
    };

    Value.prototype.isAssignable = function() {
      return this.hasProperties() || this.base.isAssignable();
    };

    Value.prototype.isSimpleNumber = function() {
      return this.bareLiteral(Literal) && SIMPLENUM.test(this.base.value);
    };

    Value.prototype.isString = function() {
      return this.bareLiteral(Literal) && IS_STRING.test(this.base.value);
    };

    Value.prototype.isRegex = function() {
      return this.bareLiteral(Literal) && IS_REGEX.test(this.base.value);
    };

    Value.prototype.isAtomic = function() {
      var j, len1, node, ref3;
      ref3 = this.properties.concat(this.base);
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        node = ref3[j];
        if (node.soak || node instanceof Call) {
          return false;
        }
      }
      return true;
    };

    Value.prototype.isNotCallable = function() {
      return this.isSimpleNumber() || this.isString() || this.isRegex() || this.isArray() || this.isRange() || this.isSplice() || this.isObject();
    };

    Value.prototype.isStatement = function(o) {
      return !this.properties.length && this.base.isStatement(o);
    };

    Value.prototype.assigns = function(name) {
      return !this.properties.length && this.base.assigns(name);
    };

    Value.prototype.jumps = function(o) {
      return !this.properties.length && this.base.jumps(o);
    };

    Value.prototype.isObject = function(onlyGenerated) {
      if (this.properties.length) {
        return false;
      }
      return (this.base instanceof Obj) && (!onlyGenerated || this.base.generated);
    };

    Value.prototype.isSplice = function() {
      var lastProp, ref3;
      ref3 = this.properties, lastProp = ref3[ref3.length - 1];
      return lastProp instanceof Slice;
    };

    Value.prototype.looksStatic = function(className) {
      var ref3;
      return this.base.value === className && this.properties.length === 1 && ((ref3 = this.properties[0].name) != null ? ref3.value : void 0) !== 'prototype';
    };

    Value.prototype.unwrap = function() {
      if (this.properties.length) {
        return this;
      } else {
        return this.base;
      }
    };

    Value.prototype.cacheReference = function(o) {
      var base, bref, name, nref, ref3;
      ref3 = this.properties, name = ref3[ref3.length - 1];
      if (this.properties.length < 2 && !this.base.isComplex() && !(name != null ? name.isComplex() : void 0)) {
        return [this, this];
      }
      base = new Value(this.base, this.properties.slice(0, -1));
      if (base.isComplex()) {
        bref = new Literal(o.scope.freeVariable('base'));
        base = new Value(new Parens(new Assign(bref, base)));
      }
      if (!name) {
        return [base, bref];
      }
      if (name.isComplex()) {
        nref = new Literal(o.scope.freeVariable('name'));
        name = new Index(new Assign(nref, name.index));
        nref = new Index(nref);
      }
      return [base.add(name), new Value(bref || base.base, [nref || name])];
    };

    Value.prototype.compileNode = function(o) {
      var fragments, j, len1, prop, props;
      this.base.front = this.front;
      props = this.properties;
      fragments = this.base.compileToFragments(o, (props.length ? LEVEL_ACCESS : null));
      if ((this.base instanceof Parens || props.length) && SIMPLENUM.test(fragmentsToText(fragments))) {
        fragments.push(this.makeCode('.'));
      }
      for (j = 0, len1 = props.length; j < len1; j++) {
        prop = props[j];
        fragments.push.apply(fragments, prop.compileToFragments(o));
      }
      return fragments;
    };

    Value.prototype.unfoldSoak = function(o) {
      return this.unfoldedSoak != null ? this.unfoldedSoak : this.unfoldedSoak = (function(_this) {
        return function() {
          var fst, i, ifn, j, len1, prop, ref, ref3, ref4, snd;
          if (ifn = _this.base.unfoldSoak(o)) {
            (ref3 = ifn.body.properties).push.apply(ref3, _this.properties);
            return ifn;
          }
          ref4 = _this.properties;
          for (i = j = 0, len1 = ref4.length; j < len1; i = ++j) {
            prop = ref4[i];
            if (!prop.soak) {
              continue;
            }
            prop.soak = false;
            fst = new Value(_this.base, _this.properties.slice(0, i));
            snd = new Value(_this.base, _this.properties.slice(i));
            if (fst.isComplex()) {
              ref = new Literal(o.scope.freeVariable('ref'));
              fst = new Parens(new Assign(ref, fst));
              snd.base = ref;
            }
            return new If(new Existence(fst), snd, {
              soak: true
            });
          }
          return false;
        };
      })(this)();
    };

    return Value;

  })(Base);

  exports.Comment = Comment = (function(superClass1) {
    extend1(Comment, superClass1);

    function Comment(comment1) {
      this.comment = comment1;
    }

    Comment.prototype.isStatement = YES;

    Comment.prototype.makeReturn = THIS;

    Comment.prototype.compileNode = function(o, level) {
      var code, comment;
      comment = this.comment.replace(/^(\s*)#(?=\s)/gm, "$1 *");
      code = "/*" + (multident(comment, this.tab)) + (indexOf.call(comment, '\n') >= 0 ? "\n" + this.tab : '') + " */";
      if ((level || o.level) === LEVEL_TOP) {
        code = o.indent + code;
      }
      return [this.makeCode("\n"), this.makeCode(code)];
    };

    return Comment;

  })(Base);

  exports.Call = Call = (function(superClass1) {
    extend1(Call, superClass1);

    function Call(variable, args1, soak) {
      this.args = args1 != null ? args1 : [];
      this.soak = soak;
      this.isNew = false;
      this.isSuper = variable === 'super';
      this.variable = this.isSuper ? null : variable;
      if (variable instanceof Value && variable.isNotCallable()) {
        variable.error("literal is not a function");
      }
    }

    Call.prototype.children = ['variable', 'args'];

    Call.prototype.newInstance = function() {
      var base, ref3;
      base = ((ref3 = this.variable) != null ? ref3.base : void 0) || this.variable;
      if (base instanceof Call && !base.isNew) {
        base.newInstance();
      } else {
        this.isNew = true;
      }
      return this;
    };

    Call.prototype.superReference = function(o) {
      var accesses, base, bref, klass, method, name, nref, variable;
      method = o.scope.namedMethod();
      if (method != null ? method.klass : void 0) {
        klass = method.klass, name = method.name, variable = method.variable;
        if (klass.isComplex()) {
          bref = new Literal(o.scope.parent.freeVariable('base'));
          base = new Value(new Parens(new Assign(bref, klass)));
          variable.base = base;
          variable.properties.splice(0, klass.properties.length);
        }
        if (name.isComplex() || (name instanceof Index && name.index.isAssignable())) {
          nref = new Literal(o.scope.parent.freeVariable('name'));
          name = new Index(new Assign(nref, name.index));
          variable.properties.pop();
          variable.properties.push(name);
        }
        accesses = [new Access(new Literal('__super__'))];
        if (method["static"]) {
          accesses.push(new Access(new Literal('constructor')));
        }
        accesses.push(nref != null ? new Index(nref) : name);
        return (new Value(bref != null ? bref : klass, accesses)).compile(o);
      } else if (method != null ? method.ctor : void 0) {
        return method.name + ".__super__.constructor";
      } else {
        return this.error('cannot call super outside of an instance method.');
      }
    };

    Call.prototype.superThis = function(o) {
      var method;
      method = o.scope.method;
      return (method && !method.klass && method.context) || "this";
    };

    Call.prototype.unfoldSoak = function(o) {
      var call, ifn, j, left, len1, list, ref3, ref4, rite;
      if (this.soak) {
        if (this.variable) {
          if (ifn = unfoldSoak(o, this, 'variable')) {
            return ifn;
          }
          ref3 = new Value(this.variable).cacheReference(o), left = ref3[0], rite = ref3[1];
        } else {
          left = new Literal(this.superReference(o));
          rite = new Value(left);
        }
        rite = new Call(rite, this.args);
        rite.isNew = this.isNew;
        left = new Literal("typeof " + (left.compile(o)) + " === \"function\"");
        return new If(left, new Value(rite), {
          soak: true
        });
      }
      call = this;
      list = [];
      while (true) {
        if (call.variable instanceof Call) {
          list.push(call);
          call = call.variable;
          continue;
        }
        if (!(call.variable instanceof Value)) {
          break;
        }
        list.push(call);
        if (!((call = call.variable.base) instanceof Call)) {
          break;
        }
      }
      ref4 = list.reverse();
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        call = ref4[j];
        if (ifn) {
          if (call.variable instanceof Call) {
            call.variable = ifn;
          } else {
            call.variable.base = ifn;
          }
        }
        ifn = unfoldSoak(o, call, 'variable');
      }
      return ifn;
    };

    Call.prototype.compileNode = function(o) {
      var arg, argIndex, compiledArgs, compiledArray, fragments, j, len1, preface, ref3, ref4;
      if ((ref3 = this.variable) != null) {
        ref3.front = this.front;
      }
      compiledArray = Splat.compileSplattedArray(o, this.args, true);
      if (compiledArray.length) {
        return this.compileSplat(o, compiledArray);
      }
      compiledArgs = [];
      ref4 = this.args;
      for (argIndex = j = 0, len1 = ref4.length; j < len1; argIndex = ++j) {
        arg = ref4[argIndex];
        if (argIndex) {
          compiledArgs.push(this.makeCode(", "));
        }
        compiledArgs.push.apply(compiledArgs, arg.compileToFragments(o, LEVEL_LIST));
      }
      fragments = [];
      if (this.isSuper) {
        preface = this.superReference(o) + (".call(" + (this.superThis(o)));
        if (compiledArgs.length) {
          preface += ", ";
        }
        fragments.push(this.makeCode(preface));
      } else {
        if (this.isNew) {
          fragments.push(this.makeCode('new '));
        }
        fragments.push.apply(fragments, this.variable.compileToFragments(o, LEVEL_ACCESS));
        fragments.push(this.makeCode("("));
      }
      fragments.push.apply(fragments, compiledArgs);
      fragments.push(this.makeCode(")"));
      return fragments;
    };

    Call.prototype.compileSplat = function(o, splatArgs) {
      var answer, base, fun, idt, name, ref;
      if (this.isSuper) {
        return [].concat(this.makeCode((this.superReference(o)) + ".apply(" + (this.superThis(o)) + ", "), splatArgs, this.makeCode(")"));
      }
      if (this.isNew) {
        idt = this.tab + TAB;
        return [].concat(this.makeCode("(function(func, args, ctor) {\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return Object(result) === result ? result : child;\n" + this.tab + "})("), this.variable.compileToFragments(o, LEVEL_LIST), this.makeCode(", "), splatArgs, this.makeCode(", function(){})"));
      }
      answer = [];
      base = new Value(this.variable);
      if ((name = base.properties.pop()) && base.isComplex()) {
        ref = o.scope.freeVariable('ref');
        answer = answer.concat(this.makeCode("(" + ref + " = "), base.compileToFragments(o, LEVEL_LIST), this.makeCode(")"), name.compileToFragments(o));
      } else {
        fun = base.compileToFragments(o, LEVEL_ACCESS);
        if (SIMPLENUM.test(fragmentsToText(fun))) {
          fun = this.wrapInBraces(fun);
        }
        if (name) {
          ref = fragmentsToText(fun);
          fun.push.apply(fun, name.compileToFragments(o));
        } else {
          ref = 'null';
        }
        answer = answer.concat(fun);
      }
      return answer = answer.concat(this.makeCode(".apply(" + ref + ", "), splatArgs, this.makeCode(")"));
    };

    return Call;

  })(Base);

  exports.Extends = Extends = (function(superClass1) {
    extend1(Extends, superClass1);

    function Extends(child1, parent1) {
      this.child = child1;
      this.parent = parent1;
    }

    Extends.prototype.children = ['child', 'parent'];

    Extends.prototype.compileToFragments = function(o) {
      return new Call(new Value(new Literal(utility('extend', o))), [this.child, this.parent]).compileToFragments(o);
    };

    return Extends;

  })(Base);

  exports.Access = Access = (function(superClass1) {
    extend1(Access, superClass1);

    function Access(name1, tag) {
      this.name = name1;
      this.name.asKey = true;
      this.soak = tag === 'soak';
    }

    Access.prototype.children = ['name'];

    Access.prototype.compileToFragments = function(o) {
      var name;
      name = this.name.compileToFragments(o);
      if (IDENTIFIER.test(fragmentsToText(name))) {
        name.unshift(this.makeCode("."));
      } else {
        name.unshift(this.makeCode("["));
        name.push(this.makeCode("]"));
      }
      return name;
    };

    Access.prototype.isComplex = NO;

    return Access;

  })(Base);

  exports.Index = Index = (function(superClass1) {
    extend1(Index, superClass1);

    function Index(index1) {
      this.index = index1;
    }

    Index.prototype.children = ['index'];

    Index.prototype.compileToFragments = function(o) {
      return [].concat(this.makeCode("["), this.index.compileToFragments(o, LEVEL_PAREN), this.makeCode("]"));
    };

    Index.prototype.isComplex = function() {
      return this.index.isComplex();
    };

    return Index;

  })(Base);

  exports.Range = Range = (function(superClass1) {
    extend1(Range, superClass1);

    Range.prototype.children = ['from', 'to'];

    function Range(from1, to1, tag) {
      this.from = from1;
      this.to = to1;
      this.exclusive = tag === 'exclusive';
      this.equals = this.exclusive ? '' : '=';
    }

    Range.prototype.compileVariables = function(o) {
      var isComplex, ref3, ref4, ref5, ref6, step;
      o = merge(o, {
        top: true
      });
      isComplex = del(o, 'isComplex');
      ref3 = this.cacheToCodeFragments(this.from.cache(o, LEVEL_LIST, isComplex)), this.fromC = ref3[0], this.fromVar = ref3[1];
      ref4 = this.cacheToCodeFragments(this.to.cache(o, LEVEL_LIST, isComplex)), this.toC = ref4[0], this.toVar = ref4[1];
      if (step = del(o, 'step')) {
        ref5 = this.cacheToCodeFragments(step.cache(o, LEVEL_LIST, isComplex)), this.step = ref5[0], this.stepVar = ref5[1];
      }
      ref6 = [this.fromVar.match(NUMBER), this.toVar.match(NUMBER)], this.fromNum = ref6[0], this.toNum = ref6[1];
      if (this.stepVar) {
        return this.stepNum = this.stepVar.match(NUMBER);
      }
    };

    Range.prototype.compileNode = function(o) {
      var cond, condPart, from, gt, idx, idxName, known, lt, namedIndex, ref3, ref4, stepPart, to, varPart;
      if (!this.fromVar) {
        this.compileVariables(o);
      }
      if (!o.index) {
        return this.compileArray(o);
      }
      known = this.fromNum && this.toNum;
      idx = del(o, 'index');
      idxName = del(o, 'name');
      namedIndex = idxName && idxName !== idx;
      varPart = idx + " = " + this.fromC;
      if (this.toC !== this.toVar) {
        varPart += ", " + this.toC;
      }
      if (this.step !== this.stepVar) {
        varPart += ", " + this.step;
      }
      ref3 = [idx + " <" + this.equals, idx + " >" + this.equals], lt = ref3[0], gt = ref3[1];
      condPart = this.stepNum ? parseNum(this.stepNum[0]) > 0 ? lt + " " + this.toVar : gt + " " + this.toVar : known ? ((ref4 = [parseNum(this.fromNum[0]), parseNum(this.toNum[0])], from = ref4[0], to = ref4[1], ref4), from <= to ? lt + " " + to : gt + " " + to) : (cond = this.stepVar ? this.stepVar + " > 0" : this.fromVar + " <= " + this.toVar, cond + " ? " + lt + " " + this.toVar + " : " + gt + " " + this.toVar);
      stepPart = this.stepVar ? idx + " += " + this.stepVar : known ? namedIndex ? from <= to ? "++" + idx : "--" + idx : from <= to ? idx + "++" : idx + "--" : namedIndex ? cond + " ? ++" + idx + " : --" + idx : cond + " ? " + idx + "++ : " + idx + "--";
      if (namedIndex) {
        varPart = idxName + " = " + varPart;
      }
      if (namedIndex) {
        stepPart = idxName + " = " + stepPart;
      }
      return [this.makeCode(varPart + "; " + condPart + "; " + stepPart)];
    };

    Range.prototype.compileArray = function(o) {
      var args, body, cond, hasArgs, i, idt, j, post, pre, range, ref3, ref4, result, results, vars;
      if (this.fromNum && this.toNum && Math.abs(this.fromNum - this.toNum) <= 20) {
        range = (function() {
          results = [];
          for (var j = ref3 = +this.fromNum, ref4 = +this.toNum; ref3 <= ref4 ? j <= ref4 : j >= ref4; ref3 <= ref4 ? j++ : j--){ results.push(j); }
          return results;
        }).apply(this);
        if (this.exclusive) {
          range.pop();
        }
        return [this.makeCode("[" + (range.join(', ')) + "]")];
      }
      idt = this.tab + TAB;
      i = o.scope.freeVariable('i', {
        single: true
      });
      result = o.scope.freeVariable('results');
      pre = "\n" + idt + result + " = [];";
      if (this.fromNum && this.toNum) {
        o.index = i;
        body = fragmentsToText(this.compileNode(o));
      } else {
        vars = (i + " = " + this.fromC) + (this.toC !== this.toVar ? ", " + this.toC : '');
        cond = this.fromVar + " <= " + this.toVar;
        body = "var " + vars + "; " + cond + " ? " + i + " <" + this.equals + " " + this.toVar + " : " + i + " >" + this.equals + " " + this.toVar + "; " + cond + " ? " + i + "++ : " + i + "--";
      }
      post = "{ " + result + ".push(" + i + "); }\n" + idt + "return " + result + ";\n" + o.indent;
      hasArgs = function(node) {
        return node != null ? node.contains(isLiteralArguments) : void 0;
      };
      if (hasArgs(this.from) || hasArgs(this.to)) {
        args = ', arguments';
      }
      return [this.makeCode("(function() {" + pre + "\n" + idt + "for (" + body + ")" + post + "}).apply(this" + (args != null ? args : '') + ")")];
    };

    return Range;

  })(Base);

  exports.Slice = Slice = (function(superClass1) {
    extend1(Slice, superClass1);

    Slice.prototype.children = ['range'];

    function Slice(range1) {
      this.range = range1;
      Slice.__super__.constructor.call(this);
    }

    Slice.prototype.compileNode = function(o) {
      var compiled, compiledText, from, fromCompiled, ref3, to, toStr;
      ref3 = this.range, to = ref3.to, from = ref3.from;
      fromCompiled = from && from.compileToFragments(o, LEVEL_PAREN) || [this.makeCode('0')];
      if (to) {
        compiled = to.compileToFragments(o, LEVEL_PAREN);
        compiledText = fragmentsToText(compiled);
        if (!(!this.range.exclusive && +compiledText === -1)) {
          toStr = ', ' + (this.range.exclusive ? compiledText : SIMPLENUM.test(compiledText) ? "" + (+compiledText + 1) : (compiled = to.compileToFragments(o, LEVEL_ACCESS), "+" + (fragmentsToText(compiled)) + " + 1 || 9e9"));
        }
      }
      return [this.makeCode(".slice(" + (fragmentsToText(fromCompiled)) + (toStr || '') + ")")];
    };

    return Slice;

  })(Base);

  exports.Obj = Obj = (function(superClass1) {
    extend1(Obj, superClass1);

    function Obj(props, generated) {
      this.generated = generated != null ? generated : false;
      this.objects = this.properties = props || [];
    }

    Obj.prototype.children = ['properties'];

    Obj.prototype.compileNode = function(o) {
      var answer, dynamicIndex, hasDynamic, i, idt, indent, j, join, k, key, l, lastNoncom, len1, len2, len3, node, oref, prop, props, ref3, value;
      props = this.properties;
      if (this.generated) {
        for (j = 0, len1 = props.length; j < len1; j++) {
          node = props[j];
          if (node instanceof Value) {
            node.error('cannot have an implicit value in an implicit object');
          }
        }
      }
      for (dynamicIndex = k = 0, len2 = props.length; k < len2; dynamicIndex = ++k) {
        prop = props[dynamicIndex];
        if ((prop.variable || prop).base instanceof Parens) {
          break;
        }
      }
      hasDynamic = dynamicIndex < props.length;
      idt = o.indent += TAB;
      lastNoncom = this.lastNonComment(this.properties);
      answer = [];
      if (hasDynamic) {
        oref = o.scope.freeVariable('obj');
        answer.push(this.makeCode("(\n" + idt + oref + " = "));
      }
      answer.push(this.makeCode("{" + (props.length === 0 || dynamicIndex === 0 ? '}' : '\n')));
      for (i = l = 0, len3 = props.length; l < len3; i = ++l) {
        prop = props[i];
        if (i === dynamicIndex) {
          if (i !== 0) {
            answer.push(this.makeCode("\n" + idt + "}"));
          }
          answer.push(this.makeCode(',\n'));
        }
        join = i === props.length - 1 || i === dynamicIndex - 1 ? '' : prop === lastNoncom || prop instanceof Comment ? '\n' : ',\n';
        indent = prop instanceof Comment ? '' : idt;
        if (hasDynamic && i < dynamicIndex) {
          indent += TAB;
        }
        if (prop instanceof Assign) {
          if (prop.context !== 'object') {
            prop.operatorToken.error("unexpected " + prop.operatorToken.value);
          }
          if (prop.variable instanceof Value && prop.variable.hasProperties()) {
            prop.variable.error('invalid object key');
          }
        }
        if (prop instanceof Value && prop["this"]) {
          prop = new Assign(prop.properties[0].name, prop, 'object');
        }
        if (!(prop instanceof Comment)) {
          if (i < dynamicIndex) {
            if (!(prop instanceof Assign)) {
              prop = new Assign(prop, prop, 'object');
            }
            (prop.variable.base || prop.variable).asKey = true;
          } else {
            if (prop instanceof Assign) {
              key = prop.variable;
              value = prop.value;
            } else {
              ref3 = prop.base.cache(o), key = ref3[0], value = ref3[1];
            }
            prop = new Assign(new Value(new Literal(oref), [new Access(key)]), value);
          }
        }
        if (indent) {
          answer.push(this.makeCode(indent));
        }
        answer.push.apply(answer, prop.compileToFragments(o, LEVEL_TOP));
        if (join) {
          answer.push(this.makeCode(join));
        }
      }
      if (hasDynamic) {
        answer.push(this.makeCode(",\n" + idt + oref + "\n" + this.tab + ")"));
      } else {
        if (props.length !== 0) {
          answer.push(this.makeCode("\n" + this.tab + "}"));
        }
      }
      if (this.front && !hasDynamic) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    Obj.prototype.assigns = function(name) {
      var j, len1, prop, ref3;
      ref3 = this.properties;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        prop = ref3[j];
        if (prop.assigns(name)) {
          return true;
        }
      }
      return false;
    };

    return Obj;

  })(Base);

  exports.Arr = Arr = (function(superClass1) {
    extend1(Arr, superClass1);

    function Arr(objs) {
      this.objects = objs || [];
    }

    Arr.prototype.children = ['objects'];

    Arr.prototype.compileNode = function(o) {
      var answer, compiledObjs, fragments, index, j, len1, obj;
      if (!this.objects.length) {
        return [this.makeCode('[]')];
      }
      o.indent += TAB;
      answer = Splat.compileSplattedArray(o, this.objects);
      if (answer.length) {
        return answer;
      }
      answer = [];
      compiledObjs = (function() {
        var j, len1, ref3, results;
        ref3 = this.objects;
        results = [];
        for (j = 0, len1 = ref3.length; j < len1; j++) {
          obj = ref3[j];
          results.push(obj.compileToFragments(o, LEVEL_LIST));
        }
        return results;
      }).call(this);
      for (index = j = 0, len1 = compiledObjs.length; j < len1; index = ++j) {
        fragments = compiledObjs[index];
        if (index) {
          answer.push(this.makeCode(", "));
        }
        answer.push.apply(answer, fragments);
      }
      if (fragmentsToText(answer).indexOf('\n') >= 0) {
        answer.unshift(this.makeCode("[\n" + o.indent));
        answer.push(this.makeCode("\n" + this.tab + "]"));
      } else {
        answer.unshift(this.makeCode("["));
        answer.push(this.makeCode("]"));
      }
      return answer;
    };

    Arr.prototype.assigns = function(name) {
      var j, len1, obj, ref3;
      ref3 = this.objects;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        obj = ref3[j];
        if (obj.assigns(name)) {
          return true;
        }
      }
      return false;
    };

    return Arr;

  })(Base);

  exports.Class = Class = (function(superClass1) {
    extend1(Class, superClass1);

    function Class(variable1, parent1, body1) {
      this.variable = variable1;
      this.parent = parent1;
      this.body = body1 != null ? body1 : new Block;
      this.boundFuncs = [];
      this.body.classBody = true;
    }

    Class.prototype.children = ['variable', 'parent', 'body'];

    Class.prototype.determineName = function() {
      var decl, ref3, tail;
      if (!this.variable) {
        return null;
      }
      ref3 = this.variable.properties, tail = ref3[ref3.length - 1];
      decl = tail ? tail instanceof Access && tail.name.value : this.variable.base.value;
      if (indexOf.call(STRICT_PROSCRIBED, decl) >= 0) {
        this.variable.error("class variable name may not be " + decl);
      }
      return decl && (decl = IDENTIFIER.test(decl) && decl);
    };

    Class.prototype.setContext = function(name) {
      return this.body.traverseChildren(false, function(node) {
        if (node.classBody) {
          return false;
        }
        if (node instanceof Literal && node.value === 'this') {
          return node.value = name;
        } else if (node instanceof Code) {
          if (node.bound) {
            return node.context = name;
          }
        }
      });
    };

    Class.prototype.addBoundFunctions = function(o) {
      var bvar, j, len1, lhs, ref3;
      ref3 = this.boundFuncs;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        bvar = ref3[j];
        lhs = (new Value(new Literal("this"), [new Access(bvar)])).compile(o);
        this.ctor.body.unshift(new Literal(lhs + " = " + (utility('bind', o)) + "(" + lhs + ", this)"));
      }
    };

    Class.prototype.addProperties = function(node, name, o) {
      var acc, assign, base, exprs, func, props;
      props = node.base.properties.slice(0);
      exprs = (function() {
        var results;
        results = [];
        while (assign = props.shift()) {
          if (assign instanceof Assign) {
            base = assign.variable.base;
            delete assign.context;
            func = assign.value;
            if (base.value === 'constructor') {
              if (this.ctor) {
                assign.error('cannot define more than one constructor in a class');
              }
              if (func.bound) {
                assign.error('cannot define a constructor as a bound function');
              }
              if (func instanceof Code) {
                assign = this.ctor = func;
              } else {
                this.externalCtor = o.classScope.freeVariable('class');
                assign = new Assign(new Literal(this.externalCtor), func);
              }
            } else {
              if (assign.variable["this"]) {
                func["static"] = true;
              } else {
                acc = base.isComplex() ? new Index(base) : new Access(base);
                assign.variable = new Value(new Literal(name), [new Access(new Literal('prototype')), acc]);
                if (func instanceof Code && func.bound) {
                  this.boundFuncs.push(base);
                  func.bound = false;
                }
              }
            }
          }
          results.push(assign);
        }
        return results;
      }).call(this);
      return compact(exprs);
    };

    Class.prototype.walkBody = function(name, o) {
      return this.traverseChildren(false, (function(_this) {
        return function(child) {
          var cont, exps, i, j, len1, node, ref3;
          cont = true;
          if (child instanceof Class) {
            return false;
          }
          if (child instanceof Block) {
            ref3 = exps = child.expressions;
            for (i = j = 0, len1 = ref3.length; j < len1; i = ++j) {
              node = ref3[i];
              if (node instanceof Assign && node.variable.looksStatic(name)) {
                node.value["static"] = true;
              } else if (node instanceof Value && node.isObject(true)) {
                cont = false;
                exps[i] = _this.addProperties(node, name, o);
              }
            }
            child.expressions = exps = flatten(exps);
          }
          return cont && !(child instanceof Class);
        };
      })(this));
    };

    Class.prototype.hoistDirectivePrologue = function() {
      var expressions, index, node;
      index = 0;
      expressions = this.body.expressions;
      while ((node = expressions[index]) && node instanceof Comment || node instanceof Value && node.isString()) {
        ++index;
      }
      return this.directives = expressions.splice(0, index);
    };

    Class.prototype.ensureConstructor = function(name) {
      if (!this.ctor) {
        this.ctor = new Code;
        if (this.externalCtor) {
          this.ctor.body.push(new Literal(this.externalCtor + ".apply(this, arguments)"));
        } else if (this.parent) {
          this.ctor.body.push(new Literal(name + ".__super__.constructor.apply(this, arguments)"));
        }
        this.ctor.body.makeReturn();
        this.body.expressions.unshift(this.ctor);
      }
      this.ctor.ctor = this.ctor.name = name;
      this.ctor.klass = null;
      return this.ctor.noReturn = true;
    };

    Class.prototype.compileNode = function(o) {
      var args, argumentsNode, func, jumpNode, klass, lname, name, ref3, superClass;
      if (jumpNode = this.body.jumps()) {
        jumpNode.error('Class bodies cannot contain pure statements');
      }
      if (argumentsNode = this.body.contains(isLiteralArguments)) {
        argumentsNode.error("Class bodies shouldn't reference arguments");
      }
      name = this.determineName() || '_Class';
      if (name.reserved) {
        name = "_" + name;
      }
      lname = new Literal(name);
      func = new Code([], Block.wrap([this.body]));
      args = [];
      o.classScope = func.makeScope(o.scope);
      this.hoistDirectivePrologue();
      this.setContext(name);
      this.walkBody(name, o);
      this.ensureConstructor(name);
      this.addBoundFunctions(o);
      this.body.spaced = true;
      this.body.expressions.push(lname);
      if (this.parent) {
        superClass = new Literal(o.classScope.freeVariable('superClass', {
          reserve: false
        }));
        this.body.expressions.unshift(new Extends(lname, superClass));
        func.params.push(new Param(superClass));
        args.push(this.parent);
      }
      (ref3 = this.body.expressions).unshift.apply(ref3, this.directives);
      klass = new Parens(new Call(func, args));
      if (this.variable) {
        klass = new Assign(this.variable, klass);
      }
      return klass.compileToFragments(o);
    };

    return Class;

  })(Base);

  exports.Assign = Assign = (function(superClass1) {
    extend1(Assign, superClass1);

    function Assign(variable1, value1, context, options) {
      var forbidden, name, ref3;
      this.variable = variable1;
      this.value = value1;
      this.context = context;
      if (options == null) {
        options = {};
      }
      this.param = options.param, this.subpattern = options.subpattern, this.operatorToken = options.operatorToken;
      forbidden = (ref3 = (name = this.variable.unwrapAll().value), indexOf.call(STRICT_PROSCRIBED, ref3) >= 0);
      if (forbidden && this.context !== 'object') {
        this.variable.error("variable name may not be \"" + name + "\"");
      }
    }

    Assign.prototype.children = ['variable', 'value'];

    Assign.prototype.isStatement = function(o) {
      return (o != null ? o.level : void 0) === LEVEL_TOP && (this.context != null) && indexOf.call(this.context, "?") >= 0;
    };

    Assign.prototype.assigns = function(name) {
      return this[this.context === 'object' ? 'value' : 'variable'].assigns(name);
    };

    Assign.prototype.unfoldSoak = function(o) {
      return unfoldSoak(o, this, 'variable');
    };

    Assign.prototype.compileNode = function(o) {
      var answer, compiledName, isValue, j, name, properties, prototype, ref3, ref4, ref5, ref6, ref7, val, varBase;
      if (isValue = this.variable instanceof Value) {
        if (this.variable.isArray() || this.variable.isObject()) {
          return this.compilePatternMatch(o);
        }
        if (this.variable.isSplice()) {
          return this.compileSplice(o);
        }
        if ((ref3 = this.context) === '||=' || ref3 === '&&=' || ref3 === '?=') {
          return this.compileConditional(o);
        }
        if ((ref4 = this.context) === '**=' || ref4 === '//=' || ref4 === '%%=') {
          return this.compileSpecialMath(o);
        }
      }
      if (this.value instanceof Code) {
        if (this.value["static"]) {
          this.value.klass = this.variable.base;
          this.value.name = this.variable.properties[0];
          this.value.variable = this.variable;
        } else if (((ref5 = this.variable.properties) != null ? ref5.length : void 0) >= 2) {
          ref6 = this.variable.properties, properties = 3 <= ref6.length ? slice.call(ref6, 0, j = ref6.length - 2) : (j = 0, []), prototype = ref6[j++], name = ref6[j++];
          if (((ref7 = prototype.name) != null ? ref7.value : void 0) === 'prototype') {
            this.value.klass = new Value(this.variable.base, properties);
            this.value.name = name;
            this.value.variable = this.variable;
          }
        }
      }
      if (!this.context) {
        varBase = this.variable.unwrapAll();
        if (!varBase.isAssignable()) {
          this.variable.error("\"" + (this.variable.compile(o)) + "\" cannot be assigned");
        }
        if (!(typeof varBase.hasProperties === "function" ? varBase.hasProperties() : void 0)) {
          if (this.param) {
            o.scope.add(varBase.value, 'var');
          } else {
            o.scope.find(varBase.value);
          }
        }
      }
      val = this.value.compileToFragments(o, LEVEL_LIST);
      if (isValue && this.variable.base instanceof Obj) {
        this.variable.front = true;
      }
      compiledName = this.variable.compileToFragments(o, LEVEL_LIST);
      if (this.context === 'object') {
        return compiledName.concat(this.makeCode(": "), val);
      }
      answer = compiledName.concat(this.makeCode(" " + (this.context || '=') + " "), val);
      if (o.level <= LEVEL_LIST) {
        return answer;
      } else {
        return this.wrapInBraces(answer);
      }
    };

    Assign.prototype.compilePatternMatch = function(o) {
      var acc, assigns, code, defaultValue, expandedIdx, fragments, i, idx, isObject, ivar, j, len1, name, obj, objects, olen, ref, ref3, ref4, ref5, ref6, ref7, rest, top, val, value, vvar, vvarText;
      top = o.level === LEVEL_TOP;
      value = this.value;
      objects = this.variable.base.objects;
      if (!(olen = objects.length)) {
        code = value.compileToFragments(o);
        if (o.level >= LEVEL_OP) {
          return this.wrapInBraces(code);
        } else {
          return code;
        }
      }
      obj = objects[0];
      if (olen === 1 && obj instanceof Expansion) {
        obj.error('Destructuring assignment has no target');
      }
      isObject = this.variable.isObject();
      if (top && olen === 1 && !(obj instanceof Splat)) {
        defaultValue = null;
        if (obj instanceof Assign && obj.context === 'object') {
          ref3 = obj, (ref4 = ref3.variable, idx = ref4.base), obj = ref3.value;
          if (obj instanceof Assign) {
            defaultValue = obj.value;
            obj = obj.variable;
          }
        } else {
          if (obj instanceof Assign) {
            defaultValue = obj.value;
            obj = obj.variable;
          }
          idx = isObject ? obj["this"] ? obj.properties[0].name : obj : new Literal(0);
        }
        acc = IDENTIFIER.test(idx.unwrap().value);
        value = new Value(value);
        value.properties.push(new (acc ? Access : Index)(idx));
        if (ref5 = obj.unwrap().value, indexOf.call(RESERVED, ref5) >= 0) {
          obj.error("assignment to a reserved word: " + (obj.compile(o)));
        }
        if (defaultValue) {
          value = new Op('?', value, defaultValue);
        }
        return new Assign(obj, value, null, {
          param: this.param
        }).compileToFragments(o, LEVEL_TOP);
      }
      vvar = value.compileToFragments(o, LEVEL_LIST);
      vvarText = fragmentsToText(vvar);
      assigns = [];
      expandedIdx = false;
      if (!IDENTIFIER.test(vvarText) || this.variable.assigns(vvarText)) {
        assigns.push([this.makeCode((ref = o.scope.freeVariable('ref')) + " = ")].concat(slice.call(vvar)));
        vvar = [this.makeCode(ref)];
        vvarText = ref;
      }
      for (i = j = 0, len1 = objects.length; j < len1; i = ++j) {
        obj = objects[i];
        idx = i;
        if (!expandedIdx && obj instanceof Splat) {
          name = obj.name.unwrap().value;
          obj = obj.unwrap();
          val = olen + " <= " + vvarText + ".length ? " + (utility('slice', o)) + ".call(" + vvarText + ", " + i;
          if (rest = olen - i - 1) {
            ivar = o.scope.freeVariable('i', {
              single: true
            });
            val += ", " + ivar + " = " + vvarText + ".length - " + rest + ") : (" + ivar + " = " + i + ", [])";
          } else {
            val += ") : []";
          }
          val = new Literal(val);
          expandedIdx = ivar + "++";
        } else if (!expandedIdx && obj instanceof Expansion) {
          if (rest = olen - i - 1) {
            if (rest === 1) {
              expandedIdx = vvarText + ".length - 1";
            } else {
              ivar = o.scope.freeVariable('i', {
                single: true
              });
              val = new Literal(ivar + " = " + vvarText + ".length - " + rest);
              expandedIdx = ivar + "++";
              assigns.push(val.compileToFragments(o, LEVEL_LIST));
            }
          }
          continue;
        } else {
          if (obj instanceof Splat || obj instanceof Expansion) {
            obj.error("multiple splats/expansions are disallowed in an assignment");
          }
          defaultValue = null;
          if (obj instanceof Assign && obj.context === 'object') {
            ref6 = obj, (ref7 = ref6.variable, idx = ref7.base), obj = ref6.value;
            if (obj instanceof Assign) {
              defaultValue = obj.value;
              obj = obj.variable;
            }
          } else {
            if (obj instanceof Assign) {
              defaultValue = obj.value;
              obj = obj.variable;
            }
            idx = isObject ? obj["this"] ? obj.properties[0].name : obj : new Literal(expandedIdx || idx);
          }
          name = obj.unwrap().value;
          acc = IDENTIFIER.test(idx.unwrap().value);
          val = new Value(new Literal(vvarText), [new (acc ? Access : Index)(idx)]);
          if (defaultValue) {
            val = new Op('?', val, defaultValue);
          }
        }
        if ((name != null) && indexOf.call(RESERVED, name) >= 0) {
          obj.error("assignment to a reserved word: " + (obj.compile(o)));
        }
        assigns.push(new Assign(obj, val, null, {
          param: this.param,
          subpattern: true
        }).compileToFragments(o, LEVEL_LIST));
      }
      if (!(top || this.subpattern)) {
        assigns.push(vvar);
      }
      fragments = this.joinFragmentArrays(assigns, ', ');
      if (o.level < LEVEL_LIST) {
        return fragments;
      } else {
        return this.wrapInBraces(fragments);
      }
    };

    Assign.prototype.compileConditional = function(o) {
      var fragments, left, ref3, right;
      ref3 = this.variable.cacheReference(o), left = ref3[0], right = ref3[1];
      if (!left.properties.length && left.base instanceof Literal && left.base.value !== "this" && !o.scope.check(left.base.value)) {
        this.variable.error("the variable \"" + left.base.value + "\" can't be assigned with " + this.context + " because it has not been declared before");
      }
      if (indexOf.call(this.context, "?") >= 0) {
        o.isExistentialEquals = true;
        return new If(new Existence(left), right, {
          type: 'if'
        }).addElse(new Assign(right, this.value, '=')).compileToFragments(o);
      } else {
        fragments = new Op(this.context.slice(0, -1), left, new Assign(right, this.value, '=')).compileToFragments(o);
        if (o.level <= LEVEL_LIST) {
          return fragments;
        } else {
          return this.wrapInBraces(fragments);
        }
      }
    };

    Assign.prototype.compileSpecialMath = function(o) {
      var left, ref3, right;
      ref3 = this.variable.cacheReference(o), left = ref3[0], right = ref3[1];
      return new Assign(left, new Op(this.context.slice(0, -1), right, this.value)).compileToFragments(o);
    };

    Assign.prototype.compileSplice = function(o) {
      var answer, exclusive, from, fromDecl, fromRef, name, ref3, ref4, ref5, to, valDef, valRef;
      ref3 = this.variable.properties.pop().range, from = ref3.from, to = ref3.to, exclusive = ref3.exclusive;
      name = this.variable.compile(o);
      if (from) {
        ref4 = this.cacheToCodeFragments(from.cache(o, LEVEL_OP)), fromDecl = ref4[0], fromRef = ref4[1];
      } else {
        fromDecl = fromRef = '0';
      }
      if (to) {
        if (from instanceof Value && from.isSimpleNumber() && to instanceof Value && to.isSimpleNumber()) {
          to = to.compile(o) - fromRef;
          if (!exclusive) {
            to += 1;
          }
        } else {
          to = to.compile(o, LEVEL_ACCESS) + ' - ' + fromRef;
          if (!exclusive) {
            to += ' + 1';
          }
        }
      } else {
        to = "9e9";
      }
      ref5 = this.value.cache(o, LEVEL_LIST), valDef = ref5[0], valRef = ref5[1];
      answer = [].concat(this.makeCode("[].splice.apply(" + name + ", [" + fromDecl + ", " + to + "].concat("), valDef, this.makeCode(")), "), valRef);
      if (o.level > LEVEL_TOP) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    return Assign;

  })(Base);

  exports.Code = Code = (function(superClass1) {
    extend1(Code, superClass1);

    function Code(params, body, tag) {
      this.params = params || [];
      this.body = body || new Block;
      this.bound = tag === 'boundfunc';
      this.isGenerator = !!this.body.contains(function(node) {
        var ref3;
        return node instanceof Op && ((ref3 = node.operator) === 'yield' || ref3 === 'yield*');
      });
    }

    Code.prototype.children = ['params', 'body'];

    Code.prototype.isStatement = function() {
      return !!this.ctor;
    };

    Code.prototype.jumps = NO;

    Code.prototype.makeScope = function(parentScope) {
      return new Scope(parentScope, this.body, this);
    };

    Code.prototype.compileNode = function(o) {
      var answer, boundfunc, code, exprs, i, j, k, l, len1, len2, len3, len4, len5, len6, lit, m, p, param, params, q, r, ref, ref3, ref4, ref5, ref6, ref7, ref8, splats, uniqs, val, wasEmpty, wrapper;
      if (this.bound && ((ref3 = o.scope.method) != null ? ref3.bound : void 0)) {
        this.context = o.scope.method.context;
      }
      if (this.bound && !this.context) {
        this.context = '_this';
        wrapper = new Code([new Param(new Literal(this.context))], new Block([this]));
        boundfunc = new Call(wrapper, [new Literal('this')]);
        boundfunc.updateLocationDataIfMissing(this.locationData);
        return boundfunc.compileNode(o);
      }
      o.scope = del(o, 'classScope') || this.makeScope(o.scope);
      o.scope.shared = del(o, 'sharedScope');
      o.indent += TAB;
      delete o.bare;
      delete o.isExistentialEquals;
      params = [];
      exprs = [];
      ref4 = this.params;
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        param = ref4[j];
        if (!(param instanceof Expansion)) {
          o.scope.parameter(param.asReference(o));
        }
      }
      ref5 = this.params;
      for (k = 0, len2 = ref5.length; k < len2; k++) {
        param = ref5[k];
        if (!(param.splat || param instanceof Expansion)) {
          continue;
        }
        ref6 = this.params;
        for (l = 0, len3 = ref6.length; l < len3; l++) {
          p = ref6[l];
          if (!(p instanceof Expansion) && p.name.value) {
            o.scope.add(p.name.value, 'var', true);
          }
        }
        splats = new Assign(new Value(new Arr((function() {
          var len4, m, ref7, results;
          ref7 = this.params;
          results = [];
          for (m = 0, len4 = ref7.length; m < len4; m++) {
            p = ref7[m];
            results.push(p.asReference(o));
          }
          return results;
        }).call(this))), new Value(new Literal('arguments')));
        break;
      }
      ref7 = this.params;
      for (m = 0, len4 = ref7.length; m < len4; m++) {
        param = ref7[m];
        if (param.isComplex()) {
          val = ref = param.asReference(o);
          if (param.value) {
            val = new Op('?', ref, param.value);
          }
          exprs.push(new Assign(new Value(param.name), val, '=', {
            param: true
          }));
        } else {
          ref = param;
          if (param.value) {
            lit = new Literal(ref.name.value + ' == null');
            val = new Assign(new Value(param.name), param.value, '=');
            exprs.push(new If(lit, val));
          }
        }
        if (!splats) {
          params.push(ref);
        }
      }
      wasEmpty = this.body.isEmpty();
      if (splats) {
        exprs.unshift(splats);
      }
      if (exprs.length) {
        (ref8 = this.body.expressions).unshift.apply(ref8, exprs);
      }
      for (i = q = 0, len5 = params.length; q < len5; i = ++q) {
        p = params[i];
        params[i] = p.compileToFragments(o);
        o.scope.parameter(fragmentsToText(params[i]));
      }
      uniqs = [];
      this.eachParamName(function(name, node) {
        if (indexOf.call(uniqs, name) >= 0) {
          node.error("multiple parameters named " + name);
        }
        return uniqs.push(name);
      });
      if (!(wasEmpty || this.noReturn)) {
        this.body.makeReturn();
      }
      code = 'function';
      if (this.isGenerator) {
        code += '*';
      }
      if (this.ctor) {
        code += ' ' + this.name;
      }
      code += '(';
      answer = [this.makeCode(code)];
      for (i = r = 0, len6 = params.length; r < len6; i = ++r) {
        p = params[i];
        if (i) {
          answer.push(this.makeCode(", "));
        }
        answer.push.apply(answer, p);
      }
      answer.push(this.makeCode(') {'));
      if (!this.body.isEmpty()) {
        answer = answer.concat(this.makeCode("\n"), this.body.compileWithDeclarations(o), this.makeCode("\n" + this.tab));
      }
      answer.push(this.makeCode('}'));
      if (this.ctor) {
        return [this.makeCode(this.tab)].concat(slice.call(answer));
      }
      if (this.front || (o.level >= LEVEL_ACCESS)) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    Code.prototype.eachParamName = function(iterator) {
      var j, len1, param, ref3, results;
      ref3 = this.params;
      results = [];
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        param = ref3[j];
        results.push(param.eachName(iterator));
      }
      return results;
    };

    Code.prototype.traverseChildren = function(crossScope, func) {
      if (crossScope) {
        return Code.__super__.traverseChildren.call(this, crossScope, func);
      }
    };

    return Code;

  })(Base);

  exports.Param = Param = (function(superClass1) {
    extend1(Param, superClass1);

    function Param(name1, value1, splat) {
      var name, ref3, token;
      this.name = name1;
      this.value = value1;
      this.splat = splat;
      if (ref3 = (name = this.name.unwrapAll().value), indexOf.call(STRICT_PROSCRIBED, ref3) >= 0) {
        this.name.error("parameter name \"" + name + "\" is not allowed");
      }
      if (this.name instanceof Obj && this.name.generated) {
        token = this.name.objects[0].operatorToken;
        token.error("unexpected " + token.value);
      }
    }

    Param.prototype.children = ['name', 'value'];

    Param.prototype.compileToFragments = function(o) {
      return this.name.compileToFragments(o, LEVEL_LIST);
    };

    Param.prototype.asReference = function(o) {
      var name, node;
      if (this.reference) {
        return this.reference;
      }
      node = this.name;
      if (node["this"]) {
        name = node.properties[0].name.value;
        if (name.reserved) {
          name = "_" + name;
        }
        node = new Literal(o.scope.freeVariable(name));
      } else if (node.isComplex()) {
        node = new Literal(o.scope.freeVariable('arg'));
      }
      node = new Value(node);
      if (this.splat) {
        node = new Splat(node);
      }
      node.updateLocationDataIfMissing(this.locationData);
      return this.reference = node;
    };

    Param.prototype.isComplex = function() {
      return this.name.isComplex();
    };

    Param.prototype.eachName = function(iterator, name) {
      var atParam, j, len1, node, obj, ref3;
      if (name == null) {
        name = this.name;
      }
      atParam = function(obj) {
        return iterator("@" + obj.properties[0].name.value, obj);
      };
      if (name instanceof Literal) {
        return iterator(name.value, name);
      }
      if (name instanceof Value) {
        return atParam(name);
      }
      ref3 = name.objects;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        obj = ref3[j];
        if (obj instanceof Assign && (obj.context == null)) {
          obj = obj.variable;
        }
        if (obj instanceof Assign) {
          this.eachName(iterator, obj.value.unwrap());
        } else if (obj instanceof Splat) {
          node = obj.name.unwrap();
          iterator(node.value, node);
        } else if (obj instanceof Value) {
          if (obj.isArray() || obj.isObject()) {
            this.eachName(iterator, obj.base);
          } else if (obj["this"]) {
            atParam(obj);
          } else {
            iterator(obj.base.value, obj.base);
          }
        } else if (!(obj instanceof Expansion)) {
          obj.error("illegal parameter " + (obj.compile()));
        }
      }
    };

    return Param;

  })(Base);

  exports.Splat = Splat = (function(superClass1) {
    extend1(Splat, superClass1);

    Splat.prototype.children = ['name'];

    Splat.prototype.isAssignable = YES;

    function Splat(name) {
      this.name = name.compile ? name : new Literal(name);
    }

    Splat.prototype.assigns = function(name) {
      return this.name.assigns(name);
    };

    Splat.prototype.compileToFragments = function(o) {
      return this.name.compileToFragments(o);
    };

    Splat.prototype.unwrap = function() {
      return this.name;
    };

    Splat.compileSplattedArray = function(o, list, apply) {
      var args, base, compiledNode, concatPart, fragments, i, index, j, last, len1, node;
      index = -1;
      while ((node = list[++index]) && !(node instanceof Splat)) {
        continue;
      }
      if (index >= list.length) {
        return [];
      }
      if (list.length === 1) {
        node = list[0];
        fragments = node.compileToFragments(o, LEVEL_LIST);
        if (apply) {
          return fragments;
        }
        return [].concat(node.makeCode((utility('slice', o)) + ".call("), fragments, node.makeCode(")"));
      }
      args = list.slice(index);
      for (i = j = 0, len1 = args.length; j < len1; i = ++j) {
        node = args[i];
        compiledNode = node.compileToFragments(o, LEVEL_LIST);
        args[i] = node instanceof Splat ? [].concat(node.makeCode((utility('slice', o)) + ".call("), compiledNode, node.makeCode(")")) : [].concat(node.makeCode("["), compiledNode, node.makeCode("]"));
      }
      if (index === 0) {
        node = list[0];
        concatPart = node.joinFragmentArrays(args.slice(1), ', ');
        return args[0].concat(node.makeCode(".concat("), concatPart, node.makeCode(")"));
      }
      base = (function() {
        var k, len2, ref3, results;
        ref3 = list.slice(0, index);
        results = [];
        for (k = 0, len2 = ref3.length; k < len2; k++) {
          node = ref3[k];
          results.push(node.compileToFragments(o, LEVEL_LIST));
        }
        return results;
      })();
      base = list[0].joinFragmentArrays(base, ', ');
      concatPart = list[index].joinFragmentArrays(args, ', ');
      last = list[list.length - 1];
      return [].concat(list[0].makeCode("["), base, list[index].makeCode("].concat("), concatPart, last.makeCode(")"));
    };

    return Splat;

  })(Base);

  exports.Expansion = Expansion = (function(superClass1) {
    extend1(Expansion, superClass1);

    function Expansion() {
      return Expansion.__super__.constructor.apply(this, arguments);
    }

    Expansion.prototype.isComplex = NO;

    Expansion.prototype.compileNode = function(o) {
      return this.error('Expansion must be used inside a destructuring assignment or parameter list');
    };

    Expansion.prototype.asReference = function(o) {
      return this;
    };

    Expansion.prototype.eachName = function(iterator) {};

    return Expansion;

  })(Base);

  exports.While = While = (function(superClass1) {
    extend1(While, superClass1);

    function While(condition, options) {
      this.condition = (options != null ? options.invert : void 0) ? condition.invert() : condition;
      this.guard = options != null ? options.guard : void 0;
    }

    While.prototype.children = ['condition', 'guard', 'body'];

    While.prototype.isStatement = YES;

    While.prototype.makeReturn = function(res) {
      if (res) {
        return While.__super__.makeReturn.apply(this, arguments);
      } else {
        this.returns = !this.jumps({
          loop: true
        });
        return this;
      }
    };

    While.prototype.addBody = function(body1) {
      this.body = body1;
      return this;
    };

    While.prototype.jumps = function() {
      var expressions, j, jumpNode, len1, node;
      expressions = this.body.expressions;
      if (!expressions.length) {
        return false;
      }
      for (j = 0, len1 = expressions.length; j < len1; j++) {
        node = expressions[j];
        if (jumpNode = node.jumps({
          loop: true
        })) {
          return jumpNode;
        }
      }
      return false;
    };

    While.prototype.compileNode = function(o) {
      var answer, body, rvar, set;
      o.indent += TAB;
      set = '';
      body = this.body;
      if (body.isEmpty()) {
        body = this.makeCode('');
      } else {
        if (this.returns) {
          body.makeReturn(rvar = o.scope.freeVariable('results'));
          set = "" + this.tab + rvar + " = [];\n";
        }
        if (this.guard) {
          if (body.expressions.length > 1) {
            body.expressions.unshift(new If((new Parens(this.guard)).invert(), new Literal("continue")));
          } else {
            if (this.guard) {
              body = Block.wrap([new If(this.guard, body)]);
            }
          }
        }
        body = [].concat(this.makeCode("\n"), body.compileToFragments(o, LEVEL_TOP), this.makeCode("\n" + this.tab));
      }
      answer = [].concat(this.makeCode(set + this.tab + "while ("), this.condition.compileToFragments(o, LEVEL_PAREN), this.makeCode(") {"), body, this.makeCode("}"));
      if (this.returns) {
        answer.push(this.makeCode("\n" + this.tab + "return " + rvar + ";"));
      }
      return answer;
    };

    return While;

  })(Base);

  exports.Op = Op = (function(superClass1) {
    var CONVERSIONS, INVERSIONS;

    extend1(Op, superClass1);

    function Op(op, first, second, flip) {
      if (op === 'in') {
        return new In(first, second);
      }
      if (op === 'do') {
        return this.generateDo(first);
      }
      if (op === 'new') {
        if (first instanceof Call && !first["do"] && !first.isNew) {
          return first.newInstance();
        }
        if (first instanceof Code && first.bound || first["do"]) {
          first = new Parens(first);
        }
      }
      this.operator = CONVERSIONS[op] || op;
      this.first = first;
      this.second = second;
      this.flip = !!flip;
      return this;
    }

    CONVERSIONS = {
      '==': '===',
      '!=': '!==',
      'of': 'in',
      'yieldfrom': 'yield*'
    };

    INVERSIONS = {
      '!==': '===',
      '===': '!=='
    };

    Op.prototype.children = ['first', 'second'];

    Op.prototype.isSimpleNumber = NO;

    Op.prototype.isYield = function() {
      var ref3;
      return (ref3 = this.operator) === 'yield' || ref3 === 'yield*';
    };

    Op.prototype.isYieldReturn = function() {
      return this.isYield() && this.first instanceof Return;
    };

    Op.prototype.isUnary = function() {
      return !this.second;
    };

    Op.prototype.isComplex = function() {
      var ref3;
      return !(this.isUnary() && ((ref3 = this.operator) === '+' || ref3 === '-') && this.first instanceof Value && this.first.isSimpleNumber());
    };

    Op.prototype.isChainable = function() {
      var ref3;
      return (ref3 = this.operator) === '<' || ref3 === '>' || ref3 === '>=' || ref3 === '<=' || ref3 === '===' || ref3 === '!==';
    };

    Op.prototype.invert = function() {
      var allInvertable, curr, fst, op, ref3;
      if (this.isChainable() && this.first.isChainable()) {
        allInvertable = true;
        curr = this;
        while (curr && curr.operator) {
          allInvertable && (allInvertable = curr.operator in INVERSIONS);
          curr = curr.first;
        }
        if (!allInvertable) {
          return new Parens(this).invert();
        }
        curr = this;
        while (curr && curr.operator) {
          curr.invert = !curr.invert;
          curr.operator = INVERSIONS[curr.operator];
          curr = curr.first;
        }
        return this;
      } else if (op = INVERSIONS[this.operator]) {
        this.operator = op;
        if (this.first.unwrap() instanceof Op) {
          this.first.invert();
        }
        return this;
      } else if (this.second) {
        return new Parens(this).invert();
      } else if (this.operator === '!' && (fst = this.first.unwrap()) instanceof Op && ((ref3 = fst.operator) === '!' || ref3 === 'in' || ref3 === 'instanceof')) {
        return fst;
      } else {
        return new Op('!', this);
      }
    };

    Op.prototype.unfoldSoak = function(o) {
      var ref3;
      return ((ref3 = this.operator) === '++' || ref3 === '--' || ref3 === 'delete') && unfoldSoak(o, this, 'first');
    };

    Op.prototype.generateDo = function(exp) {
      var call, func, j, len1, param, passedParams, ref, ref3;
      passedParams = [];
      func = exp instanceof Assign && (ref = exp.value.unwrap()) instanceof Code ? ref : exp;
      ref3 = func.params || [];
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        param = ref3[j];
        if (param.value) {
          passedParams.push(param.value);
          delete param.value;
        } else {
          passedParams.push(param);
        }
      }
      call = new Call(exp, passedParams);
      call["do"] = true;
      return call;
    };

    Op.prototype.compileNode = function(o) {
      var answer, isChain, lhs, ref3, ref4, rhs;
      isChain = this.isChainable() && this.first.isChainable();
      if (!isChain) {
        this.first.front = this.front;
      }
      if (this.operator === 'delete' && o.scope.check(this.first.unwrapAll().value)) {
        this.error('delete operand may not be argument or var');
      }
      if (((ref3 = this.operator) === '--' || ref3 === '++') && (ref4 = this.first.unwrapAll().value, indexOf.call(STRICT_PROSCRIBED, ref4) >= 0)) {
        this.error("cannot increment/decrement \"" + (this.first.unwrapAll().value) + "\"");
      }
      if (this.isYield()) {
        return this.compileYield(o);
      }
      if (this.isUnary()) {
        return this.compileUnary(o);
      }
      if (isChain) {
        return this.compileChain(o);
      }
      switch (this.operator) {
        case '?':
          return this.compileExistence(o);
        case '**':
          return this.compilePower(o);
        case '//':
          return this.compileFloorDivision(o);
        case '%%':
          return this.compileModulo(o);
        default:
          lhs = this.first.compileToFragments(o, LEVEL_OP);
          rhs = this.second.compileToFragments(o, LEVEL_OP);
          answer = [].concat(lhs, this.makeCode(" " + this.operator + " "), rhs);
          if (o.level <= LEVEL_OP) {
            return answer;
          } else {
            return this.wrapInBraces(answer);
          }
      }
    };

    Op.prototype.compileChain = function(o) {
      var fragments, fst, ref3, shared;
      ref3 = this.first.second.cache(o), this.first.second = ref3[0], shared = ref3[1];
      fst = this.first.compileToFragments(o, LEVEL_OP);
      fragments = fst.concat(this.makeCode(" " + (this.invert ? '&&' : '||') + " "), shared.compileToFragments(o), this.makeCode(" " + this.operator + " "), this.second.compileToFragments(o, LEVEL_OP));
      return this.wrapInBraces(fragments);
    };

    Op.prototype.compileExistence = function(o) {
      var fst, ref;
      if (this.first.isComplex()) {
        ref = new Literal(o.scope.freeVariable('ref'));
        fst = new Parens(new Assign(ref, this.first));
      } else {
        fst = this.first;
        ref = fst;
      }
      return new If(new Existence(fst), ref, {
        type: 'if'
      }).addElse(this.second).compileToFragments(o);
    };

    Op.prototype.compileUnary = function(o) {
      var op, parts, plusMinus;
      parts = [];
      op = this.operator;
      parts.push([this.makeCode(op)]);
      if (op === '!' && this.first instanceof Existence) {
        this.first.negated = !this.first.negated;
        return this.first.compileToFragments(o);
      }
      if (o.level >= LEVEL_ACCESS) {
        return (new Parens(this)).compileToFragments(o);
      }
      plusMinus = op === '+' || op === '-';
      if ((op === 'new' || op === 'typeof' || op === 'delete') || plusMinus && this.first instanceof Op && this.first.operator === op) {
        parts.push([this.makeCode(' ')]);
      }
      if ((plusMinus && this.first instanceof Op) || (op === 'new' && this.first.isStatement(o))) {
        this.first = new Parens(this.first);
      }
      parts.push(this.first.compileToFragments(o, LEVEL_OP));
      if (this.flip) {
        parts.reverse();
      }
      return this.joinFragmentArrays(parts, '');
    };

    Op.prototype.compileYield = function(o) {
      var op, parts;
      parts = [];
      op = this.operator;
      if (o.scope.parent == null) {
        this.error('yield statements must occur within a function generator.');
      }
      if (indexOf.call(Object.keys(this.first), 'expression') >= 0 && !(this.first instanceof Throw)) {
        if (this.isYieldReturn()) {
          parts.push(this.first.compileToFragments(o, LEVEL_TOP));
        } else if (this.first.expression != null) {
          parts.push(this.first.expression.compileToFragments(o, LEVEL_OP));
        }
      } else {
        parts.push([this.makeCode("(" + op + " ")]);
        parts.push(this.first.compileToFragments(o, LEVEL_OP));
        parts.push([this.makeCode(")")]);
      }
      return this.joinFragmentArrays(parts, '');
    };

    Op.prototype.compilePower = function(o) {
      var pow;
      pow = new Value(new Literal('Math'), [new Access(new Literal('pow'))]);
      return new Call(pow, [this.first, this.second]).compileToFragments(o);
    };

    Op.prototype.compileFloorDivision = function(o) {
      var div, floor;
      floor = new Value(new Literal('Math'), [new Access(new Literal('floor'))]);
      div = new Op('/', this.first, this.second);
      return new Call(floor, [div]).compileToFragments(o);
    };

    Op.prototype.compileModulo = function(o) {
      var mod;
      mod = new Value(new Literal(utility('modulo', o)));
      return new Call(mod, [this.first, this.second]).compileToFragments(o);
    };

    Op.prototype.toString = function(idt) {
      return Op.__super__.toString.call(this, idt, this.constructor.name + ' ' + this.operator);
    };

    return Op;

  })(Base);

  exports.In = In = (function(superClass1) {
    extend1(In, superClass1);

    function In(object, array) {
      this.object = object;
      this.array = array;
    }

    In.prototype.children = ['object', 'array'];

    In.prototype.invert = NEGATE;

    In.prototype.compileNode = function(o) {
      var hasSplat, j, len1, obj, ref3;
      if (this.array instanceof Value && this.array.isArray() && this.array.base.objects.length) {
        ref3 = this.array.base.objects;
        for (j = 0, len1 = ref3.length; j < len1; j++) {
          obj = ref3[j];
          if (!(obj instanceof Splat)) {
            continue;
          }
          hasSplat = true;
          break;
        }
        if (!hasSplat) {
          return this.compileOrTest(o);
        }
      }
      return this.compileLoopTest(o);
    };

    In.prototype.compileOrTest = function(o) {
      var cmp, cnj, i, item, j, len1, ref, ref3, ref4, ref5, sub, tests;
      ref3 = this.object.cache(o, LEVEL_OP), sub = ref3[0], ref = ref3[1];
      ref4 = this.negated ? [' !== ', ' && '] : [' === ', ' || '], cmp = ref4[0], cnj = ref4[1];
      tests = [];
      ref5 = this.array.base.objects;
      for (i = j = 0, len1 = ref5.length; j < len1; i = ++j) {
        item = ref5[i];
        if (i) {
          tests.push(this.makeCode(cnj));
        }
        tests = tests.concat((i ? ref : sub), this.makeCode(cmp), item.compileToFragments(o, LEVEL_ACCESS));
      }
      if (o.level < LEVEL_OP) {
        return tests;
      } else {
        return this.wrapInBraces(tests);
      }
    };

    In.prototype.compileLoopTest = function(o) {
      var fragments, ref, ref3, sub;
      ref3 = this.object.cache(o, LEVEL_LIST), sub = ref3[0], ref = ref3[1];
      fragments = [].concat(this.makeCode(utility('indexOf', o) + ".call("), this.array.compileToFragments(o, LEVEL_LIST), this.makeCode(", "), ref, this.makeCode(") " + (this.negated ? '< 0' : '>= 0')));
      if (fragmentsToText(sub) === fragmentsToText(ref)) {
        return fragments;
      }
      fragments = sub.concat(this.makeCode(', '), fragments);
      if (o.level < LEVEL_LIST) {
        return fragments;
      } else {
        return this.wrapInBraces(fragments);
      }
    };

    In.prototype.toString = function(idt) {
      return In.__super__.toString.call(this, idt, this.constructor.name + (this.negated ? '!' : ''));
    };

    return In;

  })(Base);

  exports.Try = Try = (function(superClass1) {
    extend1(Try, superClass1);

    function Try(attempt, errorVariable, recovery, ensure) {
      this.attempt = attempt;
      this.errorVariable = errorVariable;
      this.recovery = recovery;
      this.ensure = ensure;
    }

    Try.prototype.children = ['attempt', 'recovery', 'ensure'];

    Try.prototype.isStatement = YES;

    Try.prototype.jumps = function(o) {
      var ref3;
      return this.attempt.jumps(o) || ((ref3 = this.recovery) != null ? ref3.jumps(o) : void 0);
    };

    Try.prototype.makeReturn = function(res) {
      if (this.attempt) {
        this.attempt = this.attempt.makeReturn(res);
      }
      if (this.recovery) {
        this.recovery = this.recovery.makeReturn(res);
      }
      return this;
    };

    Try.prototype.compileNode = function(o) {
      var catchPart, ensurePart, generatedErrorVariableName, placeholder, tryPart;
      o.indent += TAB;
      tryPart = this.attempt.compileToFragments(o, LEVEL_TOP);
      catchPart = this.recovery ? (generatedErrorVariableName = o.scope.freeVariable('error'), placeholder = new Literal(generatedErrorVariableName), this.errorVariable ? this.recovery.unshift(new Assign(this.errorVariable, placeholder)) : void 0, [].concat(this.makeCode(" catch ("), placeholder.compileToFragments(o), this.makeCode(") {\n"), this.recovery.compileToFragments(o, LEVEL_TOP), this.makeCode("\n" + this.tab + "}"))) : !(this.ensure || this.recovery) ? [this.makeCode(" catch (" + generatedErrorVariableName + ") {}")] : [];
      ensurePart = this.ensure ? [].concat(this.makeCode(" finally {\n"), this.ensure.compileToFragments(o, LEVEL_TOP), this.makeCode("\n" + this.tab + "}")) : [];
      return [].concat(this.makeCode(this.tab + "try {\n"), tryPart, this.makeCode("\n" + this.tab + "}"), catchPart, ensurePart);
    };

    return Try;

  })(Base);

  exports.Throw = Throw = (function(superClass1) {
    extend1(Throw, superClass1);

    function Throw(expression) {
      this.expression = expression;
    }

    Throw.prototype.children = ['expression'];

    Throw.prototype.isStatement = YES;

    Throw.prototype.jumps = NO;

    Throw.prototype.makeReturn = THIS;

    Throw.prototype.compileNode = function(o) {
      return [].concat(this.makeCode(this.tab + "throw "), this.expression.compileToFragments(o), this.makeCode(";"));
    };

    return Throw;

  })(Base);

  exports.Existence = Existence = (function(superClass1) {
    extend1(Existence, superClass1);

    function Existence(expression) {
      this.expression = expression;
    }

    Existence.prototype.children = ['expression'];

    Existence.prototype.invert = NEGATE;

    Existence.prototype.compileNode = function(o) {
      var cmp, cnj, code, ref3;
      this.expression.front = this.front;
      code = this.expression.compile(o, LEVEL_OP);
      if (IDENTIFIER.test(code) && !o.scope.check(code)) {
        ref3 = this.negated ? ['===', '||'] : ['!==', '&&'], cmp = ref3[0], cnj = ref3[1];
        code = "typeof " + code + " " + cmp + " \"undefined\" " + cnj + " " + code + " " + cmp + " null";
      } else {
        code = code + " " + (this.negated ? '==' : '!=') + " null";
      }
      return [this.makeCode(o.level <= LEVEL_COND ? code : "(" + code + ")")];
    };

    return Existence;

  })(Base);

  exports.Parens = Parens = (function(superClass1) {
    extend1(Parens, superClass1);

    function Parens(body1) {
      this.body = body1;
    }

    Parens.prototype.children = ['body'];

    Parens.prototype.unwrap = function() {
      return this.body;
    };

    Parens.prototype.isComplex = function() {
      return this.body.isComplex();
    };

    Parens.prototype.compileNode = function(o) {
      var bare, expr, fragments;
      expr = this.body.unwrap();
      if (expr instanceof Value && expr.isAtomic()) {
        expr.front = this.front;
        return expr.compileToFragments(o);
      }
      fragments = expr.compileToFragments(o, LEVEL_PAREN);
      bare = o.level < LEVEL_OP && (expr instanceof Op || expr instanceof Call || (expr instanceof For && expr.returns));
      if (bare) {
        return fragments;
      } else {
        return this.wrapInBraces(fragments);
      }
    };

    return Parens;

  })(Base);

  exports.For = For = (function(superClass1) {
    extend1(For, superClass1);

    function For(body, source) {
      var ref3;
      this.source = source.source, this.guard = source.guard, this.step = source.step, this.name = source.name, this.index = source.index;
      this.body = Block.wrap([body]);
      this.own = !!source.own;
      this.object = !!source.object;
      if (this.object) {
        ref3 = [this.index, this.name], this.name = ref3[0], this.index = ref3[1];
      }
      if (this.index instanceof Value) {
        this.index.error('index cannot be a pattern matching expression');
      }
      this.range = this.source instanceof Value && this.source.base instanceof Range && !this.source.properties.length;
      this.pattern = this.name instanceof Value;
      if (this.range && this.index) {
        this.index.error('indexes do not apply to range loops');
      }
      if (this.range && this.pattern) {
        this.name.error('cannot pattern match over range loops');
      }
      if (this.own && !this.object) {
        this.name.error('cannot use own with for-in');
      }
      this.returns = false;
    }

    For.prototype.children = ['body', 'source', 'guard', 'step'];

    For.prototype.compileNode = function(o) {
      var body, bodyFragments, compare, compareDown, declare, declareDown, defPart, defPartFragments, down, forPartFragments, guardPart, idt1, increment, index, ivar, kvar, kvarAssign, last, lvar, name, namePart, ref, ref3, ref4, resultPart, returnResult, rvar, scope, source, step, stepNum, stepVar, svar, varPart;
      body = Block.wrap([this.body]);
      ref3 = body.expressions, last = ref3[ref3.length - 1];
      if ((last != null ? last.jumps() : void 0) instanceof Return) {
        this.returns = false;
      }
      source = this.range ? this.source.base : this.source;
      scope = o.scope;
      if (!this.pattern) {
        name = this.name && (this.name.compile(o, LEVEL_LIST));
      }
      index = this.index && (this.index.compile(o, LEVEL_LIST));
      if (name && !this.pattern) {
        scope.find(name);
      }
      if (index) {
        scope.find(index);
      }
      if (this.returns) {
        rvar = scope.freeVariable('results');
      }
      ivar = (this.object && index) || scope.freeVariable('i', {
        single: true
      });
      kvar = (this.range && name) || index || ivar;
      kvarAssign = kvar !== ivar ? kvar + " = " : "";
      if (this.step && !this.range) {
        ref4 = this.cacheToCodeFragments(this.step.cache(o, LEVEL_LIST, isComplexOrAssignable)), step = ref4[0], stepVar = ref4[1];
        stepNum = stepVar.match(NUMBER);
      }
      if (this.pattern) {
        name = ivar;
      }
      varPart = '';
      guardPart = '';
      defPart = '';
      idt1 = this.tab + TAB;
      if (this.range) {
        forPartFragments = source.compileToFragments(merge(o, {
          index: ivar,
          name: name,
          step: this.step,
          isComplex: isComplexOrAssignable
        }));
      } else {
        svar = this.source.compile(o, LEVEL_LIST);
        if ((name || this.own) && !IDENTIFIER.test(svar)) {
          defPart += "" + this.tab + (ref = scope.freeVariable('ref')) + " = " + svar + ";\n";
          svar = ref;
        }
        if (name && !this.pattern) {
          namePart = name + " = " + svar + "[" + kvar + "]";
        }
        if (!this.object) {
          if (step !== stepVar) {
            defPart += "" + this.tab + step + ";\n";
          }
          if (!(this.step && stepNum && (down = parseNum(stepNum[0]) < 0))) {
            lvar = scope.freeVariable('len');
          }
          declare = "" + kvarAssign + ivar + " = 0, " + lvar + " = " + svar + ".length";
          declareDown = "" + kvarAssign + ivar + " = " + svar + ".length - 1";
          compare = ivar + " < " + lvar;
          compareDown = ivar + " >= 0";
          if (this.step) {
            if (stepNum) {
              if (down) {
                compare = compareDown;
                declare = declareDown;
              }
            } else {
              compare = stepVar + " > 0 ? " + compare + " : " + compareDown;
              declare = "(" + stepVar + " > 0 ? (" + declare + ") : " + declareDown + ")";
            }
            increment = ivar + " += " + stepVar;
          } else {
            increment = "" + (kvar !== ivar ? "++" + ivar : ivar + "++");
          }
          forPartFragments = [this.makeCode(declare + "; " + compare + "; " + kvarAssign + increment)];
        }
      }
      if (this.returns) {
        resultPart = "" + this.tab + rvar + " = [];\n";
        returnResult = "\n" + this.tab + "return " + rvar + ";";
        body.makeReturn(rvar);
      }
      if (this.guard) {
        if (body.expressions.length > 1) {
          body.expressions.unshift(new If((new Parens(this.guard)).invert(), new Literal("continue")));
        } else {
          if (this.guard) {
            body = Block.wrap([new If(this.guard, body)]);
          }
        }
      }
      if (this.pattern) {
        body.expressions.unshift(new Assign(this.name, new Literal(svar + "[" + kvar + "]")));
      }
      defPartFragments = [].concat(this.makeCode(defPart), this.pluckDirectCall(o, body));
      if (namePart) {
        varPart = "\n" + idt1 + namePart + ";";
      }
      if (this.object) {
        forPartFragments = [this.makeCode(kvar + " in " + svar)];
        if (this.own) {
          guardPart = "\n" + idt1 + "if (!" + (utility('hasProp', o)) + ".call(" + svar + ", " + kvar + ")) continue;";
        }
      }
      bodyFragments = body.compileToFragments(merge(o, {
        indent: idt1
      }), LEVEL_TOP);
      if (bodyFragments && (bodyFragments.length > 0)) {
        bodyFragments = [].concat(this.makeCode("\n"), bodyFragments, this.makeCode("\n"));
      }
      return [].concat(defPartFragments, this.makeCode("" + (resultPart || '') + this.tab + "for ("), forPartFragments, this.makeCode(") {" + guardPart + varPart), bodyFragments, this.makeCode(this.tab + "}" + (returnResult || '')));
    };

    For.prototype.pluckDirectCall = function(o, body) {
      var base, defs, expr, fn, idx, j, len1, ref, ref3, ref4, ref5, ref6, ref7, ref8, ref9, val;
      defs = [];
      ref3 = body.expressions;
      for (idx = j = 0, len1 = ref3.length; j < len1; idx = ++j) {
        expr = ref3[idx];
        expr = expr.unwrapAll();
        if (!(expr instanceof Call)) {
          continue;
        }
        val = (ref4 = expr.variable) != null ? ref4.unwrapAll() : void 0;
        if (!((val instanceof Code) || (val instanceof Value && ((ref5 = val.base) != null ? ref5.unwrapAll() : void 0) instanceof Code && val.properties.length === 1 && ((ref6 = (ref7 = val.properties[0].name) != null ? ref7.value : void 0) === 'call' || ref6 === 'apply')))) {
          continue;
        }
        fn = ((ref8 = val.base) != null ? ref8.unwrapAll() : void 0) || val;
        ref = new Literal(o.scope.freeVariable('fn'));
        base = new Value(ref);
        if (val.base) {
          ref9 = [base, val], val.base = ref9[0], base = ref9[1];
        }
        body.expressions[idx] = new Call(base, expr.args);
        defs = defs.concat(this.makeCode(this.tab), new Assign(ref, fn).compileToFragments(o, LEVEL_TOP), this.makeCode(';\n'));
      }
      return defs;
    };

    return For;

  })(While);

  exports.Switch = Switch = (function(superClass1) {
    extend1(Switch, superClass1);

    function Switch(subject, cases, otherwise) {
      this.subject = subject;
      this.cases = cases;
      this.otherwise = otherwise;
    }

    Switch.prototype.children = ['subject', 'cases', 'otherwise'];

    Switch.prototype.isStatement = YES;

    Switch.prototype.jumps = function(o) {
      var block, conds, j, jumpNode, len1, ref3, ref4, ref5;
      if (o == null) {
        o = {
          block: true
        };
      }
      ref3 = this.cases;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        ref4 = ref3[j], conds = ref4[0], block = ref4[1];
        if (jumpNode = block.jumps(o)) {
          return jumpNode;
        }
      }
      return (ref5 = this.otherwise) != null ? ref5.jumps(o) : void 0;
    };

    Switch.prototype.makeReturn = function(res) {
      var j, len1, pair, ref3, ref4;
      ref3 = this.cases;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        pair = ref3[j];
        pair[1].makeReturn(res);
      }
      if (res) {
        this.otherwise || (this.otherwise = new Block([new Literal('void 0')]));
      }
      if ((ref4 = this.otherwise) != null) {
        ref4.makeReturn(res);
      }
      return this;
    };

    Switch.prototype.compileNode = function(o) {
      var block, body, cond, conditions, expr, fragments, i, idt1, idt2, j, k, len1, len2, ref3, ref4, ref5;
      idt1 = o.indent + TAB;
      idt2 = o.indent = idt1 + TAB;
      fragments = [].concat(this.makeCode(this.tab + "switch ("), (this.subject ? this.subject.compileToFragments(o, LEVEL_PAREN) : this.makeCode("false")), this.makeCode(") {\n"));
      ref3 = this.cases;
      for (i = j = 0, len1 = ref3.length; j < len1; i = ++j) {
        ref4 = ref3[i], conditions = ref4[0], block = ref4[1];
        ref5 = flatten([conditions]);
        for (k = 0, len2 = ref5.length; k < len2; k++) {
          cond = ref5[k];
          if (!this.subject) {
            cond = cond.invert();
          }
          fragments = fragments.concat(this.makeCode(idt1 + "case "), cond.compileToFragments(o, LEVEL_PAREN), this.makeCode(":\n"));
        }
        if ((body = block.compileToFragments(o, LEVEL_TOP)).length > 0) {
          fragments = fragments.concat(body, this.makeCode('\n'));
        }
        if (i === this.cases.length - 1 && !this.otherwise) {
          break;
        }
        expr = this.lastNonComment(block.expressions);
        if (expr instanceof Return || (expr instanceof Literal && expr.jumps() && expr.value !== 'debugger')) {
          continue;
        }
        fragments.push(cond.makeCode(idt2 + 'break;\n'));
      }
      if (this.otherwise && this.otherwise.expressions.length) {
        fragments.push.apply(fragments, [this.makeCode(idt1 + "default:\n")].concat(slice.call(this.otherwise.compileToFragments(o, LEVEL_TOP)), [this.makeCode("\n")]));
      }
      fragments.push(this.makeCode(this.tab + '}'));
      return fragments;
    };

    return Switch;

  })(Base);

  exports.If = If = (function(superClass1) {
    extend1(If, superClass1);

    function If(condition, body1, options) {
      this.body = body1;
      if (options == null) {
        options = {};
      }
      this.condition = options.type === 'unless' ? condition.invert() : condition;
      this.elseBody = null;
      this.isChain = false;
      this.soak = options.soak;
    }

    If.prototype.children = ['condition', 'body', 'elseBody'];

    If.prototype.bodyNode = function() {
      var ref3;
      return (ref3 = this.body) != null ? ref3.unwrap() : void 0;
    };

    If.prototype.elseBodyNode = function() {
      var ref3;
      return (ref3 = this.elseBody) != null ? ref3.unwrap() : void 0;
    };

    If.prototype.addElse = function(elseBody) {
      if (this.isChain) {
        this.elseBodyNode().addElse(elseBody);
      } else {
        this.isChain = elseBody instanceof If;
        this.elseBody = this.ensureBlock(elseBody);
        this.elseBody.updateLocationDataIfMissing(elseBody.locationData);
      }
      return this;
    };

    If.prototype.isStatement = function(o) {
      var ref3;
      return (o != null ? o.level : void 0) === LEVEL_TOP || this.bodyNode().isStatement(o) || ((ref3 = this.elseBodyNode()) != null ? ref3.isStatement(o) : void 0);
    };

    If.prototype.jumps = function(o) {
      var ref3;
      return this.body.jumps(o) || ((ref3 = this.elseBody) != null ? ref3.jumps(o) : void 0);
    };

    If.prototype.compileNode = function(o) {
      if (this.isStatement(o)) {
        return this.compileStatement(o);
      } else {
        return this.compileExpression(o);
      }
    };

    If.prototype.makeReturn = function(res) {
      if (res) {
        this.elseBody || (this.elseBody = new Block([new Literal('void 0')]));
      }
      this.body && (this.body = new Block([this.body.makeReturn(res)]));
      this.elseBody && (this.elseBody = new Block([this.elseBody.makeReturn(res)]));
      return this;
    };

    If.prototype.ensureBlock = function(node) {
      if (node instanceof Block) {
        return node;
      } else {
        return new Block([node]);
      }
    };

    If.prototype.compileStatement = function(o) {
      var answer, body, child, cond, exeq, ifPart, indent;
      child = del(o, 'chainChild');
      exeq = del(o, 'isExistentialEquals');
      if (exeq) {
        return new If(this.condition.invert(), this.elseBodyNode(), {
          type: 'if'
        }).compileToFragments(o);
      }
      indent = o.indent + TAB;
      cond = this.condition.compileToFragments(o, LEVEL_PAREN);
      body = this.ensureBlock(this.body).compileToFragments(merge(o, {
        indent: indent
      }));
      ifPart = [].concat(this.makeCode("if ("), cond, this.makeCode(") {\n"), body, this.makeCode("\n" + this.tab + "}"));
      if (!child) {
        ifPart.unshift(this.makeCode(this.tab));
      }
      if (!this.elseBody) {
        return ifPart;
      }
      answer = ifPart.concat(this.makeCode(' else '));
      if (this.isChain) {
        o.chainChild = true;
        answer = answer.concat(this.elseBody.unwrap().compileToFragments(o, LEVEL_TOP));
      } else {
        answer = answer.concat(this.makeCode("{\n"), this.elseBody.compileToFragments(merge(o, {
          indent: indent
        }), LEVEL_TOP), this.makeCode("\n" + this.tab + "}"));
      }
      return answer;
    };

    If.prototype.compileExpression = function(o) {
      var alt, body, cond, fragments;
      cond = this.condition.compileToFragments(o, LEVEL_COND);
      body = this.bodyNode().compileToFragments(o, LEVEL_LIST);
      alt = this.elseBodyNode() ? this.elseBodyNode().compileToFragments(o, LEVEL_LIST) : [this.makeCode('void 0')];
      fragments = cond.concat(this.makeCode(" ? "), body, this.makeCode(" : "), alt);
      if (o.level >= LEVEL_COND) {
        return this.wrapInBraces(fragments);
      } else {
        return fragments;
      }
    };

    If.prototype.unfoldSoak = function() {
      return this.soak && this;
    };

    return If;

  })(Base);

  UTILITIES = {
    extend: function(o) {
      return "function(child, parent) { for (var key in parent) { if (" + (utility('hasProp', o)) + ".call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; }";
    },
    bind: function() {
      return 'function(fn, me){ return function(){ return fn.apply(me, arguments); }; }';
    },
    indexOf: function() {
      return "[].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; }";
    },
    modulo: function() {
      return "function(a, b) { return (+a % (b = +b) + b) % b; }";
    },
    hasProp: function() {
      return '{}.hasOwnProperty';
    },
    slice: function() {
      return '[].slice';
    }
  };

  LEVEL_TOP = 1;

  LEVEL_PAREN = 2;

  LEVEL_LIST = 3;

  LEVEL_COND = 4;

  LEVEL_OP = 5;

  LEVEL_ACCESS = 6;

  TAB = '  ';

  IDENTIFIER = /^(?!\d)[$\w\x7f-\uffff]+$/;

  SIMPLENUM = /^[+-]?\d+$/;

  HEXNUM = /^[+-]?0x[\da-f]+/i;

  NUMBER = /^[+-]?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)$/i;

  IS_STRING = /^['"]/;

  IS_REGEX = /^\//;

  utility = function(name, o) {
    var ref, root;
    root = o.scope.root;
    if (name in root.utilities) {
      return root.utilities[name];
    } else {
      ref = root.freeVariable(name);
      root.assign(ref, UTILITIES[name](o));
      return root.utilities[name] = ref;
    }
  };

  multident = function(code, tab) {
    code = code.replace(/\n/g, '$&' + tab);
    return code.replace(/\s+$/, '');
  };

  parseNum = function(x) {
    if (x == null) {
      return 0;
    } else if (x.match(HEXNUM)) {
      return parseInt(x, 16);
    } else {
      return parseFloat(x);
    }
  };

  isLiteralArguments = function(node) {
    return node instanceof Literal && node.value === 'arguments' && !node.asKey;
  };

  isLiteralThis = function(node) {
    return (node instanceof Literal && node.value === 'this' && !node.asKey) || (node instanceof Code && node.bound) || (node instanceof Call && node.isSuper);
  };

  isComplexOrAssignable = function(node) {
    return node.isComplex() || (typeof node.isAssignable === "function" ? node.isAssignable() : void 0);
  };

  unfoldSoak = function(o, parent, name) {
    var ifn;
    if (!(ifn = parent[name].unfoldSoak(o))) {
      return;
    }
    parent[name] = ifn.body;
    ifn.body = new Value(parent);
    return ifn;
  };

}).call(this);

},{"./helpers":21,"./lexer":22,"./scope":27}],24:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.15 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,20],$V1=[1,75],$V2=[1,71],$V3=[1,76],$V4=[1,77],$V5=[1,73],$V6=[1,74],$V7=[1,50],$V8=[1,52],$V9=[1,53],$Va=[1,54],$Vb=[1,55],$Vc=[1,45],$Vd=[1,46],$Ve=[1,27],$Vf=[1,60],$Vg=[1,61],$Vh=[1,70],$Vi=[1,43],$Vj=[1,26],$Vk=[1,58],$Vl=[1,59],$Vm=[1,57],$Vn=[1,38],$Vo=[1,44],$Vp=[1,56],$Vq=[1,65],$Vr=[1,66],$Vs=[1,67],$Vt=[1,68],$Vu=[1,42],$Vv=[1,64],$Vw=[1,29],$Vx=[1,30],$Vy=[1,31],$Vz=[1,32],$VA=[1,33],$VB=[1,34],$VC=[1,35],$VD=[1,78],$VE=[1,6,26,34,109],$VF=[1,88],$VG=[1,81],$VH=[1,80],$VI=[1,79],$VJ=[1,82],$VK=[1,83],$VL=[1,84],$VM=[1,85],$VN=[1,86],$VO=[1,87],$VP=[1,91],$VQ=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],$VR=[1,97],$VS=[1,98],$VT=[1,99],$VU=[1,100],$VV=[1,102],$VW=[1,103],$VX=[1,96],$VY=[2,115],$VZ=[1,6,25,26,34,56,61,64,73,74,75,76,78,80,81,85,91,92,93,98,100,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],$V_=[2,82],$V$=[1,108],$V01=[2,61],$V11=[1,112],$V21=[1,117],$V31=[1,118],$V41=[1,120],$V51=[1,6,25,26,34,46,56,61,64,73,74,75,76,78,80,81,85,91,92,93,98,100,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],$V61=[2,79],$V71=[1,6,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],$V81=[1,155],$V91=[1,157],$Va1=[1,152],$Vb1=[1,6,25,26,34,46,56,61,64,73,74,75,76,78,80,81,85,87,91,92,93,98,100,109,111,112,113,117,118,133,136,137,140,141,142,143,144,145,146,147,148,149],$Vc1=[2,98],$Vd1=[1,6,25,26,34,49,56,61,64,73,74,75,76,78,80,81,85,91,92,93,98,100,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],$Ve1=[1,6,25,26,34,46,49,56,61,64,73,74,75,76,78,80,81,85,87,91,92,93,98,100,109,111,112,113,117,118,124,125,133,136,137,140,141,142,143,144,145,146,147,148,149],$Vf1=[1,207],$Vg1=[1,206],$Vh1=[1,6,25,26,34,38,56,61,64,73,74,75,76,78,80,81,85,91,92,93,98,100,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],$Vi1=[2,59],$Vj1=[1,217],$Vk1=[6,25,26,56,61],$Vl1=[6,25,26,46,56,61,64],$Vm1=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,136,137,143,145,146,147,148],$Vn1=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133],$Vo1=[73,74,75,76,78,81,91,92],$Vp1=[1,236],$Vq1=[2,136],$Vr1=[1,6,25,26,34,46,56,61,64,73,74,75,76,78,80,81,85,91,92,93,98,100,109,111,112,113,117,118,124,125,133,136,137,142,143,144,145,146,147,148],$Vs1=[1,245],$Vt1=[6,25,26,61,93,98],$Vu1=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,118,133],$Vv1=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,112,118,133],$Vw1=[124,125],$Vx1=[61,124,125],$Vy1=[1,256],$Vz1=[6,25,26,61,85],$VA1=[6,25,26,49,61,85],$VB1=[6,25,26,46,49,61,85],$VC1=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,136,137,145,146,147,148],$VD1=[11,28,30,32,33,36,37,40,41,42,43,44,52,53,54,58,59,80,83,86,90,95,96,97,103,107,108,111,113,115,117,126,132,134,135,136,137,138,140,141],$VE1=[2,125],$VF1=[6,25,26],$VG1=[2,60],$VH1=[1,270],$VI1=[1,271],$VJ1=[1,6,25,26,34,56,61,64,80,85,93,98,100,105,106,109,111,112,113,117,118,128,130,133,136,137,142,143,144,145,146,147,148],$VK1=[26,128,130],$VL1=[1,6,26,34,56,61,64,80,85,93,98,100,109,112,118,133],$VM1=[2,74],$VN1=[1,293],$VO1=[1,294],$VP1=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,128,133,136,137,142,143,144,145,146,147,148],$VQ1=[1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,113,117,118,133],$VR1=[1,305],$VS1=[1,306],$VT1=[6,25,26,61],$VU1=[1,6,25,26,34,56,61,64,80,85,93,98,100,105,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],$VV1=[25,61];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Root":3,"Body":4,"Line":5,"TERMINATOR":6,"Expression":7,"Statement":8,"Return":9,"Comment":10,"STATEMENT":11,"Value":12,"Invocation":13,"Code":14,"Operation":15,"Assign":16,"If":17,"Try":18,"While":19,"For":20,"Switch":21,"Class":22,"Throw":23,"Block":24,"INDENT":25,"OUTDENT":26,"Identifier":27,"IDENTIFIER":28,"AlphaNumeric":29,"NUMBER":30,"String":31,"STRING":32,"STRING_START":33,"STRING_END":34,"Regex":35,"REGEX":36,"REGEX_START":37,"REGEX_END":38,"Literal":39,"JS":40,"DEBUGGER":41,"UNDEFINED":42,"NULL":43,"BOOL":44,"Assignable":45,"=":46,"AssignObj":47,"ObjAssignable":48,":":49,"SimpleObjAssignable":50,"ThisProperty":51,"RETURN":52,"HERECOMMENT":53,"PARAM_START":54,"ParamList":55,"PARAM_END":56,"FuncGlyph":57,"->":58,"=>":59,"OptComma":60,",":61,"Param":62,"ParamVar":63,"...":64,"Array":65,"Object":66,"Splat":67,"SimpleAssignable":68,"Accessor":69,"Parenthetical":70,"Range":71,"This":72,".":73,"?.":74,"::":75,"?::":76,"Index":77,"INDEX_START":78,"IndexValue":79,"INDEX_END":80,"INDEX_SOAK":81,"Slice":82,"{":83,"AssignList":84,"}":85,"CLASS":86,"EXTENDS":87,"OptFuncExist":88,"Arguments":89,"SUPER":90,"FUNC_EXIST":91,"CALL_START":92,"CALL_END":93,"ArgList":94,"THIS":95,"@":96,"[":97,"]":98,"RangeDots":99,"..":100,"Arg":101,"SimpleArgs":102,"TRY":103,"Catch":104,"FINALLY":105,"CATCH":106,"THROW":107,"(":108,")":109,"WhileSource":110,"WHILE":111,"WHEN":112,"UNTIL":113,"Loop":114,"LOOP":115,"ForBody":116,"FOR":117,"BY":118,"ForStart":119,"ForSource":120,"ForVariables":121,"OWN":122,"ForValue":123,"FORIN":124,"FOROF":125,"SWITCH":126,"Whens":127,"ELSE":128,"When":129,"LEADING_WHEN":130,"IfBlock":131,"IF":132,"POST_IF":133,"UNARY":134,"UNARY_MATH":135,"-":136,"+":137,"YIELD":138,"FROM":139,"--":140,"++":141,"?":142,"MATH":143,"**":144,"SHIFT":145,"COMPARE":146,"LOGIC":147,"RELATION":148,"COMPOUND_ASSIGN":149,"$accept":0,"$end":1},
terminals_: {2:"error",6:"TERMINATOR",11:"STATEMENT",25:"INDENT",26:"OUTDENT",28:"IDENTIFIER",30:"NUMBER",32:"STRING",33:"STRING_START",34:"STRING_END",36:"REGEX",37:"REGEX_START",38:"REGEX_END",40:"JS",41:"DEBUGGER",42:"UNDEFINED",43:"NULL",44:"BOOL",46:"=",49:":",52:"RETURN",53:"HERECOMMENT",54:"PARAM_START",56:"PARAM_END",58:"->",59:"=>",61:",",64:"...",73:".",74:"?.",75:"::",76:"?::",78:"INDEX_START",80:"INDEX_END",81:"INDEX_SOAK",83:"{",85:"}",86:"CLASS",87:"EXTENDS",90:"SUPER",91:"FUNC_EXIST",92:"CALL_START",93:"CALL_END",95:"THIS",96:"@",97:"[",98:"]",100:"..",103:"TRY",105:"FINALLY",106:"CATCH",107:"THROW",108:"(",109:")",111:"WHILE",112:"WHEN",113:"UNTIL",115:"LOOP",117:"FOR",118:"BY",122:"OWN",124:"FORIN",125:"FOROF",126:"SWITCH",128:"ELSE",130:"LEADING_WHEN",132:"IF",133:"POST_IF",134:"UNARY",135:"UNARY_MATH",136:"-",137:"+",138:"YIELD",139:"FROM",140:"--",141:"++",142:"?",143:"MATH",144:"**",145:"SHIFT",146:"COMPARE",147:"LOGIC",148:"RELATION",149:"COMPOUND_ASSIGN"},
productions_: [0,[3,0],[3,1],[4,1],[4,3],[4,2],[5,1],[5,1],[8,1],[8,1],[8,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[24,2],[24,3],[27,1],[29,1],[29,1],[31,1],[31,3],[35,1],[35,3],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[39,1],[16,3],[16,4],[16,5],[47,1],[47,3],[47,5],[47,3],[47,5],[47,1],[50,1],[50,1],[48,1],[48,1],[9,2],[9,1],[10,1],[14,5],[14,2],[57,1],[57,1],[60,0],[60,1],[55,0],[55,1],[55,3],[55,4],[55,6],[62,1],[62,2],[62,3],[62,1],[63,1],[63,1],[63,1],[63,1],[67,2],[68,1],[68,2],[68,2],[68,1],[45,1],[45,1],[45,1],[12,1],[12,1],[12,1],[12,1],[12,1],[69,2],[69,2],[69,2],[69,2],[69,1],[69,1],[77,3],[77,2],[79,1],[79,1],[66,4],[84,0],[84,1],[84,3],[84,4],[84,6],[22,1],[22,2],[22,3],[22,4],[22,2],[22,3],[22,4],[22,5],[13,3],[13,3],[13,1],[13,2],[88,0],[88,1],[89,2],[89,4],[72,1],[72,1],[51,2],[65,2],[65,4],[99,1],[99,1],[71,5],[82,3],[82,2],[82,2],[82,1],[94,1],[94,3],[94,4],[94,4],[94,6],[101,1],[101,1],[101,1],[102,1],[102,3],[18,2],[18,3],[18,4],[18,5],[104,3],[104,3],[104,2],[23,2],[70,3],[70,5],[110,2],[110,4],[110,2],[110,4],[19,2],[19,2],[19,2],[19,1],[114,2],[114,2],[20,2],[20,2],[20,2],[116,2],[116,4],[116,2],[119,2],[119,3],[123,1],[123,1],[123,1],[123,1],[121,1],[121,3],[120,2],[120,2],[120,4],[120,4],[120,4],[120,6],[120,6],[21,5],[21,7],[21,4],[21,6],[127,1],[127,2],[129,3],[129,4],[131,3],[131,5],[17,1],[17,3],[17,3],[17,3],[15,2],[15,2],[15,2],[15,2],[15,2],[15,2],[15,3],[15,2],[15,2],[15,2],[15,2],[15,2],[15,3],[15,3],[15,3],[15,3],[15,3],[15,3],[15,3],[15,3],[15,3],[15,5],[15,4],[15,3]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Block);
break;
case 2:
return this.$ = $$[$0];
break;
case 3:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(yy.Block.wrap([$$[$0]]));
break;
case 4:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-2].push($$[$0]));
break;
case 5:
this.$ = $$[$0-1];
break;
case 6: case 7: case 8: case 9: case 11: case 12: case 13: case 14: case 15: case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 27: case 32: case 34: case 47: case 48: case 49: case 50: case 51: case 59: case 60: case 70: case 71: case 72: case 73: case 78: case 79: case 82: case 86: case 92: case 136: case 137: case 139: case 169: case 170: case 186: case 192:
this.$ = $$[$0];
break;
case 10: case 25: case 26: case 28: case 30: case 33: case 35:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Literal($$[$0]));
break;
case 23:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Block);
break;
case 24: case 31: case 93:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-1]);
break;
case 29: case 149:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Parens($$[$0-1]));
break;
case 36:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Undefined);
break;
case 37:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Null);
break;
case 38:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Bool($$[$0]));
break;
case 39:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign($$[$0-2], $$[$0]));
break;
case 40:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Assign($$[$0-3], $$[$0]));
break;
case 41:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign($$[$0-4], $$[$0-1]));
break;
case 42: case 75: case 80: case 81: case 83: case 84: case 85: case 171: case 172:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Value($$[$0]));
break;
case 43:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-2])(new yy.Value($$[$0-2])), $$[$0], 'object', {
          operatorToken: yy.addLocationDataFn(_$[$0-1])(new yy.Literal($$[$0-1]))
        }));
break;
case 44:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-4])(new yy.Value($$[$0-4])), $$[$0-1], 'object', {
          operatorToken: yy.addLocationDataFn(_$[$0-3])(new yy.Literal($$[$0-3]))
        }));
break;
case 45:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-2])(new yy.Value($$[$0-2])), $$[$0], null, {
          operatorToken: yy.addLocationDataFn(_$[$0-1])(new yy.Literal($$[$0-1]))
        }));
break;
case 46:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-4])(new yy.Value($$[$0-4])), $$[$0-1], null, {
          operatorToken: yy.addLocationDataFn(_$[$0-3])(new yy.Literal($$[$0-3]))
        }));
break;
case 52:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Return($$[$0]));
break;
case 53:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Return);
break;
case 54:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Comment($$[$0]));
break;
case 55:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Code($$[$0-3], $$[$0], $$[$0-1]));
break;
case 56:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Code([], $$[$0], $$[$0-1]));
break;
case 57:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('func');
break;
case 58:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('boundfunc');
break;
case 61: case 98:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])([]);
break;
case 62: case 99: case 131: case 173:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])([$$[$0]]);
break;
case 63: case 100: case 132:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-2].concat($$[$0]));
break;
case 64: case 101: case 133:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])($$[$0-3].concat($$[$0]));
break;
case 65: case 102: case 135:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])($$[$0-5].concat($$[$0-2]));
break;
case 66:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Param($$[$0]));
break;
case 67:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Param($$[$0-1], null, true));
break;
case 68:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Param($$[$0-2], $$[$0]));
break;
case 69: case 138:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Expansion);
break;
case 74:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Splat($$[$0-1]));
break;
case 76:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0-1].add($$[$0]));
break;
case 77:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Value($$[$0-1], [].concat($$[$0])));
break;
case 87:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Access($$[$0]));
break;
case 88:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Access($$[$0], 'soak'));
break;
case 89:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([yy.addLocationDataFn(_$[$0-1])(new yy.Access(new yy.Literal('prototype'))), yy.addLocationDataFn(_$[$0])(new yy.Access($$[$0]))]);
break;
case 90:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([yy.addLocationDataFn(_$[$0-1])(new yy.Access(new yy.Literal('prototype'), 'soak')), yy.addLocationDataFn(_$[$0])(new yy.Access($$[$0]))]);
break;
case 91:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Access(new yy.Literal('prototype')));
break;
case 94:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(yy.extend($$[$0], {
          soak: true
        }));
break;
case 95:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Index($$[$0]));
break;
case 96:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Slice($$[$0]));
break;
case 97:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Obj($$[$0-2], $$[$0-3].generated));
break;
case 103:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Class);
break;
case 104:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Class(null, null, $$[$0]));
break;
case 105:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Class(null, $$[$0]));
break;
case 106:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Class(null, $$[$0-1], $$[$0]));
break;
case 107:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Class($$[$0]));
break;
case 108:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Class($$[$0-1], null, $$[$0]));
break;
case 109:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Class($$[$0-2], $$[$0]));
break;
case 110:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Class($$[$0-3], $$[$0-1], $$[$0]));
break;
case 111: case 112:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Call($$[$0-2], $$[$0], $$[$0-1]));
break;
case 113:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Call('super', [new yy.Splat(new yy.Literal('arguments'))]));
break;
case 114:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Call('super', $$[$0]));
break;
case 115:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(false);
break;
case 116:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(true);
break;
case 117:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([]);
break;
case 118: case 134:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])($$[$0-2]);
break;
case 119: case 120:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Value(new yy.Literal('this')));
break;
case 121:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Value(yy.addLocationDataFn(_$[$0-1])(new yy.Literal('this')), [yy.addLocationDataFn(_$[$0])(new yy.Access($$[$0]))], 'this'));
break;
case 122:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Arr([]));
break;
case 123:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Arr($$[$0-2]));
break;
case 124:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('inclusive');
break;
case 125:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('exclusive');
break;
case 126:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Range($$[$0-3], $$[$0-1], $$[$0-2]));
break;
case 127:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Range($$[$0-2], $$[$0], $$[$0-1]));
break;
case 128:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Range($$[$0-1], null, $$[$0]));
break;
case 129:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Range(null, $$[$0], $$[$0-1]));
break;
case 130:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Range(null, null, $$[$0]));
break;
case 140:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([].concat($$[$0-2], $$[$0]));
break;
case 141:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Try($$[$0]));
break;
case 142:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Try($$[$0-1], $$[$0][0], $$[$0][1]));
break;
case 143:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Try($$[$0-2], null, null, $$[$0]));
break;
case 144:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Try($$[$0-3], $$[$0-2][0], $$[$0-2][1], $$[$0]));
break;
case 145:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([$$[$0-1], $$[$0]]);
break;
case 146:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([yy.addLocationDataFn(_$[$0-1])(new yy.Value($$[$0-1])), $$[$0]]);
break;
case 147:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([null, $$[$0]]);
break;
case 148:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Throw($$[$0]));
break;
case 150:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Parens($$[$0-2]));
break;
case 151:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While($$[$0]));
break;
case 152:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.While($$[$0-2], {
          guard: $$[$0]
        }));
break;
case 153:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While($$[$0], {
          invert: true
        }));
break;
case 154:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.While($$[$0-2], {
          invert: true,
          guard: $$[$0]
        }));
break;
case 155:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0-1].addBody($$[$0]));
break;
case 156: case 157:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0].addBody(yy.addLocationDataFn(_$[$0-1])(yy.Block.wrap([$$[$0-1]]))));
break;
case 158:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])($$[$0]);
break;
case 159:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While(yy.addLocationDataFn(_$[$0-1])(new yy.Literal('true'))).addBody($$[$0]));
break;
case 160:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While(yy.addLocationDataFn(_$[$0-1])(new yy.Literal('true'))).addBody(yy.addLocationDataFn(_$[$0])(yy.Block.wrap([$$[$0]]))));
break;
case 161: case 162:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.For($$[$0-1], $$[$0]));
break;
case 163:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.For($$[$0], $$[$0-1]));
break;
case 164:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])({
          source: yy.addLocationDataFn(_$[$0])(new yy.Value($$[$0]))
        });
break;
case 165:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: yy.addLocationDataFn(_$[$0-2])(new yy.Value($$[$0-2])),
          step: $$[$0]
        });
break;
case 166:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])((function () {
        $$[$0].own = $$[$0-1].own;
        $$[$0].name = $$[$0-1][0];
        $$[$0].index = $$[$0-1][1];
        return $$[$0];
      }()));
break;
case 167:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0]);
break;
case 168:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])((function () {
        $$[$0].own = true;
        return $$[$0];
      }()));
break;
case 174:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([$$[$0-2], $$[$0]]);
break;
case 175:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])({
          source: $$[$0]
        });
break;
case 176:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])({
          source: $$[$0],
          object: true
        });
break;
case 177:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: $$[$0-2],
          guard: $$[$0]
        });
break;
case 178:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: $$[$0-2],
          guard: $$[$0],
          object: true
        });
break;
case 179:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: $$[$0-2],
          step: $$[$0]
        });
break;
case 180:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])({
          source: $$[$0-4],
          guard: $$[$0-2],
          step: $$[$0]
        });
break;
case 181:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])({
          source: $$[$0-4],
          step: $$[$0-2],
          guard: $$[$0]
        });
break;
case 182:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Switch($$[$0-3], $$[$0-1]));
break;
case 183:
this.$ = yy.addLocationDataFn(_$[$0-6], _$[$0])(new yy.Switch($$[$0-5], $$[$0-3], $$[$0-1]));
break;
case 184:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Switch(null, $$[$0-1]));
break;
case 185:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])(new yy.Switch(null, $$[$0-3], $$[$0-1]));
break;
case 187:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0-1].concat($$[$0]));
break;
case 188:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([[$$[$0-1], $$[$0]]]);
break;
case 189:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])([[$$[$0-2], $$[$0-1]]]);
break;
case 190:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.If($$[$0-1], $$[$0], {
          type: $$[$0-2]
        }));
break;
case 191:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])($$[$0-4].addElse(yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.If($$[$0-1], $$[$0], {
          type: $$[$0-2]
        }))));
break;
case 193:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-2].addElse($$[$0]));
break;
case 194: case 195:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.If($$[$0], yy.addLocationDataFn(_$[$0-2])(yy.Block.wrap([$$[$0-2]])), {
          type: $$[$0-1],
          statement: true
        }));
break;
case 196: case 197: case 200: case 201:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op($$[$0-1], $$[$0]));
break;
case 198:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('-', $$[$0]));
break;
case 199:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('+', $$[$0]));
break;
case 202:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op($$[$0-2].concat($$[$0-1]), $$[$0]));
break;
case 203:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('--', $$[$0]));
break;
case 204:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('++', $$[$0]));
break;
case 205:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('--', $$[$0-1], null, true));
break;
case 206:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('++', $$[$0-1], null, true));
break;
case 207:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Existence($$[$0-1]));
break;
case 208:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op('+', $$[$0-2], $$[$0]));
break;
case 209:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op('-', $$[$0-2], $$[$0]));
break;
case 210: case 211: case 212: case 213: case 214:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op($$[$0-1], $$[$0-2], $$[$0]));
break;
case 215:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])((function () {
        if ($$[$0-1].charAt(0) === '!') {
          return new yy.Op($$[$0-1].slice(1), $$[$0-2], $$[$0]).invert();
        } else {
          return new yy.Op($$[$0-1], $$[$0-2], $$[$0]);
        }
      }()));
break;
case 216:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign($$[$0-2], $$[$0], $$[$0-1]));
break;
case 217:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign($$[$0-4], $$[$0-1], $$[$0-3]));
break;
case 218:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Assign($$[$0-3], $$[$0], $$[$0-2]));
break;
case 219:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Extends($$[$0-2], $$[$0]));
break;
}
},
table: [{1:[2,1],3:1,4:2,5:3,7:4,8:5,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{1:[3]},{1:[2,2],6:$VD},o($VE,[2,3]),o($VE,[2,6],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VE,[2,7],{119:69,110:92,116:93,111:$Vq,113:$Vr,117:$Vt,133:$VP}),o($VQ,[2,11],{88:94,69:95,77:101,73:$VR,74:$VS,75:$VT,76:$VU,78:$VV,81:$VW,91:$VX,92:$VY}),o($VQ,[2,12],{77:101,88:104,69:105,73:$VR,74:$VS,75:$VT,76:$VU,78:$VV,81:$VW,91:$VX,92:$VY}),o($VQ,[2,13]),o($VQ,[2,14]),o($VQ,[2,15]),o($VQ,[2,16]),o($VQ,[2,17]),o($VQ,[2,18]),o($VQ,[2,19]),o($VQ,[2,20]),o($VQ,[2,21]),o($VQ,[2,22]),o($VQ,[2,8]),o($VQ,[2,9]),o($VQ,[2,10]),o($VZ,$V_,{46:[1,106]}),o($VZ,[2,83]),o($VZ,[2,84]),o($VZ,[2,85]),o($VZ,[2,86]),o([1,6,25,26,34,38,56,61,64,73,74,75,76,78,80,81,85,91,93,98,100,109,111,112,113,117,118,133,136,137,142,143,144,145,146,147,148],[2,113],{89:107,92:$V$}),o([6,25,56,61],$V01,{55:109,62:110,63:111,27:113,51:114,65:115,66:116,28:$V1,64:$V11,83:$Vh,96:$V21,97:$V31}),{24:119,25:$V41},{7:121,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:123,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:124,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:125,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:127,8:126,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,139:[1,128],140:$VB,141:$VC},{12:130,13:131,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:132,51:63,65:47,66:48,68:129,70:23,71:24,72:25,83:$Vh,90:$Vj,95:$Vk,96:$Vl,97:$Vm,108:$Vp},{12:130,13:131,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:132,51:63,65:47,66:48,68:133,70:23,71:24,72:25,83:$Vh,90:$Vj,95:$Vk,96:$Vl,97:$Vm,108:$Vp},o($V51,$V61,{87:[1,137],140:[1,134],141:[1,135],149:[1,136]}),o($VQ,[2,192],{128:[1,138]}),{24:139,25:$V41},{24:140,25:$V41},o($VQ,[2,158]),{24:141,25:$V41},{7:142,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:[1,143],27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($V71,[2,103],{39:22,70:23,71:24,72:25,65:47,66:48,29:49,35:51,27:62,51:63,31:72,12:130,13:131,45:132,24:144,68:146,25:$V41,28:$V1,30:$V2,32:$V3,33:$V4,36:$V5,37:$V6,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,83:$Vh,87:[1,145],90:$Vj,95:$Vk,96:$Vl,97:$Vm,108:$Vp}),{7:147,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,142,143,144,145,146,147,148],[2,53],{12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,9:18,10:19,45:21,39:22,70:23,71:24,72:25,57:28,68:36,131:37,110:39,114:40,116:41,65:47,66:48,29:49,35:51,27:62,51:63,119:69,31:72,8:122,7:148,11:$V0,28:$V1,30:$V2,32:$V3,33:$V4,36:$V5,37:$V6,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,52:$Vc,53:$Vd,54:$Ve,58:$Vf,59:$Vg,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,115:$Vs,126:$Vu,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC}),o($VQ,[2,54]),o($V51,[2,80]),o($V51,[2,81]),o($VZ,[2,32]),o($VZ,[2,33]),o($VZ,[2,34]),o($VZ,[2,35]),o($VZ,[2,36]),o($VZ,[2,37]),o($VZ,[2,38]),{4:149,5:3,7:4,8:5,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:[1,150],27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:151,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:$V81,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,64:$V91,65:47,66:48,67:156,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,94:153,95:$Vk,96:$Vl,97:$Vm,98:$Va1,101:154,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VZ,[2,119]),o($VZ,[2,120],{27:158,28:$V1}),{25:[2,57]},{25:[2,58]},o($Vb1,[2,75]),o($Vb1,[2,78]),{7:159,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:160,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:161,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:163,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:162,25:$V41,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{27:168,28:$V1,51:169,65:170,66:171,71:164,83:$Vh,96:$V21,97:$Vm,121:165,122:[1,166],123:167},{120:172,124:[1,173],125:[1,174]},o([6,25,61,85],$Vc1,{31:72,84:175,47:176,48:177,50:178,10:179,29:180,27:181,51:182,28:$V1,30:$V2,32:$V3,33:$V4,53:$Vd,96:$V21}),o($Vd1,[2,26]),o($Vd1,[2,27]),o($VZ,[2,30]),{12:130,13:183,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:132,51:63,65:47,66:48,68:184,70:23,71:24,72:25,83:$Vh,90:$Vj,95:$Vk,96:$Vl,97:$Vm,108:$Vp},o($Ve1,[2,25]),o($Vd1,[2,28]),{4:185,5:3,7:4,8:5,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VE,[2,5],{7:4,8:5,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,9:18,10:19,45:21,39:22,70:23,71:24,72:25,57:28,68:36,131:37,110:39,114:40,116:41,65:47,66:48,29:49,35:51,27:62,51:63,119:69,31:72,5:186,11:$V0,28:$V1,30:$V2,32:$V3,33:$V4,36:$V5,37:$V6,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,52:$Vc,53:$Vd,54:$Ve,58:$Vf,59:$Vg,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,111:$Vq,113:$Vr,115:$Vs,117:$Vt,126:$Vu,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC}),o($VQ,[2,207]),{7:187,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:188,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:189,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:190,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:191,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:192,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:193,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:194,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:195,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VQ,[2,157]),o($VQ,[2,162]),{7:196,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VQ,[2,156]),o($VQ,[2,161]),{89:197,92:$V$},o($Vb1,[2,76]),{92:[2,116]},{27:198,28:$V1},{27:199,28:$V1},o($Vb1,[2,91],{27:200,28:$V1}),{27:201,28:$V1},o($Vb1,[2,92]),{7:203,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,64:$Vf1,65:47,66:48,68:36,70:23,71:24,72:25,79:202,82:204,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,99:205,100:$Vg1,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{77:208,78:$VV,81:$VW},{89:209,92:$V$},o($Vb1,[2,77]),{6:[1,211],7:210,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:[1,212],27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vh1,[2,114]),{7:215,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:$V81,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,64:$V91,65:47,66:48,67:156,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,93:[1,213],94:214,95:$Vk,96:$Vl,97:$Vm,101:154,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o([6,25],$Vi1,{60:218,56:[1,216],61:$Vj1}),o($Vk1,[2,62]),o($Vk1,[2,66],{46:[1,220],64:[1,219]}),o($Vk1,[2,69]),o($Vl1,[2,70]),o($Vl1,[2,71]),o($Vl1,[2,72]),o($Vl1,[2,73]),{27:158,28:$V1},{7:215,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:$V81,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,64:$V91,65:47,66:48,67:156,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,94:153,95:$Vk,96:$Vl,97:$Vm,98:$Va1,101:154,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VQ,[2,56]),{4:222,5:3,7:4,8:5,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,26:[1,221],27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,136,137,143,144,145,146,147,148],[2,196],{119:69,110:89,116:90,142:$VI}),{110:92,111:$Vq,113:$Vr,116:93,117:$Vt,119:69,133:$VP},o($Vm1,[2,197],{119:69,110:89,116:90,142:$VI,144:$VK}),o($Vm1,[2,198],{119:69,110:89,116:90,142:$VI,144:$VK}),o($Vm1,[2,199],{119:69,110:89,116:90,142:$VI,144:$VK}),o($VQ,[2,200],{119:69,110:92,116:93}),o($Vn1,[2,201],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{7:223,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VQ,[2,203],{73:$V61,74:$V61,75:$V61,76:$V61,78:$V61,81:$V61,91:$V61,92:$V61}),{69:95,73:$VR,74:$VS,75:$VT,76:$VU,77:101,78:$VV,81:$VW,88:94,91:$VX,92:$VY},{69:105,73:$VR,74:$VS,75:$VT,76:$VU,77:101,78:$VV,81:$VW,88:104,91:$VX,92:$VY},o($Vo1,$V_),o($VQ,[2,204],{73:$V61,74:$V61,75:$V61,76:$V61,78:$V61,81:$V61,91:$V61,92:$V61}),o($VQ,[2,205]),o($VQ,[2,206]),{6:[1,226],7:224,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:[1,225],27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:227,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{24:228,25:$V41,132:[1,229]},o($VQ,[2,141],{104:230,105:[1,231],106:[1,232]}),o($VQ,[2,155]),o($VQ,[2,163]),{25:[1,233],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},{127:234,129:235,130:$Vp1},o($VQ,[2,104]),{7:237,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($V71,[2,107],{24:238,25:$V41,73:$V61,74:$V61,75:$V61,76:$V61,78:$V61,81:$V61,91:$V61,92:$V61,87:[1,239]}),o($Vn1,[2,148],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vn1,[2,52],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{6:$VD,109:[1,240]},{4:241,5:3,7:4,8:5,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o([6,25,61,98],$Vq1,{119:69,110:89,116:90,99:242,64:[1,243],100:$Vg1,111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vr1,[2,122]),o([6,25,98],$Vi1,{60:244,61:$Vs1}),o($Vt1,[2,131]),{7:215,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:$V81,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,64:$V91,65:47,66:48,67:156,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,94:246,95:$Vk,96:$Vl,97:$Vm,101:154,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vt1,[2,137]),o($Vt1,[2,138]),o($Ve1,[2,121]),{24:247,25:$V41,110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},o($Vu1,[2,151],{119:69,110:89,116:90,111:$Vq,112:[1,248],113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vu1,[2,153],{119:69,110:89,116:90,111:$Vq,112:[1,249],113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VQ,[2,159]),o($Vv1,[2,160],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,133,136,137,142,143,144,145,146,147,148],[2,164],{118:[1,250]}),o($Vw1,[2,167]),{27:168,28:$V1,51:169,65:170,66:171,83:$Vh,96:$V21,97:$V31,121:251,123:167},o($Vw1,[2,173],{61:[1,252]}),o($Vx1,[2,169]),o($Vx1,[2,170]),o($Vx1,[2,171]),o($Vx1,[2,172]),o($VQ,[2,166]),{7:253,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:254,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o([6,25,85],$Vi1,{60:255,61:$Vy1}),o($Vz1,[2,99]),o($Vz1,[2,42],{49:[1,257]}),o($VA1,[2,50],{46:[1,258]}),o($Vz1,[2,47]),o($VA1,[2,51]),o($VB1,[2,48]),o($VB1,[2,49]),{38:[1,259],69:105,73:$VR,74:$VS,75:$VT,76:$VU,77:101,78:$VV,81:$VW,88:104,91:$VX,92:$VY},o($Vo1,$V61),{6:$VD,34:[1,260]},o($VE,[2,4]),o($VC1,[2,208],{119:69,110:89,116:90,142:$VI,143:$VJ,144:$VK}),o($VC1,[2,209],{119:69,110:89,116:90,142:$VI,143:$VJ,144:$VK}),o($Vm1,[2,210],{119:69,110:89,116:90,142:$VI,144:$VK}),o($Vm1,[2,211],{119:69,110:89,116:90,142:$VI,144:$VK}),o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,145,146,147,148],[2,212],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK}),o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,146,147],[2,213],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,148:$VO}),o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,147],[2,214],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,148:$VO}),o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,118,133,146,147,148],[2,215],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL}),o($Vv1,[2,195],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vv1,[2,194],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vh1,[2,111]),o($Vb1,[2,87]),o($Vb1,[2,88]),o($Vb1,[2,89]),o($Vb1,[2,90]),{80:[1,261]},{64:$Vf1,80:[2,95],99:262,100:$Vg1,110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},{80:[2,96]},{7:263,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,80:[2,130],83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VD1,[2,124]),o($VD1,$VE1),o($Vb1,[2,94]),o($Vh1,[2,112]),o($Vn1,[2,39],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{7:264,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:265,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vh1,[2,117]),o([6,25,93],$Vi1,{60:266,61:$Vs1}),o($Vt1,$Vq1,{119:69,110:89,116:90,64:[1,267],111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{57:268,58:$Vf,59:$Vg},o($VF1,$VG1,{63:111,27:113,51:114,65:115,66:116,62:269,28:$V1,64:$V11,83:$Vh,96:$V21,97:$V31}),{6:$VH1,25:$VI1},o($Vk1,[2,67]),{7:272,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VJ1,[2,23]),{6:$VD,26:[1,273]},o($Vn1,[2,202],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vn1,[2,216],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{7:274,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:275,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vn1,[2,219],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VQ,[2,193]),{7:276,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VQ,[2,142],{105:[1,277]}),{24:278,25:$V41},{24:281,25:$V41,27:279,28:$V1,66:280,83:$Vh},{127:282,129:235,130:$Vp1},{26:[1,283],128:[1,284],129:285,130:$Vp1},o($VK1,[2,186]),{7:287,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,102:286,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VL1,[2,105],{119:69,110:89,116:90,24:288,25:$V41,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VQ,[2,108]),{7:289,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VZ,[2,149]),{6:$VD,26:[1,290]},{7:291,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o([11,28,30,32,33,36,37,40,41,42,43,44,52,53,54,58,59,83,86,90,95,96,97,103,107,108,111,113,115,117,126,132,134,135,136,137,138,140,141],$VE1,{6:$VM1,25:$VM1,61:$VM1,98:$VM1}),{6:$VN1,25:$VO1,98:[1,292]},o([6,25,26,93,98],$VG1,{12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,9:18,10:19,45:21,39:22,70:23,71:24,72:25,57:28,68:36,131:37,110:39,114:40,116:41,65:47,66:48,29:49,35:51,27:62,51:63,119:69,31:72,8:122,67:156,7:215,101:295,11:$V0,28:$V1,30:$V2,32:$V3,33:$V4,36:$V5,37:$V6,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,52:$Vc,53:$Vd,54:$Ve,58:$Vf,59:$Vg,64:$V91,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,111:$Vq,113:$Vr,115:$Vs,117:$Vt,126:$Vu,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC}),o($VF1,$Vi1,{60:296,61:$Vs1}),o($VP1,[2,190]),{7:297,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:298,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:299,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vw1,[2,168]),{27:168,28:$V1,51:169,65:170,66:171,83:$Vh,96:$V21,97:$V31,123:300},o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,113,117,133],[2,175],{119:69,110:89,116:90,112:[1,301],118:[1,302],136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VQ1,[2,176],{119:69,110:89,116:90,112:[1,303],136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{6:$VR1,25:$VS1,85:[1,304]},o([6,25,26,85],$VG1,{31:72,48:177,50:178,10:179,29:180,27:181,51:182,47:307,28:$V1,30:$V2,32:$V3,33:$V4,53:$Vd,96:$V21}),{7:308,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:[1,309],27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:310,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:[1,311],27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VZ,[2,31]),o($Vd1,[2,29]),o($Vb1,[2,93]),{7:312,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,80:[2,128],83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{80:[2,129],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},o($Vn1,[2,40],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{26:[1,313],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},{6:$VN1,25:$VO1,93:[1,314]},o($Vt1,$VM1),{24:315,25:$V41},o($Vk1,[2,63]),{27:113,28:$V1,51:114,62:316,63:111,64:$V11,65:115,66:116,83:$Vh,96:$V21,97:$V31},o($VT1,$V01,{62:110,63:111,27:113,51:114,65:115,66:116,55:317,28:$V1,64:$V11,83:$Vh,96:$V21,97:$V31}),o($Vk1,[2,68],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VJ1,[2,24]),{26:[1,318],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},o($Vn1,[2,218],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{24:319,25:$V41,110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},{24:320,25:$V41},o($VQ,[2,143]),{24:321,25:$V41},{24:322,25:$V41},o($VU1,[2,147]),{26:[1,323],128:[1,324],129:285,130:$Vp1},o($VQ,[2,184]),{24:325,25:$V41},o($VK1,[2,187]),{24:326,25:$V41,61:[1,327]},o($VV1,[2,139],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VQ,[2,106]),o($VL1,[2,109],{119:69,110:89,116:90,24:328,25:$V41,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{109:[1,329]},{98:[1,330],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},o($Vr1,[2,123]),{7:215,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,64:$V91,65:47,66:48,67:156,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,101:331,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:215,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,25:$V81,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,64:$V91,65:47,66:48,67:156,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,94:332,95:$Vk,96:$Vl,97:$Vm,101:154,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vt1,[2,132]),{6:$VN1,25:$VO1,26:[1,333]},o($Vv1,[2,152],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vv1,[2,154],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vv1,[2,165],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vw1,[2,174]),{7:334,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:335,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:336,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vr1,[2,97]),{10:179,27:181,28:$V1,29:180,30:$V2,31:72,32:$V3,33:$V4,47:337,48:177,50:178,51:182,53:$Vd,96:$V21},o($VT1,$Vc1,{31:72,47:176,48:177,50:178,10:179,29:180,27:181,51:182,84:338,28:$V1,30:$V2,32:$V3,33:$V4,53:$Vd,96:$V21}),o($Vz1,[2,100]),o($Vz1,[2,43],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{7:339,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($Vz1,[2,45],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{7:340,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{80:[2,127],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},o($VQ,[2,41]),o($Vh1,[2,118]),o($VQ,[2,55]),o($Vk1,[2,64]),o($VF1,$Vi1,{60:341,61:$Vj1}),o($VQ,[2,217]),o($VP1,[2,191]),o($VQ,[2,144]),o($VU1,[2,145]),o($VU1,[2,146]),o($VQ,[2,182]),{24:342,25:$V41},{26:[1,343]},o($VK1,[2,188],{6:[1,344]}),{7:345,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},o($VQ,[2,110]),o($VZ,[2,150]),o($VZ,[2,126]),o($Vt1,[2,133]),o($VF1,$Vi1,{60:346,61:$Vs1}),o($Vt1,[2,134]),o([1,6,25,26,34,56,61,64,80,85,93,98,100,109,111,112,113,117,133],[2,177],{119:69,110:89,116:90,118:[1,347],136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($VQ1,[2,179],{119:69,110:89,116:90,112:[1,348],136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vn1,[2,178],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vz1,[2,101]),o($VF1,$Vi1,{60:349,61:$Vy1}),{26:[1,350],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},{26:[1,351],110:89,111:$Vq,113:$Vr,116:90,117:$Vt,119:69,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO},{6:$VH1,25:$VI1,26:[1,352]},{26:[1,353]},o($VQ,[2,185]),o($VK1,[2,189]),o($VV1,[2,140],{119:69,110:89,116:90,111:$Vq,113:$Vr,117:$Vt,133:$VF,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),{6:$VN1,25:$VO1,26:[1,354]},{7:355,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{7:356,8:122,9:18,10:19,11:$V0,12:6,13:7,14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,27:62,28:$V1,29:49,30:$V2,31:72,32:$V3,33:$V4,35:51,36:$V5,37:$V6,39:22,40:$V7,41:$V8,42:$V9,43:$Va,44:$Vb,45:21,51:63,52:$Vc,53:$Vd,54:$Ve,57:28,58:$Vf,59:$Vg,65:47,66:48,68:36,70:23,71:24,72:25,83:$Vh,86:$Vi,90:$Vj,95:$Vk,96:$Vl,97:$Vm,103:$Vn,107:$Vo,108:$Vp,110:39,111:$Vq,113:$Vr,114:40,115:$Vs,116:41,117:$Vt,119:69,126:$Vu,131:37,132:$Vv,134:$Vw,135:$Vx,136:$Vy,137:$Vz,138:$VA,140:$VB,141:$VC},{6:$VR1,25:$VS1,26:[1,357]},o($Vz1,[2,44]),o($Vz1,[2,46]),o($Vk1,[2,65]),o($VQ,[2,183]),o($Vt1,[2,135]),o($Vn1,[2,180],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vn1,[2,181],{119:69,110:89,116:90,136:$VG,137:$VH,142:$VI,143:$VJ,144:$VK,145:$VL,146:$VM,147:$VN,148:$VO}),o($Vz1,[2,102])],
defaultActions: {60:[2,57],61:[2,58],96:[2,116],204:[2,96]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        function lex() {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))

},{"_process":8,"fs":1,"path":7}],25:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var CoffeeScript, Module, binary, child_process, ext, findExtension, fork, helpers, i, len, loadFile, path, ref;

  CoffeeScript = require('./coffee-script');

  child_process = require('child_process');

  helpers = require('./helpers');

  path = require('path');

  loadFile = function(module, filename) {
    var answer;
    answer = CoffeeScript._compileFile(filename, false);
    return module._compile(answer, filename);
  };

  if (require.extensions) {
    ref = CoffeeScript.FILE_EXTENSIONS;
    for (i = 0, len = ref.length; i < len; i++) {
      ext = ref[i];
      require.extensions[ext] = loadFile;
    }
    Module = require('module');
    findExtension = function(filename) {
      var curExtension, extensions;
      extensions = path.basename(filename).split('.');
      if (extensions[0] === '') {
        extensions.shift();
      }
      while (extensions.shift()) {
        curExtension = '.' + extensions.join('.');
        if (Module._extensions[curExtension]) {
          return curExtension;
        }
      }
      return '.js';
    };
    Module.prototype.load = function(filename) {
      var extension;
      this.filename = filename;
      this.paths = Module._nodeModulePaths(path.dirname(filename));
      extension = findExtension(filename);
      Module._extensions[extension](this, filename);
      return this.loaded = true;
    };
  }

  if (child_process) {
    fork = child_process.fork;
    binary = require.resolve('../../bin/coffee');
    child_process.fork = function(path, args, options) {
      if (helpers.isCoffee(path)) {
        if (!Array.isArray(args)) {
          options = args || {};
          args = [];
        }
        args = [path].concat(args);
        path = binary;
      }
      return fork(path, args, options);
    };
  }

}).call(this);

},{"./coffee-script":20,"./helpers":21,"child_process":1,"module":1,"path":7}],26:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var BALANCED_PAIRS, CALL_CLOSERS, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, IMPLICIT_CALL, IMPLICIT_END, IMPLICIT_FUNC, IMPLICIT_UNSPACED_CALL, INVERSES, LINEBREAKS, SINGLE_CLOSERS, SINGLE_LINERS, generate, k, left, len, ref, rite,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  generate = function(tag, value, origin) {
    var tok;
    tok = [tag, value];
    tok.generated = true;
    if (origin) {
      tok.origin = origin;
    }
    return tok;
  };

  exports.Rewriter = (function() {
    function Rewriter() {}

    Rewriter.prototype.rewrite = function(tokens1) {
      this.tokens = tokens1;
      this.removeLeadingNewlines();
      this.closeOpenCalls();
      this.closeOpenIndexes();
      this.normalizeLines();
      this.tagPostfixConditionals();
      this.addImplicitBracesAndParens();
      this.addLocationDataToGeneratedTokens();
      return this.tokens;
    };

    Rewriter.prototype.scanTokens = function(block) {
      var i, token, tokens;
      tokens = this.tokens;
      i = 0;
      while (token = tokens[i]) {
        i += block.call(this, token, i, tokens);
      }
      return true;
    };

    Rewriter.prototype.detectEnd = function(i, condition, action) {
      var levels, ref, ref1, token, tokens;
      tokens = this.tokens;
      levels = 0;
      while (token = tokens[i]) {
        if (levels === 0 && condition.call(this, token, i)) {
          return action.call(this, token, i);
        }
        if (!token || levels < 0) {
          return action.call(this, token, i - 1);
        }
        if (ref = token[0], indexOf.call(EXPRESSION_START, ref) >= 0) {
          levels += 1;
        } else if (ref1 = token[0], indexOf.call(EXPRESSION_END, ref1) >= 0) {
          levels -= 1;
        }
        i += 1;
      }
      return i - 1;
    };

    Rewriter.prototype.removeLeadingNewlines = function() {
      var i, k, len, ref, tag;
      ref = this.tokens;
      for (i = k = 0, len = ref.length; k < len; i = ++k) {
        tag = ref[i][0];
        if (tag !== 'TERMINATOR') {
          break;
        }
      }
      if (i) {
        return this.tokens.splice(0, i);
      }
    };

    Rewriter.prototype.closeOpenCalls = function() {
      var action, condition;
      condition = function(token, i) {
        var ref;
        return ((ref = token[0]) === ')' || ref === 'CALL_END') || token[0] === 'OUTDENT' && this.tag(i - 1) === ')';
      };
      action = function(token, i) {
        return this.tokens[token[0] === 'OUTDENT' ? i - 1 : i][0] = 'CALL_END';
      };
      return this.scanTokens(function(token, i) {
        if (token[0] === 'CALL_START') {
          this.detectEnd(i + 1, condition, action);
        }
        return 1;
      });
    };

    Rewriter.prototype.closeOpenIndexes = function() {
      var action, condition;
      condition = function(token, i) {
        var ref;
        return (ref = token[0]) === ']' || ref === 'INDEX_END';
      };
      action = function(token, i) {
        return token[0] = 'INDEX_END';
      };
      return this.scanTokens(function(token, i) {
        if (token[0] === 'INDEX_START') {
          this.detectEnd(i + 1, condition, action);
        }
        return 1;
      });
    };

    Rewriter.prototype.indexOfTag = function() {
      var fuzz, i, j, k, pattern, ref, ref1;
      i = arguments[0], pattern = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      fuzz = 0;
      for (j = k = 0, ref = pattern.length; 0 <= ref ? k < ref : k > ref; j = 0 <= ref ? ++k : --k) {
        while (this.tag(i + j + fuzz) === 'HERECOMMENT') {
          fuzz += 2;
        }
        if (pattern[j] == null) {
          continue;
        }
        if (typeof pattern[j] === 'string') {
          pattern[j] = [pattern[j]];
        }
        if (ref1 = this.tag(i + j + fuzz), indexOf.call(pattern[j], ref1) < 0) {
          return -1;
        }
      }
      return i + j + fuzz - 1;
    };

    Rewriter.prototype.looksObjectish = function(j) {
      var end, index;
      if (this.indexOfTag(j, '@', null, ':') > -1 || this.indexOfTag(j, null, ':') > -1) {
        return true;
      }
      index = this.indexOfTag(j, EXPRESSION_START);
      if (index > -1) {
        end = null;
        this.detectEnd(index + 1, (function(token) {
          var ref;
          return ref = token[0], indexOf.call(EXPRESSION_END, ref) >= 0;
        }), (function(token, i) {
          return end = i;
        }));
        if (this.tag(end + 1) === ':') {
          return true;
        }
      }
      return false;
    };

    Rewriter.prototype.findTagsBackwards = function(i, tags) {
      var backStack, ref, ref1, ref2, ref3, ref4, ref5;
      backStack = [];
      while (i >= 0 && (backStack.length || (ref2 = this.tag(i), indexOf.call(tags, ref2) < 0) && ((ref3 = this.tag(i), indexOf.call(EXPRESSION_START, ref3) < 0) || this.tokens[i].generated) && (ref4 = this.tag(i), indexOf.call(LINEBREAKS, ref4) < 0))) {
        if (ref = this.tag(i), indexOf.call(EXPRESSION_END, ref) >= 0) {
          backStack.push(this.tag(i));
        }
        if ((ref1 = this.tag(i), indexOf.call(EXPRESSION_START, ref1) >= 0) && backStack.length) {
          backStack.pop();
        }
        i -= 1;
      }
      return ref5 = this.tag(i), indexOf.call(tags, ref5) >= 0;
    };

    Rewriter.prototype.addImplicitBracesAndParens = function() {
      var stack, start;
      stack = [];
      start = null;
      return this.scanTokens(function(token, i, tokens) {
        var endImplicitCall, endImplicitObject, forward, inImplicit, inImplicitCall, inImplicitControl, inImplicitObject, newLine, nextTag, offset, prevTag, prevToken, ref, ref1, ref2, ref3, ref4, ref5, s, sameLine, stackIdx, stackTag, stackTop, startIdx, startImplicitCall, startImplicitObject, startsLine, tag;
        tag = token[0];
        prevTag = (prevToken = i > 0 ? tokens[i - 1] : [])[0];
        nextTag = (i < tokens.length - 1 ? tokens[i + 1] : [])[0];
        stackTop = function() {
          return stack[stack.length - 1];
        };
        startIdx = i;
        forward = function(n) {
          return i - startIdx + n;
        };
        inImplicit = function() {
          var ref, ref1;
          return (ref = stackTop()) != null ? (ref1 = ref[2]) != null ? ref1.ours : void 0 : void 0;
        };
        inImplicitCall = function() {
          var ref;
          return inImplicit() && ((ref = stackTop()) != null ? ref[0] : void 0) === '(';
        };
        inImplicitObject = function() {
          var ref;
          return inImplicit() && ((ref = stackTop()) != null ? ref[0] : void 0) === '{';
        };
        inImplicitControl = function() {
          var ref;
          return inImplicit && ((ref = stackTop()) != null ? ref[0] : void 0) === 'CONTROL';
        };
        startImplicitCall = function(j) {
          var idx;
          idx = j != null ? j : i;
          stack.push([
            '(', idx, {
              ours: true
            }
          ]);
          tokens.splice(idx, 0, generate('CALL_START', '('));
          if (j == null) {
            return i += 1;
          }
        };
        endImplicitCall = function() {
          stack.pop();
          tokens.splice(i, 0, generate('CALL_END', ')', ['', 'end of input', token[2]]));
          return i += 1;
        };
        startImplicitObject = function(j, startsLine) {
          var idx, val;
          if (startsLine == null) {
            startsLine = true;
          }
          idx = j != null ? j : i;
          stack.push([
            '{', idx, {
              sameLine: true,
              startsLine: startsLine,
              ours: true
            }
          ]);
          val = new String('{');
          val.generated = true;
          tokens.splice(idx, 0, generate('{', val, token));
          if (j == null) {
            return i += 1;
          }
        };
        endImplicitObject = function(j) {
          j = j != null ? j : i;
          stack.pop();
          tokens.splice(j, 0, generate('}', '}', token));
          return i += 1;
        };
        if (inImplicitCall() && (tag === 'IF' || tag === 'TRY' || tag === 'FINALLY' || tag === 'CATCH' || tag === 'CLASS' || tag === 'SWITCH')) {
          stack.push([
            'CONTROL', i, {
              ours: true
            }
          ]);
          return forward(1);
        }
        if (tag === 'INDENT' && inImplicit()) {
          if (prevTag !== '=>' && prevTag !== '->' && prevTag !== '[' && prevTag !== '(' && prevTag !== ',' && prevTag !== '{' && prevTag !== 'TRY' && prevTag !== 'ELSE' && prevTag !== '=') {
            while (inImplicitCall()) {
              endImplicitCall();
            }
          }
          if (inImplicitControl()) {
            stack.pop();
          }
          stack.push([tag, i]);
          return forward(1);
        }
        if (indexOf.call(EXPRESSION_START, tag) >= 0) {
          stack.push([tag, i]);
          return forward(1);
        }
        if (indexOf.call(EXPRESSION_END, tag) >= 0) {
          while (inImplicit()) {
            if (inImplicitCall()) {
              endImplicitCall();
            } else if (inImplicitObject()) {
              endImplicitObject();
            } else {
              stack.pop();
            }
          }
          start = stack.pop();
        }
        if ((indexOf.call(IMPLICIT_FUNC, tag) >= 0 && token.spaced || tag === '?' && i > 0 && !tokens[i - 1].spaced) && (indexOf.call(IMPLICIT_CALL, nextTag) >= 0 || indexOf.call(IMPLICIT_UNSPACED_CALL, nextTag) >= 0 && !((ref = tokens[i + 1]) != null ? ref.spaced : void 0) && !((ref1 = tokens[i + 1]) != null ? ref1.newLine : void 0))) {
          if (tag === '?') {
            tag = token[0] = 'FUNC_EXIST';
          }
          startImplicitCall(i + 1);
          return forward(2);
        }
        if (indexOf.call(IMPLICIT_FUNC, tag) >= 0 && this.indexOfTag(i + 1, 'INDENT') > -1 && this.looksObjectish(i + 2) && !this.findTagsBackwards(i, ['CLASS', 'EXTENDS', 'IF', 'CATCH', 'SWITCH', 'LEADING_WHEN', 'FOR', 'WHILE', 'UNTIL'])) {
          startImplicitCall(i + 1);
          stack.push(['INDENT', i + 2]);
          return forward(3);
        }
        if (tag === ':') {
          s = (function() {
            var ref2;
            switch (false) {
              case ref2 = this.tag(i - 1), indexOf.call(EXPRESSION_END, ref2) < 0:
                return start[1];
              case this.tag(i - 2) !== '@':
                return i - 2;
              default:
                return i - 1;
            }
          }).call(this);
          while (this.tag(s - 2) === 'HERECOMMENT') {
            s -= 2;
          }
          this.insideForDeclaration = nextTag === 'FOR';
          startsLine = s === 0 || (ref2 = this.tag(s - 1), indexOf.call(LINEBREAKS, ref2) >= 0) || tokens[s - 1].newLine;
          if (stackTop()) {
            ref3 = stackTop(), stackTag = ref3[0], stackIdx = ref3[1];
            if ((stackTag === '{' || stackTag === 'INDENT' && this.tag(stackIdx - 1) === '{') && (startsLine || this.tag(s - 1) === ',' || this.tag(s - 1) === '{')) {
              return forward(1);
            }
          }
          startImplicitObject(s, !!startsLine);
          return forward(2);
        }
        if (inImplicitObject() && indexOf.call(LINEBREAKS, tag) >= 0) {
          stackTop()[2].sameLine = false;
        }
        newLine = prevTag === 'OUTDENT' || prevToken.newLine;
        if (indexOf.call(IMPLICIT_END, tag) >= 0 || indexOf.call(CALL_CLOSERS, tag) >= 0 && newLine) {
          while (inImplicit()) {
            ref4 = stackTop(), stackTag = ref4[0], stackIdx = ref4[1], (ref5 = ref4[2], sameLine = ref5.sameLine, startsLine = ref5.startsLine);
            if (inImplicitCall() && prevTag !== ',') {
              endImplicitCall();
            } else if (inImplicitObject() && !this.insideForDeclaration && sameLine && tag !== 'TERMINATOR' && prevTag !== ':') {
              endImplicitObject();
            } else if (inImplicitObject() && tag === 'TERMINATOR' && prevTag !== ',' && !(startsLine && this.looksObjectish(i + 1))) {
              if (nextTag === 'HERECOMMENT') {
                return forward(1);
              }
              endImplicitObject();
            } else {
              break;
            }
          }
        }
        if (tag === ',' && !this.looksObjectish(i + 1) && inImplicitObject() && !this.insideForDeclaration && (nextTag !== 'TERMINATOR' || !this.looksObjectish(i + 2))) {
          offset = nextTag === 'OUTDENT' ? 1 : 0;
          while (inImplicitObject()) {
            endImplicitObject(i + offset);
          }
        }
        return forward(1);
      });
    };

    Rewriter.prototype.addLocationDataToGeneratedTokens = function() {
      return this.scanTokens(function(token, i, tokens) {
        var column, line, nextLocation, prevLocation, ref, ref1;
        if (token[2]) {
          return 1;
        }
        if (!(token.generated || token.explicit)) {
          return 1;
        }
        if (token[0] === '{' && (nextLocation = (ref = tokens[i + 1]) != null ? ref[2] : void 0)) {
          line = nextLocation.first_line, column = nextLocation.first_column;
        } else if (prevLocation = (ref1 = tokens[i - 1]) != null ? ref1[2] : void 0) {
          line = prevLocation.last_line, column = prevLocation.last_column;
        } else {
          line = column = 0;
        }
        token[2] = {
          first_line: line,
          first_column: column,
          last_line: line,
          last_column: column
        };
        return 1;
      });
    };

    Rewriter.prototype.normalizeLines = function() {
      var action, condition, indent, outdent, starter;
      starter = indent = outdent = null;
      condition = function(token, i) {
        var ref, ref1, ref2, ref3;
        return token[1] !== ';' && (ref = token[0], indexOf.call(SINGLE_CLOSERS, ref) >= 0) && !(token[0] === 'TERMINATOR' && (ref1 = this.tag(i + 1), indexOf.call(EXPRESSION_CLOSE, ref1) >= 0)) && !(token[0] === 'ELSE' && starter !== 'THEN') && !(((ref2 = token[0]) === 'CATCH' || ref2 === 'FINALLY') && (starter === '->' || starter === '=>')) || (ref3 = token[0], indexOf.call(CALL_CLOSERS, ref3) >= 0) && this.tokens[i - 1].newLine;
      };
      action = function(token, i) {
        return this.tokens.splice((this.tag(i - 1) === ',' ? i - 1 : i), 0, outdent);
      };
      return this.scanTokens(function(token, i, tokens) {
        var j, k, ref, ref1, ref2, tag;
        tag = token[0];
        if (tag === 'TERMINATOR') {
          if (this.tag(i + 1) === 'ELSE' && this.tag(i - 1) !== 'OUTDENT') {
            tokens.splice.apply(tokens, [i, 1].concat(slice.call(this.indentation())));
            return 1;
          }
          if (ref = this.tag(i + 1), indexOf.call(EXPRESSION_CLOSE, ref) >= 0) {
            tokens.splice(i, 1);
            return 0;
          }
        }
        if (tag === 'CATCH') {
          for (j = k = 1; k <= 2; j = ++k) {
            if (!((ref1 = this.tag(i + j)) === 'OUTDENT' || ref1 === 'TERMINATOR' || ref1 === 'FINALLY')) {
              continue;
            }
            tokens.splice.apply(tokens, [i + j, 0].concat(slice.call(this.indentation())));
            return 2 + j;
          }
        }
        if (indexOf.call(SINGLE_LINERS, tag) >= 0 && this.tag(i + 1) !== 'INDENT' && !(tag === 'ELSE' && this.tag(i + 1) === 'IF')) {
          starter = tag;
          ref2 = this.indentation(tokens[i]), indent = ref2[0], outdent = ref2[1];
          if (starter === 'THEN') {
            indent.fromThen = true;
          }
          tokens.splice(i + 1, 0, indent);
          this.detectEnd(i + 2, condition, action);
          if (tag === 'THEN') {
            tokens.splice(i, 1);
          }
          return 1;
        }
        return 1;
      });
    };

    Rewriter.prototype.tagPostfixConditionals = function() {
      var action, condition, original;
      original = null;
      condition = function(token, i) {
        var prevTag, tag;
        tag = token[0];
        prevTag = this.tokens[i - 1][0];
        return tag === 'TERMINATOR' || (tag === 'INDENT' && indexOf.call(SINGLE_LINERS, prevTag) < 0);
      };
      action = function(token, i) {
        if (token[0] !== 'INDENT' || (token.generated && !token.fromThen)) {
          return original[0] = 'POST_' + original[0];
        }
      };
      return this.scanTokens(function(token, i) {
        if (token[0] !== 'IF') {
          return 1;
        }
        original = token;
        this.detectEnd(i + 1, condition, action);
        return 1;
      });
    };

    Rewriter.prototype.indentation = function(origin) {
      var indent, outdent;
      indent = ['INDENT', 2];
      outdent = ['OUTDENT', 2];
      if (origin) {
        indent.generated = outdent.generated = true;
        indent.origin = outdent.origin = origin;
      } else {
        indent.explicit = outdent.explicit = true;
      }
      return [indent, outdent];
    };

    Rewriter.prototype.generate = generate;

    Rewriter.prototype.tag = function(i) {
      var ref;
      return (ref = this.tokens[i]) != null ? ref[0] : void 0;
    };

    return Rewriter;

  })();

  BALANCED_PAIRS = [['(', ')'], ['[', ']'], ['{', '}'], ['INDENT', 'OUTDENT'], ['CALL_START', 'CALL_END'], ['PARAM_START', 'PARAM_END'], ['INDEX_START', 'INDEX_END'], ['STRING_START', 'STRING_END'], ['REGEX_START', 'REGEX_END']];

  exports.INVERSES = INVERSES = {};

  EXPRESSION_START = [];

  EXPRESSION_END = [];

  for (k = 0, len = BALANCED_PAIRS.length; k < len; k++) {
    ref = BALANCED_PAIRS[k], left = ref[0], rite = ref[1];
    EXPRESSION_START.push(INVERSES[rite] = left);
    EXPRESSION_END.push(INVERSES[left] = rite);
  }

  EXPRESSION_CLOSE = ['CATCH', 'THEN', 'ELSE', 'FINALLY'].concat(EXPRESSION_END);

  IMPLICIT_FUNC = ['IDENTIFIER', 'SUPER', ')', 'CALL_END', ']', 'INDEX_END', '@', 'THIS'];

  IMPLICIT_CALL = ['IDENTIFIER', 'NUMBER', 'STRING', 'STRING_START', 'JS', 'REGEX', 'REGEX_START', 'NEW', 'PARAM_START', 'CLASS', 'IF', 'TRY', 'SWITCH', 'THIS', 'BOOL', 'NULL', 'UNDEFINED', 'UNARY', 'YIELD', 'UNARY_MATH', 'SUPER', 'THROW', '@', '->', '=>', '[', '(', '{', '--', '++'];

  IMPLICIT_UNSPACED_CALL = ['+', '-'];

  IMPLICIT_END = ['POST_IF', 'FOR', 'WHILE', 'UNTIL', 'WHEN', 'BY', 'LOOP', 'TERMINATOR'];

  SINGLE_LINERS = ['ELSE', '->', '=>', 'TRY', 'FINALLY', 'THEN'];

  SINGLE_CLOSERS = ['TERMINATOR', 'CATCH', 'FINALLY', 'ELSE', 'OUTDENT', 'LEADING_WHEN'];

  LINEBREAKS = ['TERMINATOR', 'INDENT', 'OUTDENT'];

  CALL_CLOSERS = ['.', '?.', '::', '?::'];

}).call(this);

},{}],27:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var Scope,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  exports.Scope = Scope = (function() {
    function Scope(parent, expressions, method, referencedVars) {
      var ref, ref1;
      this.parent = parent;
      this.expressions = expressions;
      this.method = method;
      this.referencedVars = referencedVars;
      this.variables = [
        {
          name: 'arguments',
          type: 'arguments'
        }
      ];
      this.positions = {};
      if (!this.parent) {
        this.utilities = {};
      }
      this.root = (ref = (ref1 = this.parent) != null ? ref1.root : void 0) != null ? ref : this;
    }

    Scope.prototype.add = function(name, type, immediate) {
      if (this.shared && !immediate) {
        return this.parent.add(name, type, immediate);
      }
      if (Object.prototype.hasOwnProperty.call(this.positions, name)) {
        return this.variables[this.positions[name]].type = type;
      } else {
        return this.positions[name] = this.variables.push({
          name: name,
          type: type
        }) - 1;
      }
    };

    Scope.prototype.namedMethod = function() {
      var ref;
      if (((ref = this.method) != null ? ref.name : void 0) || !this.parent) {
        return this.method;
      }
      return this.parent.namedMethod();
    };

    Scope.prototype.find = function(name) {
      if (this.check(name)) {
        return true;
      }
      this.add(name, 'var');
      return false;
    };

    Scope.prototype.parameter = function(name) {
      if (this.shared && this.parent.check(name, true)) {
        return;
      }
      return this.add(name, 'param');
    };

    Scope.prototype.check = function(name) {
      var ref;
      return !!(this.type(name) || ((ref = this.parent) != null ? ref.check(name) : void 0));
    };

    Scope.prototype.temporary = function(name, index, single) {
      if (single == null) {
        single = false;
      }
      if (single) {
        return (index + parseInt(name, 36)).toString(36).replace(/\d/g, 'a');
      } else {
        return name + (index || '');
      }
    };

    Scope.prototype.type = function(name) {
      var i, len, ref, v;
      ref = this.variables;
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        if (v.name === name) {
          return v.type;
        }
      }
      return null;
    };

    Scope.prototype.freeVariable = function(name, options) {
      var index, ref, temp;
      if (options == null) {
        options = {};
      }
      index = 0;
      while (true) {
        temp = this.temporary(name, index, options.single);
        if (!(this.check(temp) || indexOf.call(this.root.referencedVars, temp) >= 0)) {
          break;
        }
        index++;
      }
      if ((ref = options.reserve) != null ? ref : true) {
        this.add(temp, 'var', true);
      }
      return temp;
    };

    Scope.prototype.assign = function(name, value) {
      this.add(name, {
        value: value,
        assigned: true
      }, true);
      return this.hasAssignments = true;
    };

    Scope.prototype.hasDeclarations = function() {
      return !!this.declaredVariables().length;
    };

    Scope.prototype.declaredVariables = function() {
      var v;
      return ((function() {
        var i, len, ref, results;
        ref = this.variables;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          v = ref[i];
          if (v.type === 'var') {
            results.push(v.name);
          }
        }
        return results;
      }).call(this)).sort();
    };

    Scope.prototype.assignedVariables = function() {
      var i, len, ref, results, v;
      ref = this.variables;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        if (v.type.assigned) {
          results.push(v.name + " = " + v.type.value);
        }
      }
      return results;
    };

    return Scope;

  })();

}).call(this);

},{}],28:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var LineMap, SourceMap;

  LineMap = (function() {
    function LineMap(line1) {
      this.line = line1;
      this.columns = [];
    }

    LineMap.prototype.add = function(column, arg, options) {
      var sourceColumn, sourceLine;
      sourceLine = arg[0], sourceColumn = arg[1];
      if (options == null) {
        options = {};
      }
      if (this.columns[column] && options.noReplace) {
        return;
      }
      return this.columns[column] = {
        line: this.line,
        column: column,
        sourceLine: sourceLine,
        sourceColumn: sourceColumn
      };
    };

    LineMap.prototype.sourceLocation = function(column) {
      var mapping;
      while (!((mapping = this.columns[column]) || (column <= 0))) {
        column--;
      }
      return mapping && [mapping.sourceLine, mapping.sourceColumn];
    };

    return LineMap;

  })();

  SourceMap = (function() {
    var BASE64_CHARS, VLQ_CONTINUATION_BIT, VLQ_SHIFT, VLQ_VALUE_MASK;

    function SourceMap() {
      this.lines = [];
    }

    SourceMap.prototype.add = function(sourceLocation, generatedLocation, options) {
      var base, column, line, lineMap;
      if (options == null) {
        options = {};
      }
      line = generatedLocation[0], column = generatedLocation[1];
      lineMap = ((base = this.lines)[line] || (base[line] = new LineMap(line)));
      return lineMap.add(column, sourceLocation, options);
    };

    SourceMap.prototype.sourceLocation = function(arg) {
      var column, line, lineMap;
      line = arg[0], column = arg[1];
      while (!((lineMap = this.lines[line]) || (line <= 0))) {
        line--;
      }
      return lineMap && lineMap.sourceLocation(column);
    };

    SourceMap.prototype.generate = function(options, code) {
      var buffer, i, j, lastColumn, lastSourceColumn, lastSourceLine, len, len1, lineMap, lineNumber, mapping, needComma, ref, ref1, v3, writingline;
      if (options == null) {
        options = {};
      }
      if (code == null) {
        code = null;
      }
      writingline = 0;
      lastColumn = 0;
      lastSourceLine = 0;
      lastSourceColumn = 0;
      needComma = false;
      buffer = "";
      ref = this.lines;
      for (lineNumber = i = 0, len = ref.length; i < len; lineNumber = ++i) {
        lineMap = ref[lineNumber];
        if (lineMap) {
          ref1 = lineMap.columns;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            mapping = ref1[j];
            if (!(mapping)) {
              continue;
            }
            while (writingline < mapping.line) {
              lastColumn = 0;
              needComma = false;
              buffer += ";";
              writingline++;
            }
            if (needComma) {
              buffer += ",";
              needComma = false;
            }
            buffer += this.encodeVlq(mapping.column - lastColumn);
            lastColumn = mapping.column;
            buffer += this.encodeVlq(0);
            buffer += this.encodeVlq(mapping.sourceLine - lastSourceLine);
            lastSourceLine = mapping.sourceLine;
            buffer += this.encodeVlq(mapping.sourceColumn - lastSourceColumn);
            lastSourceColumn = mapping.sourceColumn;
            needComma = true;
          }
        }
      }
      v3 = {
        version: 3,
        file: options.generatedFile || '',
        sourceRoot: options.sourceRoot || '',
        sources: options.sourceFiles || [''],
        names: [],
        mappings: buffer
      };
      if (options.inline) {
        v3.sourcesContent = [code];
      }
      return JSON.stringify(v3, null, 2);
    };

    VLQ_SHIFT = 5;

    VLQ_CONTINUATION_BIT = 1 << VLQ_SHIFT;

    VLQ_VALUE_MASK = VLQ_CONTINUATION_BIT - 1;

    SourceMap.prototype.encodeVlq = function(value) {
      var answer, nextChunk, signBit, valueToEncode;
      answer = '';
      signBit = value < 0 ? 1 : 0;
      valueToEncode = (Math.abs(value) << 1) + signBit;
      while (valueToEncode || !answer) {
        nextChunk = valueToEncode & VLQ_VALUE_MASK;
        valueToEncode = valueToEncode >> VLQ_SHIFT;
        if (valueToEncode) {
          nextChunk |= VLQ_CONTINUATION_BIT;
        }
        answer += this.encodeBase64(nextChunk);
      }
      return answer;
    };

    BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    SourceMap.prototype.encodeBase64 = function(value) {
      return BASE64_CHARS[value] || (function() {
        throw new Error("Cannot Base64 encode value: " + value);
      })();
    };

    return SourceMap;

  })();

  module.exports = SourceMap;

}).call(this);

},{}],29:[function(require,module,exports){
(function (process){
//
// ShellJS
// Unix shell commands on top of Node's API
//
// Copyright (c) 2012 Artur Adib
// http://github.com/arturadib/shelljs
//

var common = require('./src/common');


//@
//@ All commands run synchronously, unless otherwise stated.
//@

//@include ./src/cd
var _cd = require('./src/cd');
exports.cd = common.wrap('cd', _cd);

//@include ./src/pwd
var _pwd = require('./src/pwd');
exports.pwd = common.wrap('pwd', _pwd);

//@include ./src/ls
var _ls = require('./src/ls');
exports.ls = common.wrap('ls', _ls);

//@include ./src/find
var _find = require('./src/find');
exports.find = common.wrap('find', _find);

//@include ./src/cp
var _cp = require('./src/cp');
exports.cp = common.wrap('cp', _cp);

//@include ./src/rm
var _rm = require('./src/rm');
exports.rm = common.wrap('rm', _rm);

//@include ./src/mv
var _mv = require('./src/mv');
exports.mv = common.wrap('mv', _mv);

//@include ./src/mkdir
var _mkdir = require('./src/mkdir');
exports.mkdir = common.wrap('mkdir', _mkdir);

//@include ./src/test
var _test = require('./src/test');
exports.test = common.wrap('test', _test);

//@include ./src/cat
var _cat = require('./src/cat');
exports.cat = common.wrap('cat', _cat);

//@include ./src/to
var _to = require('./src/to');
String.prototype.to = common.wrap('to', _to);

//@include ./src/toEnd
var _toEnd = require('./src/toEnd');
String.prototype.toEnd = common.wrap('toEnd', _toEnd);

//@include ./src/sed
var _sed = require('./src/sed');
exports.sed = common.wrap('sed', _sed);

//@include ./src/grep
var _grep = require('./src/grep');
exports.grep = common.wrap('grep', _grep);

//@include ./src/which
var _which = require('./src/which');
exports.which = common.wrap('which', _which);

//@include ./src/echo
var _echo = require('./src/echo');
exports.echo = _echo; // don't common.wrap() as it could parse '-options'

//@include ./src/dirs
var _dirs = require('./src/dirs').dirs;
exports.dirs = common.wrap("dirs", _dirs);
var _pushd = require('./src/dirs').pushd;
exports.pushd = common.wrap('pushd', _pushd);
var _popd = require('./src/dirs').popd;
exports.popd = common.wrap("popd", _popd);

//@include ./src/ln
var _ln = require('./src/ln');
exports.ln = common.wrap('ln', _ln);

//@
//@ ### exit(code)
//@ Exits the current process with the given exit code.
exports.exit = process.exit;

//@
//@ ### env['VAR_NAME']
//@ Object containing environment variables (both getter and setter). Shortcut to process.env.
exports.env = process.env;

//@include ./src/exec
var _exec = require('./src/exec');
exports.exec = common.wrap('exec', _exec, {notUnix:true});

//@include ./src/chmod
var _chmod = require('./src/chmod');
exports.chmod = common.wrap('chmod', _chmod);



//@
//@ ## Non-Unix commands
//@

//@include ./src/tempdir
var _tempDir = require('./src/tempdir');
exports.tempdir = common.wrap('tempdir', _tempDir);


//@include ./src/error
var _error = require('./src/error');
exports.error = _error;



//@
//@ ## Configuration
//@

exports.config = common.config;

//@
//@ ### config.silent
//@ Example:
//@
//@ ```javascript
//@ var sh = require('shelljs');
//@ var silentState = sh.config.silent; // save old silent state
//@ sh.config.silent = true;
//@ /* ... */
//@ sh.config.silent = silentState; // restore old silent state
//@ ```
//@
//@ Suppresses all command output if `true`, except for `echo()` calls.
//@ Default is `false`.

//@
//@ ### config.fatal
//@ Example:
//@
//@ ```javascript
//@ require('shelljs/global');
//@ config.fatal = true;
//@ cp('this_file_does_not_exist', '/dev/null'); // dies here
//@ /* more commands... */
//@ ```
//@
//@ If `true` the script will die on errors. Default is `false`.

}).call(this,require('_process'))

},{"./src/cat":30,"./src/cd":31,"./src/chmod":32,"./src/common":33,"./src/cp":34,"./src/dirs":35,"./src/echo":36,"./src/error":37,"./src/exec":38,"./src/find":39,"./src/grep":40,"./src/ln":41,"./src/ls":42,"./src/mkdir":43,"./src/mv":44,"./src/pwd":45,"./src/rm":46,"./src/sed":47,"./src/tempdir":48,"./src/test":49,"./src/to":50,"./src/toEnd":51,"./src/which":52,"_process":8}],30:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');

//@
//@ ### cat(file [, file ...])
//@ ### cat(file_array)
//@
//@ Examples:
//@
//@ ```javascript
//@ var str = cat('file*.txt');
//@ var str = cat('file1', 'file2');
//@ var str = cat(['file1', 'file2']); // same as above
//@ ```
//@
//@ Returns a string containing the given file, or a concatenated string
//@ containing the files if more than one file is given (a new line character is
//@ introduced between each file). Wildcard `*` accepted.
function _cat(options, files) {
  var cat = '';

  if (!files)
    common.error('no paths given');

  if (typeof files === 'string')
    files = [].slice.call(arguments, 1);
  // if it's array leave it as it is

  files = common.expand(files);

  files.forEach(function(file) {
    if (!fs.existsSync(file))
      common.error('no such file or directory: ' + file);

    cat += fs.readFileSync(file, 'utf8') + '\n';
  });

  if (cat[cat.length-1] === '\n')
    cat = cat.substring(0, cat.length-1);

  return common.ShellString(cat);
}
module.exports = _cat;

},{"./common":33,"fs":1}],31:[function(require,module,exports){
(function (process){
var fs = require('fs');
var common = require('./common');

//@
//@ ### cd('dir')
//@ Changes to directory `dir` for the duration of the script
function _cd(options, dir) {
  if (!dir)
    common.error('directory not specified');

  if (!fs.existsSync(dir))
    common.error('no such file or directory: ' + dir);

  if (!fs.statSync(dir).isDirectory())
    common.error('not a directory: ' + dir);

  process.chdir(dir);
}
module.exports = _cd;

}).call(this,require('_process'))

},{"./common":33,"_process":8,"fs":1}],32:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');
var path = require('path');

var PERMS = (function (base) {
  return {
    OTHER_EXEC  : base.EXEC,
    OTHER_WRITE : base.WRITE,
    OTHER_READ  : base.READ,

    GROUP_EXEC  : base.EXEC  << 3,
    GROUP_WRITE : base.WRITE << 3,
    GROUP_READ  : base.READ << 3,

    OWNER_EXEC  : base.EXEC << 6,
    OWNER_WRITE : base.WRITE << 6,
    OWNER_READ  : base.READ << 6,

    // Literal octal numbers are apparently not allowed in "strict" javascript.  Using parseInt is
    // the preferred way, else a jshint warning is thrown.
    STICKY      : parseInt('01000', 8),
    SETGID      : parseInt('02000', 8),
    SETUID      : parseInt('04000', 8),

    TYPE_MASK   : parseInt('0770000', 8)
  };
})({
  EXEC  : 1,
  WRITE : 2,
  READ  : 4
});

//@
//@ ### chmod(octal_mode || octal_string, file)
//@ ### chmod(symbolic_mode, file)
//@
//@ Available options:
//@
//@ + `-v`: output a diagnostic for every file processed//@
//@ + `-c`: like verbose but report only when a change is made//@
//@ + `-R`: change files and directories recursively//@
//@
//@ Examples:
//@
//@ ```javascript
//@ chmod(755, '/Users/brandon');
//@ chmod('755', '/Users/brandon'); // same as above
//@ chmod('u+x', '/Users/brandon');
//@ ```
//@
//@ Alters the permissions of a file or directory by either specifying the
//@ absolute permissions in octal form or expressing the changes in symbols.
//@ This command tries to mimic the POSIX behavior as much as possible.
//@ Notable exceptions:
//@
//@ + In symbolic modes, 'a-r' and '-r' are identical.  No consideration is
//@   given to the umask.
//@ + There is no "quiet" option since default behavior is to run silent.
function _chmod(options, mode, filePattern) {
  if (!filePattern) {
    if (options.length > 0 && options.charAt(0) === '-') {
      // Special case where the specified file permissions started with - to subtract perms, which
      // get picked up by the option parser as command flags.
      // If we are down by one argument and options starts with -, shift everything over.
      filePattern = mode;
      mode = options;
      options = '';
    }
    else {
      common.error('You must specify a file.');
    }
  }

  options = common.parseOptions(options, {
    'R': 'recursive',
    'c': 'changes',
    'v': 'verbose'
  });

  if (typeof filePattern === 'string') {
    filePattern = [ filePattern ];
  }

  var files;

  if (options.recursive) {
    files = [];
    common.expand(filePattern).forEach(function addFile(expandedFile) {
      var stat = fs.lstatSync(expandedFile);

      if (!stat.isSymbolicLink()) {
        files.push(expandedFile);

        if (stat.isDirectory()) {  // intentionally does not follow symlinks.
          fs.readdirSync(expandedFile).forEach(function (child) {
            addFile(expandedFile + '/' + child);
          });
        }
      }
    });
  }
  else {
    files = common.expand(filePattern);
  }

  files.forEach(function innerChmod(file) {
    file = path.resolve(file);
    if (!fs.existsSync(file)) {
      common.error('File not found: ' + file);
    }

    // When recursing, don't follow symlinks.
    if (options.recursive && fs.lstatSync(file).isSymbolicLink()) {
      return;
    }

    var perms = fs.statSync(file).mode;
    var type = perms & PERMS.TYPE_MASK;

    var newPerms = perms;

    if (isNaN(parseInt(mode, 8))) {
      // parse options
      mode.split(',').forEach(function (symbolicMode) {
        /*jshint regexdash:true */
        var pattern = /([ugoa]*)([=\+-])([rwxXst]*)/i;
        var matches = pattern.exec(symbolicMode);

        if (matches) {
          var applyTo = matches[1];
          var operator = matches[2];
          var change = matches[3];

          var changeOwner = applyTo.indexOf('u') != -1 || applyTo === 'a' || applyTo === '';
          var changeGroup = applyTo.indexOf('g') != -1 || applyTo === 'a' || applyTo === '';
          var changeOther = applyTo.indexOf('o') != -1 || applyTo === 'a' || applyTo === '';

          var changeRead   = change.indexOf('r') != -1;
          var changeWrite  = change.indexOf('w') != -1;
          var changeExec   = change.indexOf('x') != -1;
          var changeSticky = change.indexOf('t') != -1;
          var changeSetuid = change.indexOf('s') != -1;

          var mask = 0;
          if (changeOwner) {
            mask |= (changeRead ? PERMS.OWNER_READ : 0) + (changeWrite ? PERMS.OWNER_WRITE : 0) + (changeExec ? PERMS.OWNER_EXEC : 0) + (changeSetuid ? PERMS.SETUID : 0);
          }
          if (changeGroup) {
            mask |= (changeRead ? PERMS.GROUP_READ : 0) + (changeWrite ? PERMS.GROUP_WRITE : 0) + (changeExec ? PERMS.GROUP_EXEC : 0) + (changeSetuid ? PERMS.SETGID : 0);
          }
          if (changeOther) {
            mask |= (changeRead ? PERMS.OTHER_READ : 0) + (changeWrite ? PERMS.OTHER_WRITE : 0) + (changeExec ? PERMS.OTHER_EXEC : 0);
          }

          // Sticky bit is special - it's not tied to user, group or other.
          if (changeSticky) {
            mask |= PERMS.STICKY;
          }

          switch (operator) {
            case '+':
              newPerms |= mask;
              break;

            case '-':
              newPerms &= ~mask;
              break;

            case '=':
              newPerms = type + mask;

              // According to POSIX, when using = to explicitly set the permissions, setuid and setgid can never be cleared.
              if (fs.statSync(file).isDirectory()) {
                newPerms |= (PERMS.SETUID + PERMS.SETGID) & perms;
              }
              break;
          }

          if (options.verbose) {
            log(file + ' -> ' + newPerms.toString(8));
          }

          if (perms != newPerms) {
            if (!options.verbose && options.changes) {
              log(file + ' -> ' + newPerms.toString(8));
            }
            fs.chmodSync(file, newPerms);
          }
        }
        else {
          common.error('Invalid symbolic mode change: ' + symbolicMode);
        }
      });
    }
    else {
      // they gave us a full number
      newPerms = type + parseInt(mode, 8);

      // POSIX rules are that setuid and setgid can only be added using numeric form, but not cleared.
      if (fs.statSync(file).isDirectory()) {
        newPerms |= (PERMS.SETUID + PERMS.SETGID) & perms;
      }

      fs.chmodSync(file, newPerms);
    }
  });
}
module.exports = _chmod;

},{"./common":33,"fs":1,"path":7}],33:[function(require,module,exports){
(function (process){
var os = require('os');
var fs = require('fs');
var _ls = require('./ls');

// Module globals
var config = {
  silent: false,
  fatal: false
};
exports.config = config;

var state = {
  error: null,
  currentCmd: 'shell.js',
  tempDir: null
};
exports.state = state;

var platform = os.type().match(/^Win/) ? 'win' : 'unix';
exports.platform = platform;

function log() {
  if (!config.silent)
    console.log.apply(this, arguments);
}
exports.log = log;

// Shows error message. Throws unless _continue or config.fatal are true
function error(msg, _continue) {
  if (state.error === null)
    state.error = '';
  state.error += state.currentCmd + ': ' + msg + '\n';

  if (msg.length > 0)
    log(state.error);

  if (config.fatal)
    process.exit(1);

  if (!_continue)
    throw '';
}
exports.error = error;

// In the future, when Proxies are default, we can add methods like `.to()` to primitive strings.
// For now, this is a dummy function to bookmark places we need such strings
function ShellString(str) {
  return str;
}
exports.ShellString = ShellString;

// Returns {'alice': true, 'bob': false} when passed a dictionary, e.g.:
//   parseOptions('-a', {'a':'alice', 'b':'bob'});
function parseOptions(str, map) {
  if (!map)
    error('parseOptions() internal error: no map given');

  // All options are false by default
  var options = {};
  for (var letter in map)
    options[map[letter]] = false;

  if (!str)
    return options; // defaults

  if (typeof str !== 'string')
    error('parseOptions() internal error: wrong str');

  // e.g. match[1] = 'Rf' for str = '-Rf'
  var match = str.match(/^\-(.+)/);
  if (!match)
    return options;

  // e.g. chars = ['R', 'f']
  var chars = match[1].split('');

  chars.forEach(function(c) {
    if (c in map)
      options[map[c]] = true;
    else
      error('option not recognized: '+c);
  });

  return options;
}
exports.parseOptions = parseOptions;

// Expands wildcards with matching (ie. existing) file names.
// For example:
//   expand(['file*.js']) = ['file1.js', 'file2.js', ...]
//   (if the files 'file1.js', 'file2.js', etc, exist in the current dir)
function expand(list) {
  var expanded = [];
  list.forEach(function(listEl) {
    // Wildcard present on directory names ?
    if(listEl.search(/\*[^\/]*\//) > -1 || listEl.search(/\*\*[^\/]*\//) > -1) {
      var match = listEl.match(/^([^*]+\/|)(.*)/);
      var root = match[1];
      var rest = match[2];
      var restRegex = rest.replace(/\*\*/g, ".*").replace(/\*/g, "[^\\/]*");
      restRegex = new RegExp(restRegex);
      
      _ls('-R', root).filter(function (e) {
        return restRegex.test(e);
      }).forEach(function(file) {
        expanded.push(file);
      });
    }
    // Wildcard present on file names ?
    else if (listEl.search(/\*/) > -1) {
      _ls('', listEl).forEach(function(file) {
        expanded.push(file);
      });
    } else {
      expanded.push(listEl);
    }
  });
  return expanded;
}
exports.expand = expand;

// Normalizes _unlinkSync() across platforms to match Unix behavior, i.e.
// file can be unlinked even if it's read-only, see https://github.com/joyent/node/issues/3006
function unlinkSync(file) {
  try {
    fs.unlinkSync(file);
  } catch(e) {
    // Try to override file permission
    if (e.code === 'EPERM') {
      fs.chmodSync(file, '0666');
      fs.unlinkSync(file);
    } else {
      throw e;
    }
  }
}
exports.unlinkSync = unlinkSync;

// e.g. 'shelljs_a5f185d0443ca...'
function randomFileName() {
  function randomHash(count) {
    if (count === 1)
      return parseInt(16*Math.random(), 10).toString(16);
    else {
      var hash = '';
      for (var i=0; i<count; i++)
        hash += randomHash(1);
      return hash;
    }
  }

  return 'shelljs_'+randomHash(20);
}
exports.randomFileName = randomFileName;

// extend(target_obj, source_obj1 [, source_obj2 ...])
// Shallow extend, e.g.:
//    extend({A:1}, {b:2}, {c:3}) returns {A:1, b:2, c:3}
function extend(target) {
  var sources = [].slice.call(arguments, 1);
  sources.forEach(function(source) {
    for (var key in source)
      target[key] = source[key];
  });

  return target;
}
exports.extend = extend;

// Common wrapper for all Unix-like commands
function wrap(cmd, fn, options) {
  return function() {
    var retValue = null;

    state.currentCmd = cmd;
    state.error = null;

    try {
      var args = [].slice.call(arguments, 0);

      if (options && options.notUnix) {
        retValue = fn.apply(this, args);
      } else {
        if (args.length === 0 || typeof args[0] !== 'string' || args[0][0] !== '-')
          args.unshift(''); // only add dummy option if '-option' not already present
        retValue = fn.apply(this, args);
      }
    } catch (e) {
      if (!state.error) {
        // If state.error hasn't been set it's an error thrown by Node, not us - probably a bug...
        console.log('shell.js: internal error');
        console.log(e.stack || e);
        process.exit(1);
      }
      if (config.fatal)
        throw e;
    }

    state.currentCmd = 'shell.js';
    return retValue;
  };
} // wrap
exports.wrap = wrap;

}).call(this,require('_process'))

},{"./ls":42,"_process":8,"fs":1,"os":6}],34:[function(require,module,exports){
(function (Buffer){
var fs = require('fs');
var path = require('path');
var common = require('./common');
var os = require('os');

// Buffered file copy, synchronous
// (Using readFileSync() + writeFileSync() could easily cause a memory overflow
//  with large files)
function copyFileSync(srcFile, destFile) {
  if (!fs.existsSync(srcFile))
    common.error('copyFileSync: no such file or directory: ' + srcFile);

  var BUF_LENGTH = 64*1024,
      buf = new Buffer(BUF_LENGTH),
      bytesRead = BUF_LENGTH,
      pos = 0,
      fdr = null,
      fdw = null;

  try {
    fdr = fs.openSync(srcFile, 'r');
  } catch(e) {
    common.error('copyFileSync: could not read src file ('+srcFile+')');
  }

  try {
    fdw = fs.openSync(destFile, 'w');
  } catch(e) {
    common.error('copyFileSync: could not write to dest file (code='+e.code+'):'+destFile);
  }

  while (bytesRead === BUF_LENGTH) {
    bytesRead = fs.readSync(fdr, buf, 0, BUF_LENGTH, pos);
    fs.writeSync(fdw, buf, 0, bytesRead);
    pos += bytesRead;
  }

  fs.closeSync(fdr);
  fs.closeSync(fdw);

  fs.chmodSync(destFile, fs.statSync(srcFile).mode);
}

// Recursively copies 'sourceDir' into 'destDir'
// Adapted from https://github.com/ryanmcgrath/wrench-js
//
// Copyright (c) 2010 Ryan McGrath
// Copyright (c) 2012 Artur Adib
//
// Licensed under the MIT License
// http://www.opensource.org/licenses/mit-license.php
function cpdirSyncRecursive(sourceDir, destDir, opts) {
  if (!opts) opts = {};

  /* Create the directory where all our junk is moving to; read the mode of the source directory and mirror it */
  var checkDir = fs.statSync(sourceDir);
  try {
    fs.mkdirSync(destDir, checkDir.mode);
  } catch (e) {
    //if the directory already exists, that's okay
    if (e.code !== 'EEXIST') throw e;
  }

  var files = fs.readdirSync(sourceDir);

  for (var i = 0; i < files.length; i++) {
    var srcFile = sourceDir + "/" + files[i];
    var destFile = destDir + "/" + files[i];
    var srcFileStat = fs.lstatSync(srcFile);

    if (srcFileStat.isDirectory()) {
      /* recursion this thing right on back. */
      cpdirSyncRecursive(srcFile, destFile, opts);
    } else if (srcFileStat.isSymbolicLink()) {
      var symlinkFull = fs.readlinkSync(srcFile);
      fs.symlinkSync(symlinkFull, destFile, os.platform() === "win32" ? "junction" : null);
    } else {
      /* At this point, we've hit a file actually worth copying... so copy it on over. */
      if (fs.existsSync(destFile) && !opts.force) {
        common.log('skipping existing file: ' + files[i]);
      } else {
        copyFileSync(srcFile, destFile);
      }
    }

  } // for files
} // cpdirSyncRecursive


//@
//@ ### cp([options ,] source [,source ...], dest)
//@ ### cp([options ,] source_array, dest)
//@ Available options:
//@
//@ + `-f`: force
//@ + `-r, -R`: recursive
//@
//@ Examples:
//@
//@ ```javascript
//@ cp('file1', 'dir1');
//@ cp('-Rf', '/tmp/*', '/usr/local/*', '/home/tmp');
//@ cp('-Rf', ['/tmp/*', '/usr/local/*'], '/home/tmp'); // same as above
//@ ```
//@
//@ Copies files. The wildcard `*` is accepted.
function _cp(options, sources, dest) {
  options = common.parseOptions(options, {
    'f': 'force',
    'R': 'recursive',
    'r': 'recursive'
  });

  // Get sources, dest
  if (arguments.length < 3) {
    common.error('missing <source> and/or <dest>');
  } else if (arguments.length > 3) {
    sources = [].slice.call(arguments, 1, arguments.length - 1);
    dest = arguments[arguments.length - 1];
  } else if (typeof sources === 'string') {
    sources = [sources];
  } else if ('length' in sources) {
    sources = sources; // no-op for array
  } else {
    common.error('invalid arguments');
  }

  var exists = fs.existsSync(dest),
      stats = exists && fs.statSync(dest);

  // Dest is not existing dir, but multiple sources given
  if ((!exists || !stats.isDirectory()) && sources.length > 1)
    common.error('dest is not a directory (too many sources)');

  // Dest is an existing file, but no -f given
  if (exists && stats.isFile() && !options.force)
    common.error('dest file already exists: ' + dest);

  if (options.recursive) {
    // Recursive allows the shortcut syntax "sourcedir/" for "sourcedir/*"
    // (see Github issue #15)
    sources.forEach(function(src, i) {
      if (src[src.length - 1] === '/')
        sources[i] += '*';
    });

    // Create dest
    try {
      fs.mkdirSync(dest, parseInt('0777', 8));
    } catch (e) {
      // like Unix's cp, keep going even if we can't create dest dir
    }
  }

  sources = common.expand(sources);

  sources.forEach(function(src) {
    if (!fs.existsSync(src)) {
      common.error('no such file or directory: '+src, true);
      return; // skip file
    }

    // If here, src exists
    if (fs.statSync(src).isDirectory()) {
      if (!options.recursive) {
        // Non-Recursive
        common.log(src + ' is a directory (not copied)');
      } else {
        // Recursive
        // 'cp /a/source dest' should create 'source' in 'dest'
        var newDest = path.join(dest, path.basename(src)),
            checkDir = fs.statSync(src);
        try {
          fs.mkdirSync(newDest, checkDir.mode);
        } catch (e) {
          //if the directory already exists, that's okay
          if (e.code !== 'EEXIST') {
            common.error('dest file no such file or directory: ' + newDest, true);
            throw e;
          }
        }

        cpdirSyncRecursive(src, newDest, {force: options.force});
      }
      return; // done with dir
    }

    // If here, src is a file

    // When copying to '/path/dir':
    //    thisDest = '/path/dir/file1'
    var thisDest = dest;
    if (fs.existsSync(dest) && fs.statSync(dest).isDirectory())
      thisDest = path.normalize(dest + '/' + path.basename(src));

    if (fs.existsSync(thisDest) && !options.force) {
      common.error('dest file already exists: ' + thisDest, true);
      return; // skip file
    }

    copyFileSync(src, thisDest);
  }); // forEach(src)
}
module.exports = _cp;

}).call(this,require("buffer").Buffer)

},{"./common":33,"buffer":2,"fs":1,"os":6,"path":7}],35:[function(require,module,exports){
(function (process){
var common = require('./common');
var _cd = require('./cd');
var path = require('path');

// Pushd/popd/dirs internals
var _dirStack = [];

function _isStackIndex(index) {
  return (/^[\-+]\d+$/).test(index);
}

function _parseStackIndex(index) {
  if (_isStackIndex(index)) {
    if (Math.abs(index) < _dirStack.length + 1) { // +1 for pwd
      return (/^-/).test(index) ? Number(index) - 1 : Number(index);
    } else {
      common.error(index + ': directory stack index out of range');
    }
  } else {
    common.error(index + ': invalid number');
  }
}

function _actualDirStack() {
  return [process.cwd()].concat(_dirStack);
}

//@
//@ ### pushd([options,] [dir | '-N' | '+N'])
//@
//@ Available options:
//@
//@ + `-n`: Suppresses the normal change of directory when adding directories to the stack, so that only the stack is manipulated.
//@
//@ Arguments:
//@
//@ + `dir`: Makes the current working directory be the top of the stack, and then executes the equivalent of `cd dir`.
//@ + `+N`: Brings the Nth directory (counting from the left of the list printed by dirs, starting with zero) to the top of the list by rotating the stack.
//@ + `-N`: Brings the Nth directory (counting from the right of the list printed by dirs, starting with zero) to the top of the list by rotating the stack.
//@
//@ Examples:
//@
//@ ```javascript
//@ // process.cwd() === '/usr'
//@ pushd('/etc'); // Returns /etc /usr
//@ pushd('+1');   // Returns /usr /etc
//@ ```
//@
//@ Save the current directory on the top of the directory stack and then cd to `dir`. With no arguments, pushd exchanges the top two directories. Returns an array of paths in the stack.
function _pushd(options, dir) {
  if (_isStackIndex(options)) {
    dir = options;
    options = '';
  }

  options = common.parseOptions(options, {
    'n' : 'no-cd'
  });

  var dirs = _actualDirStack();

  if (dir === '+0') {
    return dirs; // +0 is a noop
  } else if (!dir) {
    if (dirs.length > 1) {
      dirs = dirs.splice(1, 1).concat(dirs);
    } else {
      return common.error('no other directory');
    }
  } else if (_isStackIndex(dir)) {
    var n = _parseStackIndex(dir);
    dirs = dirs.slice(n).concat(dirs.slice(0, n));
  } else {
    if (options['no-cd']) {
      dirs.splice(1, 0, dir);
    } else {
      dirs.unshift(dir);
    }
  }

  if (options['no-cd']) {
    dirs = dirs.slice(1);
  } else {
    dir = path.resolve(dirs.shift());
    _cd('', dir);
  }

  _dirStack = dirs;
  return _dirs('');
}
exports.pushd = _pushd;

//@
//@ ### popd([options,] ['-N' | '+N'])
//@
//@ Available options:
//@
//@ + `-n`: Suppresses the normal change of directory when removing directories from the stack, so that only the stack is manipulated.
//@
//@ Arguments:
//@
//@ + `+N`: Removes the Nth directory (counting from the left of the list printed by dirs), starting with zero.
//@ + `-N`: Removes the Nth directory (counting from the right of the list printed by dirs), starting with zero.
//@
//@ Examples:
//@
//@ ```javascript
//@ echo(process.cwd()); // '/usr'
//@ pushd('/etc');       // '/etc /usr'
//@ echo(process.cwd()); // '/etc'
//@ popd();              // '/usr'
//@ echo(process.cwd()); // '/usr'
//@ ```
//@
//@ When no arguments are given, popd removes the top directory from the stack and performs a cd to the new top directory. The elements are numbered from 0 starting at the first directory listed with dirs; i.e., popd is equivalent to popd +0. Returns an array of paths in the stack.
function _popd(options, index) {
  if (_isStackIndex(options)) {
    index = options;
    options = '';
  }

  options = common.parseOptions(options, {
    'n' : 'no-cd'
  });

  if (!_dirStack.length) {
    return common.error('directory stack empty');
  }

  index = _parseStackIndex(index || '+0');

  if (options['no-cd'] || index > 0 || _dirStack.length + index === 0) {
    index = index > 0 ? index - 1 : index;
    _dirStack.splice(index, 1);
  } else {
    var dir = path.resolve(_dirStack.shift());
    _cd('', dir);
  }

  return _dirs('');
}
exports.popd = _popd;

//@
//@ ### dirs([options | '+N' | '-N'])
//@
//@ Available options:
//@
//@ + `-c`: Clears the directory stack by deleting all of the elements.
//@
//@ Arguments:
//@
//@ + `+N`: Displays the Nth directory (counting from the left of the list printed by dirs when invoked without options), starting with zero.
//@ + `-N`: Displays the Nth directory (counting from the right of the list printed by dirs when invoked without options), starting with zero.
//@
//@ Display the list of currently remembered directories. Returns an array of paths in the stack, or a single path if +N or -N was specified.
//@
//@ See also: pushd, popd
function _dirs(options, index) {
  if (_isStackIndex(options)) {
    index = options;
    options = '';
  }

  options = common.parseOptions(options, {
    'c' : 'clear'
  });

  if (options['clear']) {
    _dirStack = [];
    return _dirStack;
  }

  var stack = _actualDirStack();

  if (index) {
    index = _parseStackIndex(index);

    if (index < 0) {
      index = stack.length + index;
    }

    common.log(stack[index]);
    return stack[index];
  }

  common.log(stack.join(' '));

  return stack;
}
exports.dirs = _dirs;

}).call(this,require('_process'))

},{"./cd":31,"./common":33,"_process":8,"path":7}],36:[function(require,module,exports){
var common = require('./common');

//@
//@ ### echo(string [,string ...])
//@
//@ Examples:
//@
//@ ```javascript
//@ echo('hello world');
//@ var str = echo('hello world');
//@ ```
//@
//@ Prints string to stdout, and returns string with additional utility methods
//@ like `.to()`.
function _echo() {
  var messages = [].slice.call(arguments, 0);
  console.log.apply(this, messages);
  return common.ShellString(messages.join(' '));
}
module.exports = _echo;

},{"./common":33}],37:[function(require,module,exports){
var common = require('./common');

//@
//@ ### error()
//@ Tests if error occurred in the last command. Returns `null` if no error occurred,
//@ otherwise returns string explaining the error
function error() {
  return common.state.error;
};
module.exports = error;

},{"./common":33}],38:[function(require,module,exports){
(function (process){
var common = require('./common');
var _tempDir = require('./tempdir');
var _pwd = require('./pwd');
var path = require('path');
var fs = require('fs');
var child = require('child_process');

// Hack to run child_process.exec() synchronously (sync avoids callback hell)
// Uses a custom wait loop that checks for a flag file, created when the child process is done.
// (Can't do a wait loop that checks for internal Node variables/messages as
// Node is single-threaded; callbacks and other internal state changes are done in the
// event loop).
function execSync(cmd, opts) {
  var tempDir = _tempDir();
  var stdoutFile = path.resolve(tempDir+'/'+common.randomFileName()),
      codeFile = path.resolve(tempDir+'/'+common.randomFileName()),
      scriptFile = path.resolve(tempDir+'/'+common.randomFileName()),
      sleepFile = path.resolve(tempDir+'/'+common.randomFileName());

  var options = common.extend({
    silent: common.config.silent
  }, opts);

  var previousStdoutContent = '';
  // Echoes stdout changes from running process, if not silent
  function updateStdout() {
    if (options.silent || !fs.existsSync(stdoutFile))
      return;

    var stdoutContent = fs.readFileSync(stdoutFile, 'utf8');
    // No changes since last time?
    if (stdoutContent.length <= previousStdoutContent.length)
      return;

    process.stdout.write(stdoutContent.substr(previousStdoutContent.length));
    previousStdoutContent = stdoutContent;
  }

  function escape(str) {
    return (str+'').replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0");
  }

  if (fs.existsSync(scriptFile)) common.unlinkSync(scriptFile);
  if (fs.existsSync(stdoutFile)) common.unlinkSync(stdoutFile);
  if (fs.existsSync(codeFile)) common.unlinkSync(codeFile);

  var execCommand = '"'+process.execPath+'" '+scriptFile;
  var execOptions = {
    env: process.env,
    cwd: _pwd(),
    maxBuffer: 20*1024*1024
  };

  if (typeof child.execSync === 'function') {
    var script = [
      "var child = require('child_process')",
      "  , fs = require('fs');",
      "var childProcess = child.exec('"+escape(cmd)+"', {env: process.env, maxBuffer: 20*1024*1024}, function(err) {",
      "  fs.writeFileSync('"+escape(codeFile)+"', err ? err.code.toString() : '0');",
      "});",
      "var stdoutStream = fs.createWriteStream('"+escape(stdoutFile)+"');",
      "childProcess.stdout.pipe(stdoutStream, {end: false});",
      "childProcess.stderr.pipe(stdoutStream, {end: false});",
      "childProcess.stdout.pipe(process.stdout);",
      "childProcess.stderr.pipe(process.stderr);",
      "var stdoutEnded = false, stderrEnded = false;",
      "function tryClosing(){ if(stdoutEnded && stderrEnded){ stdoutStream.end(); } }",
      "childProcess.stdout.on('end', function(){ stdoutEnded = true; tryClosing(); });",
      "childProcess.stderr.on('end', function(){ stderrEnded = true; tryClosing(); });"
    ].join('\n');

    fs.writeFileSync(scriptFile, script);

    if (options.silent) {
      execOptions.stdio = 'ignore';
    } else {
      execOptions.stdio = [0, 1, 2];
    }

    // Welcome to the future
    child.execSync(execCommand, execOptions);
  } else {
    cmd += ' > '+stdoutFile+' 2>&1'; // works on both win/unix

    var script = [
      "var child = require('child_process')",
      "  , fs = require('fs');",
      "var childProcess = child.exec('"+escape(cmd)+"', {env: process.env, maxBuffer: 20*1024*1024}, function(err) {",
      "  fs.writeFileSync('"+escape(codeFile)+"', err ? err.code.toString() : '0');",
      "});"
    ].join('\n');

    fs.writeFileSync(scriptFile, script);

    child.exec(execCommand, execOptions);

    // The wait loop
    // sleepFile is used as a dummy I/O op to mitigate unnecessary CPU usage
    // (tried many I/O sync ops, writeFileSync() seems to be only one that is effective in reducing
    // CPU usage, though apparently not so much on Windows)
    while (!fs.existsSync(codeFile)) { updateStdout(); fs.writeFileSync(sleepFile, 'a'); }
    while (!fs.existsSync(stdoutFile)) { updateStdout(); fs.writeFileSync(sleepFile, 'a'); }
  }

  // At this point codeFile exists, but it's not necessarily flushed yet.
  // Keep reading it until it is.
  var code = parseInt('', 10);
  while (isNaN(code)) {
    code = parseInt(fs.readFileSync(codeFile, 'utf8'), 10);
  }

  var stdout = fs.readFileSync(stdoutFile, 'utf8');

  // No biggie if we can't erase the files now -- they're in a temp dir anyway
  try { common.unlinkSync(scriptFile); } catch(e) {}
  try { common.unlinkSync(stdoutFile); } catch(e) {}
  try { common.unlinkSync(codeFile); } catch(e) {}
  try { common.unlinkSync(sleepFile); } catch(e) {}

  // some shell return codes are defined as errors, per http://tldp.org/LDP/abs/html/exitcodes.html
  if (code === 1 || code === 2 || code >= 126)  {
      common.error('', true); // unix/shell doesn't really give an error message after non-zero exit codes
  }
  // True if successful, false if not
  var obj = {
    code: code,
    output: stdout
  };
  return obj;
} // execSync()

// Wrapper around exec() to enable echoing output to console in real time
function execAsync(cmd, opts, callback) {
  var output = '';

  var options = common.extend({
    silent: common.config.silent
  }, opts);

  var c = child.exec(cmd, {env: process.env, maxBuffer: 20*1024*1024}, function(err) {
    if (callback)
      callback(err ? err.code : 0, output);
  });

  c.stdout.on('data', function(data) {
    output += data;
    if (!options.silent)
      process.stdout.write(data);
  });

  c.stderr.on('data', function(data) {
    output += data;
    if (!options.silent)
      process.stdout.write(data);
  });

  return c;
}

//@
//@ ### exec(command [, options] [, callback])
//@ Available options (all `false` by default):
//@
//@ + `async`: Asynchronous execution. Defaults to true if a callback is provided.
//@ + `silent`: Do not echo program output to console.
//@
//@ Examples:
//@
//@ ```javascript
//@ var version = exec('node --version', {silent:true}).output;
//@
//@ var child = exec('some_long_running_process', {async:true});
//@ child.stdout.on('data', function(data) {
//@   /* ... do something with data ... */
//@ });
//@
//@ exec('some_long_running_process', function(code, output) {
//@   console.log('Exit code:', code);
//@   console.log('Program output:', output);
//@ });
//@ ```
//@
//@ Executes the given `command` _synchronously_, unless otherwise specified.
//@ When in synchronous mode returns the object `{ code:..., output:... }`, containing the program's
//@ `output` (stdout + stderr)  and its exit `code`. Otherwise returns the child process object, and
//@ the `callback` gets the arguments `(code, output)`.
//@
//@ **Note:** For long-lived processes, it's best to run `exec()` asynchronously as
//@ the current synchronous implementation uses a lot of CPU. This should be getting
//@ fixed soon.
function _exec(command, options, callback) {
  if (!command)
    common.error('must specify command');

  // Callback is defined instead of options.
  if (typeof options === 'function') {
    callback = options;
    options = { async: true };
  }

  // Callback is defined with options.
  if (typeof options === 'object' && typeof callback === 'function') {
    options.async = true;
  }

  options = common.extend({
    silent: common.config.silent,
    async: false
  }, options);

  if (options.async)
    return execAsync(command, options, callback);
  else
    return execSync(command, options);
}
module.exports = _exec;

}).call(this,require('_process'))

},{"./common":33,"./pwd":45,"./tempdir":48,"_process":8,"child_process":1,"fs":1,"path":7}],39:[function(require,module,exports){
var fs = require('fs');
var common = require('./common');
var _ls = require('./ls');

//@
//@ ### find(path [,path ...])
//@ ### find(path_array)
//@ Examples:
//@
//@ ```javascript
//@ find('src', 'lib');
//@ find(['src', 'lib']); // same as above
//@ find('.').filter(function(file) { return file.match(/\.js$/); });
//@ ```
//@
//@ Returns array of all files (however deep) in the given paths.
//@
//@ The main difference from `ls('-R', path)` is that the resulting file names
//@ include the base directories, e.g. `lib/resources/file1` instead of just `file1`.
function _find(options, paths) {
  if (!paths)
    common.error('no path specified');
  else if (typeof paths === 'object')
    paths = paths; // assume array
  else if (typeof paths === 'string')
    paths = [].slice.call(arguments, 1);

  var list = [];

  function pushFile(file) {
    if (common.platform === 'win')
      file = file.replace(/\\/g, '/');
    list.push(file);
  }

  // why not simply do ls('-R', paths)? because the output wouldn't give the base dirs
  // to get the base dir in the output, we need instead ls('-R', 'dir/*') for every directory

  paths.forEach(function(file) {
    pushFile(file);

    if (fs.statSync(file).isDirectory()) {
      _ls('-RA', file+'/*').forEach(function(subfile) {
        pushFile(subfile);
      });
    }
  });

  return list;
}
module.exports = _find;

},{"./common":33,"./ls":42,"fs":1}],40:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');

//@
//@ ### grep([options ,] regex_filter, file [, file ...])
//@ ### grep([options ,] regex_filter, file_array)
//@ Available options:
//@
//@ + `-v`: Inverse the sense of the regex and print the lines not matching the criteria.
//@
//@ Examples:
//@
//@ ```javascript
//@ grep('-v', 'GLOBAL_VARIABLE', '*.js');
//@ grep('GLOBAL_VARIABLE', '*.js');
//@ ```
//@
//@ Reads input string from given files and returns a string containing all lines of the
//@ file that match the given `regex_filter`. Wildcard `*` accepted.
function _grep(options, regex, files) {
  options = common.parseOptions(options, {
    'v': 'inverse'
  });

  if (!files)
    common.error('no paths given');

  if (typeof files === 'string')
    files = [].slice.call(arguments, 2);
  // if it's array leave it as it is

  files = common.expand(files);

  var grep = '';
  files.forEach(function(file) {
    if (!fs.existsSync(file)) {
      common.error('no such file or directory: ' + file, true);
      return;
    }

    var contents = fs.readFileSync(file, 'utf8'),
        lines = contents.split(/\r*\n/);
    lines.forEach(function(line) {
      var matched = line.match(regex);
      if ((options.inverse && !matched) || (!options.inverse && matched))
        grep += line + '\n';
    });
  });

  return common.ShellString(grep);
}
module.exports = _grep;

},{"./common":33,"fs":1}],41:[function(require,module,exports){
(function (process){
var fs = require('fs');
var path = require('path');
var common = require('./common');
var os = require('os');

//@
//@ ### ln(options, source, dest)
//@ ### ln(source, dest)
//@ Available options:
//@
//@ + `s`: symlink
//@ + `f`: force
//@
//@ Examples:
//@
//@ ```javascript
//@ ln('file', 'newlink');
//@ ln('-sf', 'file', 'existing');
//@ ```
//@
//@ Links source to dest. Use -f to force the link, should dest already exist.
function _ln(options, source, dest) {
  options = common.parseOptions(options, {
    's': 'symlink',
    'f': 'force'
  });

  if (!source || !dest) {
    common.error('Missing <source> and/or <dest>');
  }

  source = path.resolve(process.cwd(), String(source));
  dest = path.resolve(process.cwd(), String(dest));

  if (!fs.existsSync(source)) {
    common.error('Source file does not exist', true);
  }

  if (fs.existsSync(dest)) {
    if (!options.force) {
      common.error('Destination file exists', true);
    }

    fs.unlinkSync(dest);
  }

  if (options.symlink) {
    fs.symlinkSync(source, dest, os.platform() === "win32" ? "junction" : null);
  } else {
    fs.linkSync(source, dest, os.platform() === "win32" ? "junction" : null);
  }
}
module.exports = _ln;

}).call(this,require('_process'))

},{"./common":33,"_process":8,"fs":1,"os":6,"path":7}],42:[function(require,module,exports){
var path = require('path');
var fs = require('fs');
var common = require('./common');
var _cd = require('./cd');
var _pwd = require('./pwd');

//@
//@ ### ls([options ,] path [,path ...])
//@ ### ls([options ,] path_array)
//@ Available options:
//@
//@ + `-R`: recursive
//@ + `-A`: all files (include files beginning with `.`, except for `.` and `..`)
//@
//@ Examples:
//@
//@ ```javascript
//@ ls('projs/*.js');
//@ ls('-R', '/users/me', '/tmp');
//@ ls('-R', ['/users/me', '/tmp']); // same as above
//@ ```
//@
//@ Returns array of files in the given path, or in current directory if no path provided.
function _ls(options, paths) {
  options = common.parseOptions(options, {
    'R': 'recursive',
    'A': 'all',
    'a': 'all_deprecated'
  });

  if (options.all_deprecated) {
    // We won't support the -a option as it's hard to image why it's useful
    // (it includes '.' and '..' in addition to '.*' files)
    // For backwards compatibility we'll dump a deprecated message and proceed as before
    common.log('ls: Option -a is deprecated. Use -A instead');
    options.all = true;
  }

  if (!paths)
    paths = ['.'];
  else if (typeof paths === 'object')
    paths = paths; // assume array
  else if (typeof paths === 'string')
    paths = [].slice.call(arguments, 1);

  var list = [];

  // Conditionally pushes file to list - returns true if pushed, false otherwise
  // (e.g. prevents hidden files to be included unless explicitly told so)
  function pushFile(file, query) {
    // hidden file?
    if (path.basename(file)[0] === '.') {
      // not explicitly asking for hidden files?
      if (!options.all && !(path.basename(query)[0] === '.' && path.basename(query).length > 1))
        return false;
    }

    if (common.platform === 'win')
      file = file.replace(/\\/g, '/');

    list.push(file);
    return true;
  }

  paths.forEach(function(p) {
    if (fs.existsSync(p)) {
      var stats = fs.statSync(p);
      // Simple file?
      if (stats.isFile()) {
        pushFile(p, p);
        return; // continue
      }

      // Simple dir?
      if (stats.isDirectory()) {
        // Iterate over p contents
        fs.readdirSync(p).forEach(function(file) {
          if (!pushFile(file, p))
            return;

          // Recursive?
          if (options.recursive) {
            var oldDir = _pwd();
            _cd('', p);
            if (fs.statSync(file).isDirectory())
              list = list.concat(_ls('-R'+(options.all?'A':''), file+'/*'));
            _cd('', oldDir);
          }
        });
        return; // continue
      }
    }

    // p does not exist - possible wildcard present

    var basename = path.basename(p);
    var dirname = path.dirname(p);
    // Wildcard present on an existing dir? (e.g. '/tmp/*.js')
    if (basename.search(/\*/) > -1 && fs.existsSync(dirname) && fs.statSync(dirname).isDirectory) {
      // Escape special regular expression chars
      var regexp = basename.replace(/(\^|\$|\(|\)|<|>|\[|\]|\{|\}|\.|\+|\?)/g, '\\$1');
      // Translates wildcard into regex
      regexp = '^' + regexp.replace(/\*/g, '.*') + '$';
      // Iterate over directory contents
      fs.readdirSync(dirname).forEach(function(file) {
        if (file.match(new RegExp(regexp))) {
          if (!pushFile(path.normalize(dirname+'/'+file), basename))
            return;

          // Recursive?
          if (options.recursive) {
            var pp = dirname + '/' + file;
            if (fs.lstatSync(pp).isDirectory())
              list = list.concat(_ls('-R'+(options.all?'A':''), pp+'/*'));
          } // recursive
        } // if file matches
      }); // forEach
      return;
    }

    common.error('no such file or directory: ' + p, true);
  });

  return list;
}
module.exports = _ls;

},{"./cd":31,"./common":33,"./pwd":45,"fs":1,"path":7}],43:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');
var path = require('path');

// Recursively creates 'dir'
function mkdirSyncRecursive(dir) {
  var baseDir = path.dirname(dir);

  // Base dir exists, no recursion necessary
  if (fs.existsSync(baseDir)) {
    fs.mkdirSync(dir, parseInt('0777', 8));
    return;
  }

  // Base dir does not exist, go recursive
  mkdirSyncRecursive(baseDir);

  // Base dir created, can create dir
  fs.mkdirSync(dir, parseInt('0777', 8));
}

//@
//@ ### mkdir([options ,] dir [, dir ...])
//@ ### mkdir([options ,] dir_array)
//@ Available options:
//@
//@ + `p`: full path (will create intermediate dirs if necessary)
//@
//@ Examples:
//@
//@ ```javascript
//@ mkdir('-p', '/tmp/a/b/c/d', '/tmp/e/f/g');
//@ mkdir('-p', ['/tmp/a/b/c/d', '/tmp/e/f/g']); // same as above
//@ ```
//@
//@ Creates directories.
function _mkdir(options, dirs) {
  options = common.parseOptions(options, {
    'p': 'fullpath'
  });
  if (!dirs)
    common.error('no paths given');

  if (typeof dirs === 'string')
    dirs = [].slice.call(arguments, 1);
  // if it's array leave it as it is

  dirs.forEach(function(dir) {
    if (fs.existsSync(dir)) {
      if (!options.fullpath)
          common.error('path already exists: ' + dir, true);
      return; // skip dir
    }

    // Base dir does not exist, and no -p option given
    var baseDir = path.dirname(dir);
    if (!fs.existsSync(baseDir) && !options.fullpath) {
      common.error('no such file or directory: ' + baseDir, true);
      return; // skip dir
    }

    if (options.fullpath)
      mkdirSyncRecursive(dir);
    else
      fs.mkdirSync(dir, parseInt('0777', 8));
  });
} // mkdir
module.exports = _mkdir;

},{"./common":33,"fs":1,"path":7}],44:[function(require,module,exports){
var fs = require('fs');
var path = require('path');
var common = require('./common');

//@
//@ ### mv(source [, source ...], dest')
//@ ### mv(source_array, dest')
//@ Available options:
//@
//@ + `f`: force
//@
//@ Examples:
//@
//@ ```javascript
//@ mv('-f', 'file', 'dir/');
//@ mv('file1', 'file2', 'dir/');
//@ mv(['file1', 'file2'], 'dir/'); // same as above
//@ ```
//@
//@ Moves files. The wildcard `*` is accepted.
function _mv(options, sources, dest) {
  options = common.parseOptions(options, {
    'f': 'force'
  });

  // Get sources, dest
  if (arguments.length < 3) {
    common.error('missing <source> and/or <dest>');
  } else if (arguments.length > 3) {
    sources = [].slice.call(arguments, 1, arguments.length - 1);
    dest = arguments[arguments.length - 1];
  } else if (typeof sources === 'string') {
    sources = [sources];
  } else if ('length' in sources) {
    sources = sources; // no-op for array
  } else {
    common.error('invalid arguments');
  }

  sources = common.expand(sources);

  var exists = fs.existsSync(dest),
      stats = exists && fs.statSync(dest);

  // Dest is not existing dir, but multiple sources given
  if ((!exists || !stats.isDirectory()) && sources.length > 1)
    common.error('dest is not a directory (too many sources)');

  // Dest is an existing file, but no -f given
  if (exists && stats.isFile() && !options.force)
    common.error('dest file already exists: ' + dest);

  sources.forEach(function(src) {
    if (!fs.existsSync(src)) {
      common.error('no such file or directory: '+src, true);
      return; // skip file
    }

    // If here, src exists

    // When copying to '/path/dir':
    //    thisDest = '/path/dir/file1'
    var thisDest = dest;
    if (fs.existsSync(dest) && fs.statSync(dest).isDirectory())
      thisDest = path.normalize(dest + '/' + path.basename(src));

    if (fs.existsSync(thisDest) && !options.force) {
      common.error('dest file already exists: ' + thisDest, true);
      return; // skip file
    }

    if (path.resolve(src) === path.dirname(path.resolve(thisDest))) {
      common.error('cannot move to self: '+src, true);
      return; // skip file
    }

    fs.renameSync(src, thisDest);
  }); // forEach(src)
} // mv
module.exports = _mv;

},{"./common":33,"fs":1,"path":7}],45:[function(require,module,exports){
(function (process){
var path = require('path');
var common = require('./common');

//@
//@ ### pwd()
//@ Returns the current directory.
function _pwd(options) {
  var pwd = path.resolve(process.cwd());
  return common.ShellString(pwd);
}
module.exports = _pwd;

}).call(this,require('_process'))

},{"./common":33,"_process":8,"path":7}],46:[function(require,module,exports){
(function (process){
var common = require('./common');
var fs = require('fs');

// Recursively removes 'dir'
// Adapted from https://github.com/ryanmcgrath/wrench-js
//
// Copyright (c) 2010 Ryan McGrath
// Copyright (c) 2012 Artur Adib
//
// Licensed under the MIT License
// http://www.opensource.org/licenses/mit-license.php
function rmdirSyncRecursive(dir, force) {
  var files;

  files = fs.readdirSync(dir);

  // Loop through and delete everything in the sub-tree after checking it
  for(var i = 0; i < files.length; i++) {
    var file = dir + "/" + files[i],
        currFile = fs.lstatSync(file);

    if(currFile.isDirectory()) { // Recursive function back to the beginning
      rmdirSyncRecursive(file, force);
    }

    else if(currFile.isSymbolicLink()) { // Unlink symlinks
      if (force || isWriteable(file)) {
        try {
          common.unlinkSync(file);
        } catch (e) {
          common.error('could not remove file (code '+e.code+'): ' + file, true);
        }
      }
    }

    else // Assume it's a file - perhaps a try/catch belongs here?
      if (force || isWriteable(file)) {
        try {
          common.unlinkSync(file);
        } catch (e) {
          common.error('could not remove file (code '+e.code+'): ' + file, true);
        }
      }
  }

  // Now that we know everything in the sub-tree has been deleted, we can delete the main directory.
  // Huzzah for the shopkeep.

  var result;
  try {
    // Retry on windows, sometimes it takes a little time before all the files in the directory are gone
    var start = Date.now();
    while (true) {
      try {
        result = fs.rmdirSync(dir);
        if (fs.existsSync(dir)) throw { code: "EAGAIN" }
        break;
      } catch(er) {
        // In addition to error codes, also check if the directory still exists and loop again if true
        if (process.platform === "win32" && (er.code === "ENOTEMPTY" || er.code === "EBUSY" || er.code === "EPERM" || er.code === "EAGAIN")) {
          if (Date.now() - start > 1000) throw er;
        } else if (er.code === "ENOENT") {
          // Directory did not exist, deletion was successful
          break;
        } else {
          throw er;
        }
      }
    }
  } catch(e) {
    common.error('could not remove directory (code '+e.code+'): ' + dir, true);
  }

  return result;
} // rmdirSyncRecursive

// Hack to determine if file has write permissions for current user
// Avoids having to check user, group, etc, but it's probably slow
function isWriteable(file) {
  var writePermission = true;
  try {
    var __fd = fs.openSync(file, 'a');
    fs.closeSync(__fd);
  } catch(e) {
    writePermission = false;
  }

  return writePermission;
}

//@
//@ ### rm([options ,] file [, file ...])
//@ ### rm([options ,] file_array)
//@ Available options:
//@
//@ + `-f`: force
//@ + `-r, -R`: recursive
//@
//@ Examples:
//@
//@ ```javascript
//@ rm('-rf', '/tmp/*');
//@ rm('some_file.txt', 'another_file.txt');
//@ rm(['some_file.txt', 'another_file.txt']); // same as above
//@ ```
//@
//@ Removes files. The wildcard `*` is accepted.
function _rm(options, files) {
  options = common.parseOptions(options, {
    'f': 'force',
    'r': 'recursive',
    'R': 'recursive'
  });
  if (!files)
    common.error('no paths given');

  if (typeof files === 'string')
    files = [].slice.call(arguments, 1);
  // if it's array leave it as it is

  files = common.expand(files);

  files.forEach(function(file) {
    if (!fs.existsSync(file)) {
      // Path does not exist, no force flag given
      if (!options.force)
        common.error('no such file or directory: '+file, true);

      return; // skip file
    }

    // If here, path exists

    var stats = fs.lstatSync(file);
    if (stats.isFile() || stats.isSymbolicLink()) {

      // Do not check for file writing permissions
      if (options.force) {
        common.unlinkSync(file);
        return;
      }

      if (isWriteable(file))
        common.unlinkSync(file);
      else
        common.error('permission denied: '+file, true);

      return;
    } // simple file

    // Path is an existing directory, but no -r flag given
    if (stats.isDirectory() && !options.recursive) {
      common.error('path is a directory', true);
      return; // skip path
    }

    // Recursively remove existing directory
    if (stats.isDirectory() && options.recursive) {
      rmdirSyncRecursive(file, options.force);
    }
  }); // forEach(file)
} // rm
module.exports = _rm;

}).call(this,require('_process'))

},{"./common":33,"_process":8,"fs":1}],47:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');

//@
//@ ### sed([options ,] search_regex, replacement, file)
//@ Available options:
//@
//@ + `-i`: Replace contents of 'file' in-place. _Note that no backups will be created!_
//@
//@ Examples:
//@
//@ ```javascript
//@ sed('-i', 'PROGRAM_VERSION', 'v0.1.3', 'source.js');
//@ sed(/.*DELETE_THIS_LINE.*\n/, '', 'source.js');
//@ ```
//@
//@ Reads an input string from `file` and performs a JavaScript `replace()` on the input
//@ using the given search regex and replacement string or function. Returns the new string after replacement.
function _sed(options, regex, replacement, file) {
  options = common.parseOptions(options, {
    'i': 'inplace'
  });

  if (typeof replacement === 'string' || typeof replacement === 'function')
    replacement = replacement; // no-op
  else if (typeof replacement === 'number')
    replacement = replacement.toString(); // fallback
  else
    common.error('invalid replacement string');

  if (!file)
    common.error('no file given');

  if (!fs.existsSync(file))
    common.error('no such file or directory: ' + file);

  var result = fs.readFileSync(file, 'utf8').replace(regex, replacement);
  if (options.inplace)
    fs.writeFileSync(file, result, 'utf8');

  return common.ShellString(result);
}
module.exports = _sed;

},{"./common":33,"fs":1}],48:[function(require,module,exports){
(function (process){
var common = require('./common');
var os = require('os');
var fs = require('fs');

// Returns false if 'dir' is not a writeable directory, 'dir' otherwise
function writeableDir(dir) {
  if (!dir || !fs.existsSync(dir))
    return false;

  if (!fs.statSync(dir).isDirectory())
    return false;

  var testFile = dir+'/'+common.randomFileName();
  try {
    fs.writeFileSync(testFile, ' ');
    common.unlinkSync(testFile);
    return dir;
  } catch (e) {
    return false;
  }
}


//@
//@ ### tempdir()
//@
//@ Examples:
//@
//@ ```javascript
//@ var tmp = tempdir(); // "/tmp" for most *nix platforms
//@ ```
//@
//@ Searches and returns string containing a writeable, platform-dependent temporary directory.
//@ Follows Python's [tempfile algorithm](http://docs.python.org/library/tempfile.html#tempfile.tempdir).
function _tempDir() {
  var state = common.state;
  if (state.tempDir)
    return state.tempDir; // from cache

  state.tempDir = writeableDir(os.tempDir && os.tempDir()) || // node 0.8+
                  writeableDir(process.env['TMPDIR']) ||
                  writeableDir(process.env['TEMP']) ||
                  writeableDir(process.env['TMP']) ||
                  writeableDir(process.env['Wimp$ScrapDir']) || // RiscOS
                  writeableDir('C:\\TEMP') || // Windows
                  writeableDir('C:\\TMP') || // Windows
                  writeableDir('\\TEMP') || // Windows
                  writeableDir('\\TMP') || // Windows
                  writeableDir('/tmp') ||
                  writeableDir('/var/tmp') ||
                  writeableDir('/usr/tmp') ||
                  writeableDir('.'); // last resort

  return state.tempDir;
}
module.exports = _tempDir;

}).call(this,require('_process'))

},{"./common":33,"_process":8,"fs":1,"os":6}],49:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');

//@
//@ ### test(expression)
//@ Available expression primaries:
//@
//@ + `'-b', 'path'`: true if path is a block device
//@ + `'-c', 'path'`: true if path is a character device
//@ + `'-d', 'path'`: true if path is a directory
//@ + `'-e', 'path'`: true if path exists
//@ + `'-f', 'path'`: true if path is a regular file
//@ + `'-L', 'path'`: true if path is a symboilc link
//@ + `'-p', 'path'`: true if path is a pipe (FIFO)
//@ + `'-S', 'path'`: true if path is a socket
//@
//@ Examples:
//@
//@ ```javascript
//@ if (test('-d', path)) { /* do something with dir */ };
//@ if (!test('-f', path)) continue; // skip if it's a regular file
//@ ```
//@
//@ Evaluates expression using the available primaries and returns corresponding value.
function _test(options, path) {
  if (!path)
    common.error('no path given');

  // hack - only works with unary primaries
  options = common.parseOptions(options, {
    'b': 'block',
    'c': 'character',
    'd': 'directory',
    'e': 'exists',
    'f': 'file',
    'L': 'link',
    'p': 'pipe',
    'S': 'socket'
  });

  var canInterpret = false;
  for (var key in options)
    if (options[key] === true) {
      canInterpret = true;
      break;
    }

  if (!canInterpret)
    common.error('could not interpret expression');

  if (options.link) {
    try {
      return fs.lstatSync(path).isSymbolicLink();
    } catch(e) {
      return false;
    }
  }

  if (!fs.existsSync(path))
    return false;

  if (options.exists)
    return true;

  var stats = fs.statSync(path);

  if (options.block)
    return stats.isBlockDevice();

  if (options.character)
    return stats.isCharacterDevice();

  if (options.directory)
    return stats.isDirectory();

  if (options.file)
    return stats.isFile();

  if (options.pipe)
    return stats.isFIFO();

  if (options.socket)
    return stats.isSocket();
} // test
module.exports = _test;

},{"./common":33,"fs":1}],50:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');
var path = require('path');

//@
//@ ### 'string'.to(file)
//@
//@ Examples:
//@
//@ ```javascript
//@ cat('input.txt').to('output.txt');
//@ ```
//@
//@ Analogous to the redirection operator `>` in Unix, but works with JavaScript strings (such as
//@ those returned by `cat`, `grep`, etc). _Like Unix redirections, `to()` will overwrite any existing file!_
function _to(options, file) {
  if (!file)
    common.error('wrong arguments');

  if (!fs.existsSync( path.dirname(file) ))
      common.error('no such file or directory: ' + path.dirname(file));

  try {
    fs.writeFileSync(file, this.toString(), 'utf8');
  } catch(e) {
    common.error('could not write to file (code '+e.code+'): '+file, true);
  }
}
module.exports = _to;

},{"./common":33,"fs":1,"path":7}],51:[function(require,module,exports){
var common = require('./common');
var fs = require('fs');
var path = require('path');

//@
//@ ### 'string'.toEnd(file)
//@
//@ Examples:
//@
//@ ```javascript
//@ cat('input.txt').toEnd('output.txt');
//@ ```
//@
//@ Analogous to the redirect-and-append operator `>>` in Unix, but works with JavaScript strings (such as
//@ those returned by `cat`, `grep`, etc).
function _toEnd(options, file) {
  if (!file)
    common.error('wrong arguments');

  if (!fs.existsSync( path.dirname(file) ))
      common.error('no such file or directory: ' + path.dirname(file));

  try {
    fs.appendFileSync(file, this.toString(), 'utf8');
  } catch(e) {
    common.error('could not append to file (code '+e.code+'): '+file, true);
  }
}
module.exports = _toEnd;

},{"./common":33,"fs":1,"path":7}],52:[function(require,module,exports){
(function (process){
var common = require('./common');
var fs = require('fs');
var path = require('path');

// Cross-platform method for splitting environment PATH variables
function splitPath(p) {
  for (i=1;i<2;i++) {}

  if (!p)
    return [];

  if (common.platform === 'win')
    return p.split(';');
  else
    return p.split(':');
}

function checkPath(path) {
  return fs.existsSync(path) && fs.statSync(path).isDirectory() == false;
}

//@
//@ ### which(command)
//@
//@ Examples:
//@
//@ ```javascript
//@ var nodeExec = which('node');
//@ ```
//@
//@ Searches for `command` in the system's PATH. On Windows looks for `.exe`, `.cmd`, and `.bat` extensions.
//@ Returns string containing the absolute path to the command.
function _which(options, cmd) {
  if (!cmd)
    common.error('must specify command');

  var pathEnv = process.env.path || process.env.Path || process.env.PATH,
      pathArray = splitPath(pathEnv),
      where = null;

  // No relative/absolute paths provided?
  if (cmd.search(/\//) === -1) {
    // Search for command in PATH
    pathArray.forEach(function(dir) {
      if (where)
        return; // already found it

      var attempt = path.resolve(dir + '/' + cmd);
      if (checkPath(attempt)) {
        where = attempt;
        return;
      }

      if (common.platform === 'win') {
        var baseAttempt = attempt;
        attempt = baseAttempt + '.exe';
        if (checkPath(attempt)) {
          where = attempt;
          return;
        }
        attempt = baseAttempt + '.cmd';
        if (checkPath(attempt)) {
          where = attempt;
          return;
        }
        attempt = baseAttempt + '.bat';
        if (checkPath(attempt)) {
          where = attempt;
          return;
        }
      } // if 'win'
    });
  }

  // Command not found anywhere?
  if (!checkPath(cmd) && !where)
    return null;

  where = where || path.resolve(cmd);

  return common.ShellString(where);
}
module.exports = _which;

}).call(this,require('_process'))

},{"./common":33,"_process":8,"fs":1,"path":7}],53:[function(require,module,exports){
var expand, foreach, fs, genDocuments, log, mkdir, readdir, ref, showPage, write;

require("coffee-script").register();

ref = require('coffee-mate'), log = ref.log, foreach = ref.foreach;

showPage = require('./render').showPage;

mkdir = require('shelljs').mkdir;

expand = require('path').resolve;

fs = require('fs');

write = function(fname, s) {
  var dir, i;
  i = fname.lastIndexOf('/');
  if (i >= 0) {
    dir = fname.slice(0, +i + 1 || 9e9);
    mkdir('-p', dir);
  }
  return fs.writeFileSync(fname, s);
};

readdir = function(path, min_depth) {
  var j, len, ls, rec, results, s;
  if (min_depth == null) {
    min_depth = 0;
  }
  ls = [];
  rec = function(path, depth) {
    return fs.readdirSync(path).forEach(function(item) {
      var p;
      p = path + "/" + item;
      if (fs.statSync(p).isDirectory()) {
        return rec(p, depth + 1);
      } else {
        if (depth >= min_depth) {
          return ls.push(p);
        }
      }
    });
  };
  rec(path, 0);
  results = [];
  for (j = 0, len = ls.length; j < len; j++) {
    s = ls[j];
    results.push(s.slice(path.length + 1));
  }
  return results;
};

genDocuments = function(arg) {
  var dest, src;
  src = arg.src, dest = arg.dest;
  if (!/\/$/.test(src)) {
    src += '/';
  }
  if (!/\/$/.test(dest)) {
    dest += '/';
  }
  return foreach(readdir(src), function(fname) {
    var it, page, pageName;
    if (/(.coffee|.litcoffee|.js)$/.test(fname)) {
      it = require(expand(src + "/" + fname));
      page = showPage(it);
      page += "<style>\n* {\n	line-height: 1.2em\n}\n.typespec .sample pre {\n	max-height: none !important;\n}\n</style>";
      pageName = fname.replace(/(.coffee|.litcoffee|.js)$/, '.html');
      return write(dest + pageName, page);
    }
  });
};

module.exports = {
  genDocuments: genDocuments
};


},{"./render":78,"coffee-mate":12,"coffee-script":20,"fs":1,"path":7,"shelljs":29}],54:[function(require,module,exports){
(function (global){
var index, k, v;

index = require('./index');

for (k in index) {
  v = index[k];
  global[k] = v;
}


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./index":56}],55:[function(require,module,exports){
var expandBlockHead, genBlockBody, htmlBlock, htmlInline, isTypeSpec, isTypeSpecDict, ref, typeclass;

ref = require('./typespec'), htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

typeclass = require('./typeclass').typeclass;

expandBlockHead = function(f) {
  return function(spec) {
    var block;
    block = htmlBlock(spec);
    if (block == null) {
      return null;
    } else {
      return {
        head: f(block.head),
        body: block.body,
        tail: block.tail
      };
    }
  };
};

genBlockBody = function(bodyClass, keyClass) {
  return function(specdict) {
    var lis;
    lis = map(function(arg) {
      var block, k, ref1, ref2, v;
      k = arg[0], v = arg[1];
      block = htmlBlock(v);
      return "<li>\n<div class='" + (block != null ? 'fold' : 'inline') + "'>\n	<span class='" + keyClass + "'>" + k + "</span>: " + (htmlInline(v)) + "\n</div>\n" + (block != null ? "<div class='unfold'>\n	<span class='" + keyClass + "'>" + k + "</span>: " + block.head + "\n	" + ((ref1 = block.body) != null ? ref1 : '') + "\n	" + ((ref2 = block.tail) != null ? ref2 : '') + "\n</div>" : '') + "\n</li>";
    })(enumerate(specdict));
    return ("<ul class='" + bodyClass + "'>") + (list(lis)).join('\n') + "</ul>";
  };
};

isTypeSpec = function(spec) {
  return (spec != null) && typeclass('TypeSpec').hasInstance(spec.constructor);
};

isTypeSpecDict = function(specdict) {
  return (specdict != null) && all(function(arg) {
    var k, v;
    k = arg[0], v = arg[1];
    return isTypeSpec(v);
  })(enumerate(specdict));
};

module.exports = {
  expandBlockHead: expandBlockHead,
  genBlockBody: genBlockBody,
  isTypeSpec: isTypeSpec,
  isTypeSpecDict: isTypeSpecDict
};


},{"./typeclass":79,"./typespec":80}],56:[function(require,module,exports){
var Any, Bool, Choose, Comparator, Enum, FieldName, Fn, Int, Loose, Map, NamedType, Nat, OneOf, Optional, Promise, Select, Strict, TableName, Tree, TreeMap, UserInfo, UserName, Value, WideTable, genDocuments, genRenderCode, htmlBlock, htmlInline, instance, match, ref, ref1, ref2, sample, samples, show, showHtml, showPage, typeclass, unmatchMessages;

require('./prim/object');

require('./prim/array');

require('./prim/constructor');

Bool = require('./prim/bool').Bool;

Any = require('./prim/any').Any;

Int = require('./prim/int').Int;

Nat = require('./prim/nat').Nat;

Enum = require('./prim/enum').Enum;

Value = require('./prim/value').Value;

Optional = require('./prim/optional').Optional;

Promise = require('./prim/promise').Promise;

Tree = require('./prim/tree').Tree;

Map = require('./prim/map').Map;

TreeMap = require('./prim/treemap').TreeMap;

Fn = require('./prim/fn').Fn;

NamedType = require('./prim/namedtype').NamedType;

Strict = require('./prim/strict').Strict;

Loose = require('./prim/loose').Loose;

Select = require('./prim/select').Select;

Choose = require('./prim/choose').Choose;

OneOf = require('./prim/oneof').OneOf;

ref = require('./typespec'), match = ref.match, unmatchMessages = ref.unmatchMessages, show = ref.show, sample = ref.sample, samples = ref.samples, showHtml = ref.showHtml, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

ref1 = require('./render'), genRenderCode = ref1.genRenderCode, showPage = ref1.showPage;

ref2 = require('./typeclass'), typeclass = ref2.typeclass, instance = ref2.instance;

genDocuments = require('./gen-doc').genDocuments;

module.exports = {
  Number: Number,
  String: String,
  Bool: Bool,
  Any: Any,
  Int: Int,
  Nat: Nat,
  Enum: Enum,
  Value: Value,
  Optional: Optional,
  Promise: Promise,
  Tree: Tree,
  Map: Map,
  TreeMap: TreeMap,
  Fn: Fn,
  NamedType: NamedType,
  Strict: Strict,
  Loose: Loose,
  Select: Select,
  Choose: Choose,
  OneOf: OneOf,
  match: match,
  unmatchMessages: unmatchMessages,
  show: show,
  sample: sample,
  samples: samples,
  showHtml: showHtml,
  genRenderCode: genRenderCode,
  showPage: showPage,
  typeclass: typeclass,
  instance: instance,
  genDocuments: genDocuments
};

if (module.parent === null) {
  require('coffee-mate/global');
  UserName = Optional(String);
  UserInfo = {
    name: UserName,
    position: String,
    age: Number
  };
  assert(function() {
    return match(UserName)('luo') === true;
  });
  assert(function() {
    return match(UserName)(1) === false;
  });
  log(function() {
    return show(UserName);
  });
  TableName = NamedType({
    name: 'TableName',
    spec: String,
    samples: ['table1', 'table2']
  });
  FieldName = NamedType({
    name: 'FieldName',
    spec: String,
    samples: ['product_id', 'sale', 'amount']
  });
  Comparator = Enum(['=', '<', '<=', '>=', '>']);
  WideTable = [
    {
      tableName: TableName,
      join: {
        leftTableName: TableName,
        left: FieldName,
        op: Comparator,
        right: FieldName
      }
    }
  ];
  log(function() {
    return unmatchMessages(WideTable)([
      {
        tableName: 'a',
        join: {}
      }
    ]);
  });
}


},{"./gen-doc":53,"./prim/any":57,"./prim/array":58,"./prim/bool":59,"./prim/choose":60,"./prim/constructor":61,"./prim/enum":62,"./prim/fn":63,"./prim/int":64,"./prim/loose":65,"./prim/map":66,"./prim/namedtype":67,"./prim/nat":68,"./prim/object":69,"./prim/oneof":70,"./prim/optional":71,"./prim/promise":72,"./prim/select":73,"./prim/strict":74,"./prim/tree":75,"./prim/treemap":76,"./prim/value":77,"./render":78,"./typeclass":79,"./typespec":80,"coffee-mate/global":18}],57:[function(require,module,exports){
var Any, instance;

require('coffee-mate/global');

instance = require('../typeclass').instance;

Any = (function() {
  var r;
  r = function Any(){};
  return (r.constructor = r);
})();

instance('TypeSpec')(Any).where({
  match: function() {
    return function(v) {
      return v != null;
    };
  },
  constraints: function() {
    return function(v) {
      return [
        {
          label: function() {
            return "Any Non-Null Value Expected, But Got " + v;
          },
          flag: function() {
            return v != null;
          }
        }
      ];
    };
  },
  show: function() {
    return "Any";
  },
  samples: function() {
    return concat(repeat([
      'a', 3, true, [1, 2], {
        x: 1
      }
    ]));
  },
  sample: function() {
    return 'any';
  }
});

module.exports = {
  Any: Any
};


},{"../typeclass":79,"coffee-mate/global":18}],58:[function(require,module,exports){
var constraints, htmlBlock, htmlInline, instance, match, ref, sample, samples, shape, show;

require('coffee-mate/global');

instance = require('../typeclass').instance;

ref = require('../typespec'), shape = ref.shape, match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

instance('TypeSpec')(Array).where({
  shape: function(arg) {
    var spec;
    spec = arg[0];
    return Array;
  },
  match: function(arg) {
    var spec;
    spec = arg[0];
    return function(v) {
      return (v != null) && v instanceof Array && (all(match(spec))(v));
    };
  },
  constraints: function(arg) {
    var spec;
    spec = arg[0];
    return function(v) {
      return cons({
        label: function() {
          return "Array Expected, But Got " + v;
        },
        flag: function() {
          return (v != null) && v instanceof Array;
        }
      })(map(function(arg1) {
        var i, x;
        i = arg1[0], x = arg1[1];
        return {
          label: function() {
            return "Element " + i;
          },
          sub: function() {
            return constraints(spec)(x);
          }
        };
      })(enumerate(v != null ? v : [])));
    };
  },
  show: function(arg) {
    var spec;
    spec = arg[0];
    return "[" + (show(spec)) + "]";
  },
  samples: function(arg) {
    var spec;
    spec = arg[0];
    return concat(repeat(reverse(map(function(n) {
      return list(take(n)(samples(spec)));
    })(range(3)))));
  },
  sample: function(arg) {
    var spec;
    spec = arg[0];
    return [sample(spec)];
  },
  htmlInline: function(arg) {
    var spec;
    spec = arg[0];
    return "<span class='type-maker'>[" + (htmlInline(spec)) + "]</span>";
  },
  htmlBlock: function(arg) {
    var node, ref1, spec;
    spec = arg[0];
    if ((node = htmlBlock(spec)) == null) {
      return null;
    } else {
      return {
        head: "<span class='type-maker'>[" + node.head + "</span>",
        body: node.body,
        tail: "<span class='type-maker'>" + ((ref1 = node.tail) != null ? ref1 : '') + "]</span>"
      };
    }
  }
});


},{"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],59:[function(require,module,exports){
var Bool;

Bool = Boolean;

module.exports = {
  Bool: Bool
};


},{}],60:[function(require,module,exports){
var Choose, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, sample, samples, show;

require('coffee-mate/global');

instance = require('../typeclass').instance;

ref = require('../typespec'), match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpec = ref1.isTypeSpec;

Choose = (function() {
  function Choose(specs) {
    if (!((specs != null) && specs.constructor === Array)) {
      throw Error("Bad Choose Type Definition: Array Expected, But Got " + specs);
    }
    if (!all(isTypeSpec)(specs)) {
      throw Error("Bad Choose Type Definition: Array of TypeSpec Expected, But Got " + specs);
    }
    return {
      constructor: Choose,
      specs: specs
    };
  }

  return Choose;

})();

instance('TypeSpec')(Choose).where({
  match: function(arg) {
    var specs;
    specs = arg.specs;
    return function(v) {
      return (v != null) && any(function(spec) {
        return match(spec)(v);
      })(specs);
    };
  },
  constraints: function(t) {
    var specs;
    specs = t.specs;
    return function(v) {
      return [
        {
          label: function() {
            return "Non-Null Value Expected, But Got " + v;
          },
          flag: function() {
            return v != null;
          }
        }, {
          label: function() {
            return (show(t)) + " Expected, But Got " + (json(v));
          },
          flag: function() {
            return any(function(spec) {
              return match(spec)(v);
            })(specs);
          }
        }
      ];
    };
  },
  show: function(arg) {
    var specs;
    specs = arg.specs;
    return "Choose([" + ((list(map(show)(specs))).join(', ')) + "])";
  },
  samples: function(arg) {
    var specs;
    specs = arg.specs;
    return concat(repeat(map(sample)(specs)));
  },
  htmlInline: function(arg) {
    var specs;
    specs = arg.specs;
    return "<span class='type-maker unwrapped'>" + ((list(map(htmlInline)(specs))).join(' | ')) + "</span>";
  },
  htmlBlock: function(arg) {
    var specs;
    specs = arg.specs;
    return {
      head: "<span class='type-maker'>Choose [</span>",
      body: genBlockBody('choose', 'meta-field')(dict(list(zip(naturals, specs)))),
      tail: "<span class='type-maker'>]</span>"
    };
  }
});

module.exports = {
  Choose: Choose
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],61:[function(require,module,exports){
var instance, match, ref, sample, samples, show;

require('coffee-mate/global');

instance = require('../typeclass').instance;

ref = require('../typespec'), match = ref.match, show = ref.show, samples = ref.samples, sample = ref.sample;

instance('TypeSpec')(Function).where({
  shape: function(spec) {
    return spec;
  },
  match: function(spec) {
    return function(v) {
      return (v != null) && v.constructor === spec;
    };
  },
  constraints: function(spec) {
    return function(v) {
      return [
        {
          label: function() {
            return "Non-Null Value Expected, But Got " + v;
          },
          flag: function() {
            return v != null;
          }
        }, {
          label: function() {
            var ref1, ref2;
            return "Value with Constructor " + ((ref1 = spec.name) != null ? ref1 : spec) + " Expected, But Got " + (json(v)) + " with Constructor " + ((ref2 = v.constructor.name) != null ? ref2 : v.constructor);
          },
          flag: function() {
            return v.constructor === spec;
          }
        }
      ];
    };
  },
  show: function(spec) {
    return spec.name || 'UnnamedType';
  },
  samples: function(spec) {
    switch (spec) {
      case Boolean:
        return concat(repeat([true, false]));
      case Number:
        return concat(repeat([3.14, 9, 42]));
      case String:
        return concat(repeat(['abc', 'hello']));
      default:
        return repeat(new spec);
    }
  },
  htmlInline: function(spec) {
    return "<span class='type-maker'>" + (show(spec)) + "</span>";
  }
});


},{"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],62:[function(require,module,exports){
var Enum, instance, show,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

require('coffee-mate/global');

instance = require('../typeclass').instance;

show = require('../typespec').show;

Enum = (function() {
  function Enum(ls) {
    if (!(all(function(x) {
      return x != null;
    })(ls))) {
      throw Error("Bad Enum Type Definition: Array Of Non-Null Values Expected, Bot Got " + ls);
    }
    return {
      constructor: Enum,
      "enum": ls
    };
  }

  return Enum;

})();

instance('TypeSpec')(Enum).where({
  shape: function(t) {
    return t;
  },
  match: function(arg) {
    var vs;
    vs = arg["enum"];
    return function(v) {
      return indexOf.call(vs, v) >= 0;
    };
  },
  constraints: function(t) {
    var vs;
    vs = t["enum"];
    return function(v) {
      return [
        {
          label: function() {
            return (show(t)) + " Expected, But Got " + (json(v));
          },
          flag: function() {
            return indexOf.call(vs, v) >= 0;
          }
        }
      ];
    };
  },
  show: function(arg) {
    var vs;
    vs = arg["enum"];
    return "Enum(" + (json(vs)) + ")";
  },
  samples: function(arg) {
    var vs;
    vs = arg["enum"];
    return concat(repeat(vs));
  },
  htmlInline: function(arg) {
    var vs;
    vs = arg["enum"];
    return "<span class='type-maker unwrapped'>Enum " + (json(vs)) + "</span>";
  }
});

module.exports = {
  Enum: Enum
};


},{"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],63:[function(require,module,exports){
var Fn, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('../helpers').genBlockBody;

Fn = (function() {
  function Fn(ispec) {
    if (!((ispec != null) && typeclass('TypeSpec').hasInstance(ispec.constructor))) {
      throw Error("Bad Fn Definition: TypeSpec as ispec Expected, But Got " + ispec);
    }
    return function(ospec) {
      if (!((ospec != null) && typeclass('TypeSpec').hasInstance(ospec.constructor))) {
        throw Error("Bad Fn Definition: TypeSpec as ospec Expected, But Got " + ospec);
      }
      return {
        constructor: Fn,
        ispec: ispec,
        ospec: ospec
      };
    };
  }

  return Fn;

})();

instance('TypeSpec')(Fn).where({
  match: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return function(v) {
      return (v != null) && v.constructor === Function;
    };
  },
  withSpec: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return function(v) {
      if (!((v != null) && v.constructor === Function)) {
        throw TypeError({
          expected: 'Function',
          got: v
        });
      } else {
        return function(x) {
          var y;
          withSpec(ispec)(x);
          y = v(x);
          withSpec(ospec)(y);
          return y;
        };
      }
    };
  },
  show: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return "Fn(" + (show(ispec)) + ")(" + (show(ospec)) + ")";
  },
  samples: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return repeat({
      "[input]": sample(ispec),
      "[output]": sample(ospec)
    });
  },
  htmlInline: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return "<span class='type-maker unwrapped'>" + (htmlInline(ispec)) + " -> " + (htmlInline(ospec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return {
      head: "<span class='type-maker'>Function (</span>",
      body: genBlockBody('function', 'meta-field')({
        input: ispec,
        output: ospec
      }),
      tail: "<span class='type-maker'>)</span>"
    };
  }
});

module.exports = {
  Fn: Fn
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],64:[function(require,module,exports){
var Int, instance;

require('coffee-mate/global');

instance = require('../typeclass').instance;

Int = (function() {
  var r;
  r = function Int(){};
  return (r.constructor = r);
})();

instance('TypeSpec')(Int).where({
  shape: function() {
    return Number;
  },
  match: function() {
    return function(v) {
      return (v != null) && v.constructor === Number && !isNaN(v) && v === parseInt(v);
    };
  },
  constraints: function() {
    return function(v) {
      return [
        {
          label: function() {
            return "Int Excepted, But Got " + (json(v));
          },
          flag: function() {
            return (v != null) && v.constructor === Number && !isNaN(v) && v === parseInt(v);
          }
        }
      ];
    };
  },
  show: function() {
    return "Int";
  },
  samples: function() {
    return concat(repeat([42, 1, 2]));
  }
});

module.exports = {
  Int: Int
};


},{"../typeclass":79,"coffee-mate/global":18}],65:[function(require,module,exports){
var Loose, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, ref2, sample, samples, shape, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), shape = ref1.shape, match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

ref2 = require('../helpers'), genBlockBody = ref2.genBlockBody, isTypeSpecDict = ref2.isTypeSpecDict;

Loose = (function() {
  function Loose(specdict) {
    if (!isTypeSpecDict(specdict)) {
      throw Error("Bad Loose Type Definition: Dict Of TypeSpec Expected, But Got " + specdict);
    }
    return {
      constructor: Loose,
      specdict: specdict
    };
  }

  return Loose;

})();

instance('TypeSpec')(Loose).where({
  shape: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return Loose(fromList(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return [k, shape(spec)];
    })(enumerate(specdict))));
  },
  match: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return function(v) {
      return (v != null) && v.constructor === Object && (all(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return match(spec)(v[k]);
      })(enumerate(specdict)));
    };
  },
  constraints: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return function(v) {
      return cons({
        label: function() {
          return "Object Expected, But Got " + v;
        },
        flag: function() {
          return v != null;
        }
      })(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return {
          label: function() {
            return "Field " + k;
          },
          sub: function() {
            return constraints(spec)(v[k]);
          }
        };
      })(enumerate(specdict)));
    };
  },
  show: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return "Loose({" + ((list(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return k + ": " + (show(spec));
    })(enumerate(specdict)))).join(', ')) + "})";
  },
  samples: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return repeat(dict(list(map(function(arg1) {
      var k, v;
      k = arg1[0], v = arg1[1];
      return [k, sample(v)];
    })(enumerate(specdict)))));
  },
  htmlInline: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return "<span class='type-maker unwrapped'>Loose {<span class='folded-detail'>...</span>}</span>";
  },
  htmlBlock: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return {
      head: "<span class='type-maker'>Loose {</span>",
      body: genBlockBody('loose', 'field-name')(specdict),
      tail: "<span class='type-maker'>}</span>"
    };
  }
});

module.exports = {
  Loose: Loose
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],66:[function(require,module,exports){
var Map, constraints, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('../helpers').genBlockBody;

Map = (function() {
  function Map(kspec) {
    if (!((kspec != null) && typeclass('TypeSpec').hasInstance(kspec.constructor))) {
      throw Error("Bad Fn Definition: TypeSpec as kspec Expected, But Got " + kspec);
    }
    return function(vspec) {
      if (!((vspec != null) && typeclass('TypeSpec').hasInstance(vspec.constructor))) {
        throw Error("Bad Fn Definition: TypeSpec as vspec Expected, But Got " + vspec);
      }
      return {
        constructor: Map,
        kspec: kspec,
        vspec: vspec
      };
    };
  }

  return Map;

})();

instance('TypeSpec')(Map).where({
  match: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return function(v) {
      var ks, mk, mv;
      mk = match(kspec);
      mv = match(vspec);
      return (v != null) && v.constructor === Object && all(mk)(ks = Object.keys(v)) && all(mv)(map(seek(v))(ks));
    };
  },
  constraints: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return function(v) {
      return cons({
        label: function() {
          return "Object Expected, But Got " + v;
        },
        flag: function() {
          return (v != null) && v.constructor === Object;
        }
      })(concat([
        map(function(k) {
          return {
            label: function() {
              return "Key " + (json(k));
            },
            sub: function() {
              return constraints(kspec)(k);
            }
          };
        })(Object.keys(v != null ? v : [])), map(function(k) {
          return {
            label: function() {
              return "Key " + (json(k)) + " 's Value ";
            },
            sub: function() {
              return constraints(vspec)(v[k]);
            }
          };
        })(Object.keys(v != null ? v : []))
      ]));
    };
  },
  show: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return "Map(" + (show(kspec)) + ")(" + (show(vspec)) + ")";
  },
  samples: function(arg) {
    var ks, kspec, vs, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    ks = list(take(4)(samples(kspec)));
    vs = list(take(4)(samples(vspec)));
    return concat(repeat([dict([[ks[0], vs[0]], [ks[1], vs[1]]]), dict([[ks[2], vs[2]], [ks[3], vs[3]]])]));
  },
  htmlInline: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return "<span class='type-maker unwrapped'>Map " + (htmlInline(kspec)) + " " + (htmlInline(vspec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return {
      head: "<span class='type-maker'>Map (</span>",
      body: genBlockBody('map', 'meta-field')({
        key: kspec,
        value: vspec
      }),
      tail: "<span class='type-maker'>)</span>"
    };
  }
});

module.exports = {
  Map: Map
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],67:[function(require,module,exports){
var NamedType, constraints, expandBlockHead, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, shape, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), shape = ref1.shape, match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

expandBlockHead = require('../helpers').expandBlockHead;

NamedType = (function() {
  function NamedType(arg) {
    var check, desc, name, samples, spec;
    name = arg.name, spec = arg.spec, desc = arg.desc, check = arg.check, samples = arg.samples;
    if (!((name != null) && (spec != null))) {
      throw Error("Bad NamedType Definition: name & spec Must Be Specified");
    }
    if (!((spec != null) && typeclass('TypeSpec').hasInstance(spec.constructor))) {
      throw Error("Bad NamedType Definition: TypeSpec as spec Expected, But Got " + spec + "\n\tname: " + name);
    }
    if (!((samples == null) || all(match(spec))(take(100)(samples)))) {
      throw Error("Bad NamedType Definition: samples Should Match spec\n\tname: " + name + "\n\tspec: " + spec);
    }
    return {
      constructor: NamedType,
      name: name,
      spec: spec,
      desc: desc,
      check: check,
      samples: samples
    };
  }

  return NamedType;

})();

instance('TypeSpec')(NamedType).where({
  shape: function(arg) {
    var spec;
    spec = arg.spec;
    return shape(spec);
  },
  match: function(arg) {
    var check, spec;
    spec = arg.spec, check = arg.check;
    return function(v) {
      return match(spec)(v) && (check != null ? check(v) : true);
    };
  },
  constraints: function(arg) {
    var check, name, spec;
    spec = arg.spec, check = arg.check, name = arg.name;
    return function(v) {
      return [
        {
          label: function() {
            return name + " Expected";
          },
          sub: function() {
            return constraints(spec)(v);
          }
        }, {
          label: function() {
            return name + " Expected to Satisfy " + check + ", But Got " + (json(v));
          },
          flag: function() {
            if (check != null) {
              return check(v);
            } else {
              return true;
            }
          }
        }
      ];
    };
  },
  show: function(arg) {
    var name, spec;
    name = arg.name, spec = arg.spec;
    return name || (show(spec));
  },
  samples: function(arg) {
    var ls, spec;
    spec = arg.spec, ls = arg.samples;
    if (ls != null) {
      return concat(repeat(ls));
    } else {
      return samples(spec);
    }
  },
  htmlInline: function(arg) {
    var name, spec;
    name = arg.name, spec = arg.spec;
    if (name != null) {
      return "<span class='type-name'>" + name + "</span>";
    } else {
      return htmlInline(spec);
    }
  },
  htmlBlock: function(arg) {
    var name, ref2, spec;
    name = arg.name, spec = arg.spec;
    return (ref2 = expandBlockHead(function(head) {
      return "<span><span class='type-name'>" + name + "</span><span class='spliter'>spec:</span>" + head + "</span>";
    })(spec)) != null ? ref2 : {
      head: "<span><span class='type-name'>" + name + "</span><span class='spliter'>spec:</span>" + (htmlInline(spec)) + "</span>"
    };
  },
  showHtml: function(t) {
    var check, checkPart, desc, descriptionPart, name, namePart, samplePart, spec, specPart;
    name = t.name, desc = t.desc, spec = t.spec, check = t.check;
    namePart = name == null ? '' : "<div class='name'>\n<span class='meta-field'>name</span>: <span class='type-name'>" + name + "</span>\n</div>";
    descriptionPart = desc == null ? '' : (function() {
      var s;
      s = desc;
      return "<div class='desc'>\n<span class='meta-field'>desc</span>: " + (/\n/.test(s) ? "<pre class='text'>" + s + "</pre>" : "<span class='text'>" + s + "</span>") + "\n</div>";
    })();
    specPart = (function() {
      var block, ref2, ref3;
      block = htmlBlock(spec);
      return ("<div class='spec'>\n<div class='" + (block != null ? 'fold' : 'inline') + "'><span class='meta-field'>spec</span>: " + (htmlInline(spec)) + "</div>\n" + (block != null ? "<div class='unfold'>\n	<span class='meta-field'>spec</span>: " + block.head + "\n	" + ((ref2 = block.body) != null ? ref2 : '') + "\n	" + ((ref3 = block.tail) != null ? ref3 : '') + "\n</div>" : '') + "\n</div>").replace(/(\t|\n)/g, '');
    })();
    samplePart = (function() {
      var s;
      s = json(sample(t), 4);
      return "<div class='sample'>\n<span class='meta-field'>sample</span>: " + (/\n/.test(s) ? "<pre class='code'>" + s + "</pre>" : "<span class='code'>" + s + "</span>") + "\n</div>";
    })();
    checkPart = check == null ? '' : (function() {
      var s;
      s = check.toString();
      return "<div class='check'>\n<span class='meta-field'>constraint</span>: " + (/\n/.test(s) ? "<pre class='code'>" + s + "</pre>" : "<span class='code'>" + s + "</span>") + "\n</div>";
    })();
    return "<div class='typespec'>" + (namePart + descriptionPart + specPart + samplePart + checkPart) + "</div>";
  }
});

module.exports = {
  NamedType: NamedType
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],68:[function(require,module,exports){
var Nat, instance;

require('coffee-mate/global');

instance = require('../typeclass').instance;

Nat = (function() {
  var r;
  r = function Nat(){};
  return (r.constructor = r);
})();

instance('TypeSpec')(Nat).where({
  shape: function() {
    return Number;
  },
  match: function() {
    return function(v) {
      return (v != null) && v.constructor === Number && !isNaN(v) && v >= 0 && v === parseInt(v);
    };
  },
  constraints: function() {
    return function(v) {
      return [
        {
          label: function() {
            return "Nat Excepted, But Got " + (json(v));
          },
          flag: function() {
            return (v != null) && v.constructor === Number && !isNaN(v) && v >= 0 && v === parseInt(v);
          }
        }
      ];
    };
  },
  show: function() {
    return "Nat";
  },
  samples: function() {
    return concat(repeat([42, 1, 2]));
  }
});

module.exports = {
  Nat: Nat
};


},{"../typeclass":79,"coffee-mate/global":18}],69:[function(require,module,exports){
var constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, sample, samples, shape, show, specdictChecked;

require('coffee-mate/global');

instance = require('../typeclass').instance;

ref = require('../typespec'), shape = ref.shape, match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpecDict = ref1.isTypeSpecDict;

specdictChecked = function(f) {
  return function(specdict) {
    if (!isTypeSpecDict(specdict)) {
      throw Error("Bad Object Type Definition: Dict Of TypeSpec Expected, But Got " + specdict);
    }
    return f(specdict);
  };
};

instance('TypeSpec')(Object).where({
  shape: function(specdict) {
    return fromList(map(function(arg) {
      var k, spec;
      k = arg[0], spec = arg[1];
      return [k, shape(spec)];
    })(enumerate(specdict)));
  },
  match: specdictChecked(function(specdict) {
    return function(v) {
      return (v != null) && (all(function(k) {
        return specdict[k] != null;
      })(Object.keys(v))) && all(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return match(spec)(v[k]);
      })(enumerate(specdict));
    };
  }),
  constraints: function(specdict) {
    return function(v) {
      return cons({
        label: function() {
          return "Object Expected, But Got " + v;
        },
        flag: function() {
          return v != null;
        }
      })(cons({
        label: function() {
          return "Redundant Keys: " + (list(filter(function(k) {
            return specdict[k] == null;
          })(Object.keys(v))));
        },
        flag: function() {
          return all(function(k) {
            return specdict[k] != null;
          })(Object.keys(v));
        }
      })(map(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return {
          label: function() {
            return "Field " + k;
          },
          sub: function() {
            return constraints(spec)(v[k]);
          }
        };
      })(enumerate(specdict))));
    };
  },
  show: specdictChecked(function(specdict) {
    return "{" + ((list(map(function(arg) {
      var k, spec;
      k = arg[0], spec = arg[1];
      return k + ": " + (show(spec));
    })(enumerate(specdict)))).join(', ')) + "}";
  }),
  samples: specdictChecked(function(specdict) {
    return repeat(dict(list(map(function(arg) {
      var k, v;
      k = arg[0], v = arg[1];
      return [k, sample(v)];
    })(enumerate(specdict)))));
  }),
  htmlInline: specdictChecked(function(specdict) {
    return "<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>";
  }),
  htmlBlock: specdictChecked(function(specdict) {
    return {
      head: "<span class='type-maker'>{</span>",
      body: genBlockBody('object', 'field-name')(specdict),
      tail: "<span class='type-maker'>}</span>"
    };
  })
});


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],70:[function(require,module,exports){
var Choose, OneOf, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, sample, samples, shape, show;

require('coffee-mate/global');

instance = require('../typeclass').instance;

ref = require('../typespec'), shape = ref.shape, match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpec = ref1.isTypeSpec;

Choose = require('./choose').Choose;

OneOf = (function() {
  function OneOf(specs) {
    if (!((specs != null) && specs.constructor === Array)) {
      throw Error("Bad OneOf Type Definition: Array Expected, But Got " + specs);
    }
    if (!all(isTypeSpec)(specs)) {
      throw Error("Bad OneOf Type Definition: Array of TypeSpec Expected, But Got " + specs);
    }
    return {
      constructor: OneOf,
      specs: specs
    };
  }

  return OneOf;

})();

instance('TypeSpec')(OneOf).where({
  shape: function(arg) {
    var specs;
    specs = arg.specs;
    return Choose(specs.map(shape));
  },
  match: function(arg) {
    var shaped, specs;
    specs = arg.specs;
    shaped = zip(map(shape)(specs), specs);
    return function(v) {
      var matchedShapes;
      matchedShapes = filter(function(arg1) {
        var _, sh;
        sh = arg1[0], _ = arg1[1];
        return match(sh)(v);
      })(shaped);
      return length(take(2)(matchedShapes)) === 1 && match(head(matchedShapes)[1])(v);
    };
  },
  constraints: function(arg) {
    var shaped, specs;
    specs = arg.specs;
    shaped = zip(map(shape)(specs), specs);
    return function(v) {
      var matchedCount, matchedShapes;
      matchedShapes = filter(function(arg1) {
        var _, sh;
        sh = arg1[0], _ = arg1[1];
        return match(sh)(v);
      })(shaped);
      matchedCount = length(take(2)(matchedShapes));
      return [
        {
          label: function() {
            return "Shape Not Matched";
          },
          flag: function() {
            return matchedCount > 0;
          }
        }, {
          label: function() {
            return "Ambiguous Shape Matched";
          },
          flag: function() {
            return matchedCount < 2;
          }
        }, {
          label: function() {
            return "Shape " + (show(head(matchedShapes)[0]));
          },
          sub: function() {
            return constraints(head(matchedShapes)[1])(v);
          }
        }
      ];
    };
  },
  show: function(arg) {
    var specs;
    specs = arg.specs;
    return "(" + ((list(map(show)(specs))).join(' | ')) + ")";
  },
  samples: function(arg) {
    var specs;
    specs = arg.specs;
    return concat(repeat(map(sample)(specs)));
  },
  htmlInline: function(arg) {
    var specs;
    specs = arg.specs;
    return "<span class='type-maker unwrapped'>" + ((list(map(htmlInline)(specs))).join(' | ')) + "</span>";
  },
  htmlBlock: function(arg) {
    var specs;
    specs = arg.specs;
    return {
      head: "<span class='type-maker'>OneOf [</span>",
      body: genBlockBody('OneOf', 'meta-field')(dict(list(zip(naturals, specs)))),
      tail: "<span class='type-maker'>]</span>"
    };
  }
});

module.exports = {
  OneOf: OneOf
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"./choose":60,"coffee-mate/global":18}],71:[function(require,module,exports){
var Optional, constraints, expandBlockHead, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, shape, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), shape = ref1.shape, match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

ref2 = require('../helpers'), expandBlockHead = ref2.expandBlockHead, isTypeSpec = ref2.isTypeSpec;

Optional = (function() {
  function Optional(spec) {
    if (!isTypeSpec(spec)) {
      throw Error("Bad Optional Type Definition: TypeSpec as spec Expected");
    }
    return {
      constructor: Optional,
      spec: spec
    };
  }

  return Optional;

})();

instance('TypeSpec')(Optional).where({
  shape: function(arg) {
    var spec;
    spec = arg.spec;
    return Optional(shape(spec));
  },
  match: function(arg) {
    var spec;
    spec = arg.spec;
    return function(v) {
      return (v == null) || match(spec)(v);
    };
  },
  constraints: function(t) {
    return function(v) {
      if (v == null) {
        return [];
      } else {
        return [
          {
            label: function() {
              return (show(t)) + " Expected";
            },
            sub: function() {
              return constraints(t.spec)(v);
            }
          }
        ];
      }
    };
  },
  show: function(arg) {
    var spec;
    spec = arg.spec;
    return "Optional(" + (show(spec)) + ")";
  },
  samples: function(arg) {
    var ls, spec;
    spec = arg.spec;
    ls = list(take(2)(samples(spec)));
    return concat(repeat([ls[0], null, ls[1], void 0]));
  },
  htmlInline: function(arg) {
    var spec;
    spec = arg.spec;
    return "<span class='type-maker unwrapped'>Optional " + (htmlInline(spec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var spec;
    spec = arg.spec;
    return expandBlockHead(function(head) {
      return "<span class='type-maker'>Optional " + head + "</span>";
    })(spec);
  }
});

module.exports = {
  Optional: Optional
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],72:[function(require,module,exports){
var Promise, expandBlockHead, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

ref2 = require('../helpers'), expandBlockHead = ref2.expandBlockHead, isTypeSpec = ref2.isTypeSpec;

Promise = (function() {
  function Promise(spec) {
    if (!isTypeSpec(spec)) {
      throw Error("Bad Optional Type Definition: TypeSpec as spec Expected");
    }
    return {
      constructor: Promise,
      spec: spec
    };
  }

  return Promise;

})();

instance('TypeSpec')(Promise).where({
  match: function(arg) {
    var spec;
    spec = arg.spec;
    return function(v) {
      return (v != null ? v.then : void 0) != null;
    };
  },
  constraints: function(t) {
    return function(v) {
      return [
        {
          label: function() {
            return (show(t)) + " Expected, But Got " + v;
          },
          flag: function() {
            return (v != null ? v.then : void 0) != null;
          }
        }
      ];
    };
  },
  withSpec: function(arg) {
    var spec;
    spec = arg.spec;
    return function(v) {
      if ((v != null ? v.then : void 0) == null) {
        throw TypeError({
          expected: 'Promise',
          got: v
        });
      } else {
        return v.then(function(x) {
          withSpec(spec)(x);
          return x;
        });
      }
    };
  },
  show: function(arg) {
    var spec;
    spec = arg.spec;
    return "Promise(" + (show(spec)) + ")";
  },
  samples: function(arg) {
    var spec;
    spec = arg.spec;
    return samples(spec);
  },
  htmlInline: function(arg) {
    var spec;
    spec = arg.spec;
    return "<span class='type-maker unwrapped'>Promise " + (htmlInline(spec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var spec;
    spec = arg.spec;
    return expandBlockHead(function(head) {
      return "<span class='type-maker'>Promise " + head + "</span>";
    })(spec);
  }
});

module.exports = {
  Promise: Promise
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],73:[function(require,module,exports){
var Select, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, ref2, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

ref2 = require('../helpers'), genBlockBody = ref2.genBlockBody, isTypeSpecDict = ref2.isTypeSpecDict;

Select = (function() {
  function Select(specs) {
    if (!isTypeSpecDict(specs)) {
      throw Error("Bad Select Type Definition: TypeSpec as spec Expected");
    }
    if (!(Object.keys(specs).length >= 1)) {
      throw Error("Bad Select Type Definition: At Least One Selection Should Be Provided");
    }
    return {
      constructor: Select,
      specs: specs
    };
  }

  return Select;

})();

instance('TypeSpec')(Select).where({
  match: function(arg) {
    var specs;
    specs = arg.specs;
    return function(v) {
      var k, ks, spec;
      return (v != null) && (ks = Object.keys(v)).length === 1 && ((spec = specs[(k = ks[0])]) != null) && (match(spec)(v[k]));
    };
  },
  constraints: function(arg) {
    var specs;
    specs = arg.specs;
    return function(v) {
      return [
        {
          label: function() {
            return "Object Expected, But Got " + v;
          },
          flag: function() {
            return v != null;
          }
        }, {
          label: function() {
            return "Selection Between " + (Object.keys(specs).join(',')) + " Expected, But Got " + (Object.keys(v).join(',')) + " Via " + (json(v));
          },
          flag: function() {
            var k, ks, spec;
            return (ks = Object.keys(v)).length === 1 && ((spec = specs[(k = ks[0])]) != null);
          }
        }, {
          label: function() {
            var k;
            return "Selection Field " + (k = Object.keys(v)[0]) + " Expected to be " + (show(specs[k]));
          },
          sub: function() {
            var k;
            return constraints(specs[k = Object.keys(v)[0]])(v[k]);
          }
        }
      ];
    };
  },
  show: function(arg) {
    var specs;
    specs = arg.specs;
    return "Select({" + ((list(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return k + ": " + (show(spec));
    })(enumerate(specs)))).join(', ')) + "})";
  },
  samples: function(arg) {
    var specs;
    specs = arg.specs;
    return concat(repeat(map(function(arg1) {
      var k, v;
      k = arg1[0], v = arg1[1];
      return dict([[k, sample(v)]]);
    })(enumerate(specs))));
  },
  htmlInline: function(arg) {
    var specdict;
    specdict = arg.specs;
    return "<span class='type-maker unwrapped'>Select {<span class='folded-detail'>...</span>}</span>";
  },
  htmlBlock: function(arg) {
    var specdict;
    specdict = arg.specs;
    return {
      head: "<span class='type-maker'>Select {</span>",
      body: genBlockBody('select', 'field-name')(specdict),
      tail: "<span class='type-maker'>}</span>"
    };
  }
});

module.exports = {
  Select: Select
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],74:[function(require,module,exports){
var Strict, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, sample, samples, shape, show;

require('coffee-mate/global');

instance = require('../typeclass').instance;

ref = require('../typespec'), shape = ref.shape, match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpecDict = ref1.isTypeSpecDict;

Strict = (function() {
  function Strict(specdict) {
    if (!isTypeSpecDict(specdict)) {
      throw Error("Bad Strict Type Definition: Dict Of TypeSpec Expected, But Got " + specdict);
    }
    return {
      constructor: Strict,
      specdict: specdict
    };
  }

  return Strict;

})();

instance('TypeSpec')(Strict).where({
  shape: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return Strict(fromList(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return [k, shape(spec)];
    })(enumerate(specdict))));
  },
  match: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return function(v) {
      return (v != null) && v.constructor === Object && (all(function(k) {
        return specdict[k] != null;
      })(Object.keys(v))) && all(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return match(spec)(v[k]);
      })(enumerate(specdict));
    };
  },
  constraints: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return function(v) {
      return cons({
        label: function() {
          return "Object Expected, But Got " + v;
        },
        flag: function() {
          return v != null;
        }
      })(cons({
        label: function() {
          return "Redundant Keys: " + (list(filter(function(k) {
            return specdict[k] == null;
          })(Object.keys(v))));
        },
        flag: function() {
          return all(function(k) {
            return specdict[k] != null;
          })(Object.keys(v));
        }
      })(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return {
          label: function() {
            return "Field " + k;
          },
          sub: function() {
            return constraints(spec)(v[k]);
          }
        };
      })(enumerate(specdict))));
    };
  },
  show: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return "{" + ((list(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return k + ": " + (show(spec));
    })(enumerate(specdict)))).join(', ')) + "})";
  },
  samples: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return repeat(dict(list(map(function(arg1) {
      var k, v;
      k = arg1[0], v = arg1[1];
      return [k, sample(v)];
    })(enumerate(specdict)))));
  },
  htmlInline: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return "<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>";
  },
  htmlBlock: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return {
      head: "<span class='type-maker'>{</span>",
      body: genBlockBody('strict', 'field-name')(specdict),
      tail: "<span class='type-maker'>}</span>"
    };
  }
});

module.exports = {
  Strict: Strict
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],75:[function(require,module,exports){
var Tree, constraints, expandBlockHead, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

ref2 = require('../helpers'), expandBlockHead = ref2.expandBlockHead, isTypeSpec = ref2.isTypeSpec;

Tree = (function() {
  function Tree(labelSpec) {
    if (!isTypeSpec(labelSpec)) {
      throw Error("Bad Tree Type Definition: TypeSpec as labelSpec Expected");
    }
    return {
      constructor: Tree,
      labelSpec: labelSpec
    };
  }

  return Tree;

})();

instance('TypeSpec')(Tree).where({
  match: function(t) {
    return function(v) {
      var labelSpec;
      labelSpec = t.labelSpec;
      return (v != null) && (v.rootLabel != null) && (v.subForest != null) && v.subForest instanceof Array && match(labelSpec)(v.rootLabel) && all(match(t))(v.subForest);
    };
  },
  constraints: function(t) {
    var labelSpec;
    labelSpec = t.labelSpec;
    return function(v) {
      var ref3;
      return cons({
        label: function() {
          return (show(t)) + " Expected, But Got " + v;
        },
        flag: function() {
          return (v != null) && (v.rootLabel != null) && (v.subForest != null) && v.subForest instanceof Array;
        }
      })(cons({
        label: function() {
          return "Tree Label";
        },
        sub: function() {
          return constraints(labelSpec)(v.rootLabel);
        }
      })(map(function(arg) {
        var i, x;
        i = arg[0], x = arg[1];
        return {
          label: function() {
            return "Tree Subforest " + i;
          },
          sub: function() {
            return constraints(t)(x);
          }
        };
      })(zip(naturals, (ref3 = v != null ? v.subForest : void 0) != null ? ref3 : []))));
    };
  },
  show: function(arg) {
    var labelSpec;
    labelSpec = arg.labelSpec;
    return "Tree(" + (show(labelSpec)) + ")";
  },
  samples: function(arg) {
    var labelSpec, ls, s0, s1;
    labelSpec = arg.labelSpec;
    ls = list(take(2)(samples(labelSpec)));
    s0 = {
      rootLabel: ls[0],
      subForest: []
    };
    s1 = {
      rootLabel: ls[1],
      subForest: [s0]
    };
    return concat(repeat([s0, s1]));
  },
  htmlInline: function(arg) {
    var labelSpec;
    labelSpec = arg.labelSpec;
    return "<span class='type-maker unwrapped'>Tree " + (htmlInline(labelSpec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var labelSpec;
    labelSpec = arg.labelSpec;
    return expandBlockHead(function(head) {
      return "<span class='type-maker'>Tree " + head + "</span>";
    })(labelSpec);
  }
});

module.exports = {
  Tree: Tree
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],76:[function(require,module,exports){
var TreeMap, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('../typespec'), match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

ref2 = require('../helpers'), genBlockBody = ref2.genBlockBody, isTypeSpec = ref2.isTypeSpec;

TreeMap = (function() {
  function TreeMap(kspec) {
    if (!isTypeSpec(kspec)) {
      throw Error("Bad TreeMap Type Definition: TypeSpec as kspec Expected");
    }
    return function(vspec) {
      if (!isTypeSpec(vspec)) {
        throw Error("Bad TreeMap Type Definition: TypeSpec as vspec Expected");
      }
      return {
        constructor: TreeMap,
        kspec: kspec,
        vspec: vspec
      };
    };
  }

  return TreeMap;

})();

instance('TypeSpec')(TreeMap).where({
  match: function(t) {
    return function(v) {
      var ks, kspec, mk, mv, tag, vspec;
      kspec = t.kspec, vspec = t.vspec;
      mk = match(kspec);
      mv = match(t);
      return (v != null) && ((((tag = Object.keys(v)[0]) === 'node') && (all(mk)(ks = Object.keys(v.node)) && all(mv)(map(seek(v.node))(ks)))) || (tag === 'leaf' && match(vspec)(v.leaf)));
    };
  },
  constraints: function(t) {
    return function(v) {
      return cons({
        label: function() {
          return (show(t)) + " Expected, But Got " + v;
        },
        flag: function() {
          var ks, ref3, tag;
          return (v != null) && (ks = Object.keys(v)).length === 1 && ((ref3 = (tag = ks[0])) === 'node' || ref3 === 'leaf');
        }
      })(v == null ? [] : v.node != null ? concat(map(function(arg) {
        var k, v;
        k = arg[0], v = arg[1];
        return [
          {
            label: function() {
              return "TreeMap Key Expected";
            },
            sub: function() {
              return constraints(t.kspec)(k);
            }
          }, {
            label: function() {
              return (show(t)) + " Expected";
            },
            sub: function() {
              return constraints(t)(v);
            }
          }
        ];
      })(enumerate(v.node))) : [
        {
          label: function() {
            return "Leaf Expected to be " + (show(t.vspec));
          },
          sub: function() {
            return constraints(t.vspec)(v.leaf);
          }
        }
      ]);
    };
  },
  show: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return "TreeMap(" + (show(kspec)) + ")(" + (show(vspec)) + ")";
  },
  samples: function(arg) {
    var ks, kspec, vs, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    ks = list(take(4)(samples(kspec)));
    vs = list(take(3)(samples(vspec)));
    return concat(repeat([
      {
        node: dict([
          [
            ks[0], {
              node: dict([
                [
                  ks[2], {
                    leaf: vs[0]
                  }
                ], [
                  ks[3], {
                    leaf: vs[1]
                  }
                ]
              ])
            }
          ], [
            ks[1], {
              leaf: vs[2]
            }
          ]
        ])
      }
    ]));
  },
  htmlInline: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return "<span class='type-maker unwrapped'>TreeMap " + (htmlInline(kspec)) + " " + (htmlInline(vspec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var kspec, vspec;
    kspec = arg.kspec, vspec = arg.vspec;
    return {
      head: "<span class='type-maker'>TreeMap (</span>",
      body: genBlockBody('treemap', 'meta-field')({
        key: kspec,
        value: vspec
      }),
      tail: "<span class='type-maker'>)</span>"
    };
  }
});

module.exports = {
  TreeMap: TreeMap
};


},{"../helpers":55,"../typeclass":79,"../typespec":80,"coffee-mate/global":18}],77:[function(require,module,exports){
var Value, instance;

require('coffee-mate/global');

instance = require('../typeclass').instance;

Value = (function() {
  function Value(v) {
    if (v == null) {
      throw Error("Bad Value Type Definition: Non-null Value Expected, But Got " + v);
    }
    return {
      constructor: Value,
      value: v
    };
  }

  return Value;

})();

instance('TypeSpec')(Value).where({
  shape: function(spec) {
    return spec;
  },
  match: function(arg) {
    var value;
    value = arg.value;
    return function(v) {
      return v === value;
    };
  },
  show: function(arg) {
    var value;
    value = arg.value;
    return "" + (json(value));
  },
  samples: function(arg) {
    var value;
    value = arg.value;
    return repeat(value);
  },
  htmlInline: function(arg) {
    var value;
    value = arg.value;
    return "<span class='type-maker unwrapped'>Value " + (json(value)) + "</span>";
  }
});

module.exports = {
  Value: Value
};


},{"../typeclass":79,"coffee-mate/global":18}],78:[function(require,module,exports){
var Any, Bool, Choose, Comparator, ConditionExpr, Context, DimensionFilter, DimensionName, Enum, ExclusionCondition, FieldName, Fn, FooSpec, InclusionCondition, Int, Loose, Map, Measure, MeasureName, MemberName, NamedType, Nat, Number, Optional, Promise, Select, SortCondition, Strict, String, TableName, Tree, TreeMap, Value, ValueExpr, WideTable, bind, entries, fs, genRenderCode, htmlBlock, htmlInline, init, match, ref, ref1, sample, samples, show, showHtml, showPage, style;

ref = require('./typespec'), match = ref.match, show = ref.show, sample = ref.sample, samples = ref.samples, showHtml = ref.showHtml, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

style = ".typespec {\n	font-family: monospace;\n	font-size: 16px;\n	border-width: 4px;\n	border-color: rgba(165, 230, 229, 0.24);\n	border-style: ridge;\n}\n.typespec>div, .typespec>pre {\n	margin: 0.6em\n}\n.typespec .unfolded>.fold, .typespec .folded>.unfold {\n	display: none\n}\n.typespec ul {\n	list-style-type: none;\n	padding: 0px;\n	margin: 0px 0px 0px 2em;\n}\n.typespec .meta-field {\n	color: gray;\n}\n.typespec .field-name {\n	font-weight: bold;\n	color: #87BFB8\n}\n.typespec .type-name {\n	color: blue;\n}\n.typespec .spec .type-name {\n	cursor: pointer\n}\n.typespec .type-maker {\n	color: #223497\n}\n.typespec .type-maker.unwrapped>.unwrapped:before {\n	content: '('\n}\n.typespec .type-maker.unwrapped>.unwrapped:after {\n	content: ')'\n}\n.typespec .spliter {\n	color: gray;\n	padding: 0 0.5em\n}\n.typespec .sample pre {\n	margin: 0;\n	color: green;\n	max-height: 20em;\n	overflow: auto;\n}\n.typespec .spec {\n	cursor: default\n}\n.typespec .spec li:hover {\n	transition: 1s;\n	background-color: rgba(140, 150, 255, 0.12)\n}\n.typespec .spec .type-name:hover, .typespec .spec .folded-detail:hover, .typespec .fold>.field-name:hover, .typespec .unfold>.field-name:hover, .typespec .fold>.meta-field:hover, .typespec .unfold>.meta-field:hover {\n	opacity: 0.6\n}";

bind = function($) {
  return function(rootSelection) {
    rootSelection.find('.unfold').each(function(i, elm) {
      return $(elm).closest('li,.spec').addClass('unfolded').removeClass('folded');
    });
    rootSelection.find('.type-name, .choose').each(function(i, elm) {
      return $(elm).closest('li').addClass('folded').removeClass('unfolded');
    });
    return rootSelection.find('.type-name, .folded-detail, .fold>.field-name, .unfold>.field-name, .fold>.meta-field, .unfold>.meta-field').each(function(i, elm) {
      var e;
      if ((e = $(elm).closest('li,.spec')).length > 0) {
        return $(elm).css({
          cursor: 'pointer'
        }).click(function() {
          return e.toggleClass('folded').toggleClass('unfolded');
        });
      }
    });
  };
};

showPage = function(t) {
  return "<meta http-equiv='Content-Type' content='text/html; charset=utf-8' />\n<style>" + style + "</style>\n" + (showHtml(t)) + "\n<script src='http://libs.baidu.com/jquery/1.9.0/jquery.js'></script>\n<script>(" + (bind.toString()) + ")(jQuery)($('.typespec'))</script>";
};

init = function($) {
  return function(bind, specs, style) {
    $('head').append("<style>" + style + "</style>");
    $('.typespec-hook').each(function(i, elm) {
      return $(elm).append(specs[$(elm).attr('it')]);
    });
    return bind($('.typespec'));
  };
};

genRenderCode = function(entries) {
  var specs;
  specs = json(dict(list(map(function(arg) {
    var k, v;
    k = arg[0], v = arg[1];
    return [k, showHtml(v)];
  })(enumerate(entries)))));
  return "(" + (init.toString()) + ")(jQuery)((" + bind + ")(jQuery), " + specs + ", " + (json(style)) + ")";
};

module.exports = {
  showPage: showPage,
  genRenderCode: genRenderCode
};

if (module.parent === null) {
  require('coffee-mate/global');
  ref1 = require('./index'), Number = ref1.Number, String = ref1.String, Bool = ref1.Bool, Any = ref1.Any, Int = ref1.Int, Nat = ref1.Nat, Enum = ref1.Enum, Value = ref1.Value, Optional = ref1.Optional, Promise = ref1.Promise, Tree = ref1.Tree, Map = ref1.Map, TreeMap = ref1.TreeMap, Fn = ref1.Fn, NamedType = ref1.NamedType, Strict = ref1.Strict, Loose = ref1.Loose, Select = ref1.Select, Choose = ref1.Choose, match = ref1.match, show = ref1.show, sample = ref1.sample, samples = ref1.samples, showHtml = ref1.showHtml, genRenderCode = ref1.genRenderCode, showPage = ref1.showPage;
  TableName = NamedType({
    name: 'TableName',
    spec: String,
    samples: ['table1', 'table2']
  });
  FieldName = NamedType({
    name: 'FieldName',
    spec: String,
    samples: ['product_id', 'sale', 'amount']
  });
  Comparator = Enum(['=', '<', '<=', '>=', '>']);
  WideTable = [
    {
      tableName: TableName,
      join: {
        leftTableName: TableName,
        left: FieldName,
        op: Comparator,
        right: FieldName
      }
    }
  ];
  DimensionName = NamedType({
    name: 'DimensionName',
    spec: String,
    samples: ['date', 'product_type', 'city']
  });
  MeasureName = NamedType({
    name: 'MeasureName',
    spec: String,
    samples: ['sale', 'profit', 'amount']
  });
  Measure = NamedType({
    name: 'Measure',
    spec: Strict({
      name: MeasureName,
      aggregator: Enum(['sum', 'avg', 'max', 'min'])
    })
  });
  MemberName = NamedType({
    name: 'MemberName',
    spec: String,
    samples: ['2013', '2014', '2015']
  });
  ValueExpr = NamedType({
    name: 'ValueExpr',
    spec: String,
    samples: ['sum(sale)']
  });
  ConditionExpr = NamedType({
    name: 'ConditionExpr',
    spec: String,
    samples: ['sum(sale) > 100']
  });
  DimensionFilter = NamedType({
    name: 'DimensionFilter',
    spec: Strict({
      select: [MemberName],
      match: Select({
        contains: String,
        startWith: String,
        endWith: String
      }),
      condition: Select({
        limit: Strict({
          measure: Measure,
          comparator: Comparator,
          value: Number
        }),
        expr: ConditionExpr
      }),
      top: Strict({
        count: Number,
        by: Select({
          measure: Measure,
          expr: ValueExpr
        })
      })
    })
  });
  InclusionCondition = NamedType({
    name: 'InclusionCondition',
    spec: Strict({
      via: [DimensionName],
      positions: [[MemberName]]
    })
  });
  ExclusionCondition = NamedType({
    name: 'ExclusionCondition',
    spec: Strict({
      via: [DimensionName],
      positions: [[MemberName]]
    })
  });
  SortCondition = NamedType({
    name: 'SortCondition',
    spec: Strict({
      asc: Bool,
      by: Select({
        measure: Measure,
        expr: ValueExpr
      }),
      where: Optional(ConditionExpr)
    })
  });
  Context = {
    filter: Strict({
      dimensions: Map(DimensionName)(DimensionFilter),
      measures: [
        Strict({
          measure: Measure,
          limit: {
            minBound: Optional(Number),
            maxBound: Optional(Number)
          }
        })
      ],
      inclusions: [InclusionCondition],
      exclusions: [ExclusionCondition]
    }),
    sort: Map(DimensionName)(SortCondition)
  };
  log(function() {
    return json(sample(WideTable), 4);
  });
  log(function() {
    return show(Context);
  });
  FooSpec = NamedType({
    name: 'FooSpec',
    spec: Fn(Number)(Fn({
      x: Number,
      y: Number
    })(Promise({
      x: String,
      y: Choose([Nat, String, Value('unavailable')])
    }))),
    desc: "hello",
    check: function(x) {
      return x > 1;
    }
  });
  fs = require('fs');
  fs.writeFileSync('test.html', showPage(WideTable));
  entries = {
    a: FooSpec,
    b: WideTable,
    c: Context,
    d: FieldName,
    e: Select({
      x: Number,
      y: String
    }),
    f: Fn(Tree(Int))(Loose({
      x: Number,
      y: Number
    }))
  };
  fs.writeFileSync('test2.js', genRenderCode(entries));
}


},{"./index":56,"./typespec":80,"coffee-mate/global":18,"fs":1}],79:[function(require,module,exports){
var instance, ref, show, typeclass;

require('coffee-mate/global');

ref = (function() {
  var instance, instances, reg, typeclass;
  instances = {};
  reg = {};
  typeclass = function(classname) {
    var cls, ins;
    cls = reg[classname] != null ? reg[classname] : reg[classname] = {};
    ins = instances[classname] != null ? instances[classname] : instances[classname] = [];
    return {
      hasInstance: function(t) {
        return ins.indexOf(t) >= 0;
      },
      where: function(funcs) {
        var rst_funcs;
        rst_funcs = {};
        foreach(enumerate(funcs), function(arg1) {
          var f, funcdefault, funcname, ls;
          funcname = arg1[0], funcdefault = arg1[1];
          ls = cls[funcname] != null ? cls[funcname] : cls[funcname] = [];
          f = function(arg) {
            var funcbody, i, len, ref, type;
            if (arg == null) {
              throw TypeError("No Instance of " + classname + "(via " + funcname + "(" + arg + ")) For " + arg);
            }
            for (i = 0, len = ls.length; i < len; i++) {
              ref = ls[i], type = ref[0], funcbody = ref[1];
              if (arg.constructor === type) {
                return funcbody(arg);
              }
            }
            if (funcdefault != null) {
              return funcdefault.call(rst_funcs, arg);
            } else {
              throw TypeError("No Instance of " + classname + "(via " + funcname + "(" + arg + ")) For " + (arg.constructor.name || 'UnnamedType'));
            }
          };
          return rst_funcs[funcname] = f;
        });
        return rst_funcs;
      }
    };
  };
  instance = function(classname) {
    var cls, ins;
    cls = reg[classname] != null ? reg[classname] : reg[classname] = {};
    ins = instances[classname] != null ? instances[classname] : instances[classname] = [];
    return function(type) {
      if (ins.indexOf(type) < 0) {
        ins.push(type);
      }
      return {
        where: function(funcdict) {
          return foreach(enumerate(funcdict), function(arg1) {
            var funcbody, funcname;
            funcname = arg1[0], funcbody = arg1[1];
            return (cls[funcname] != null ? cls[funcname] : cls[funcname] = []).push([type, funcbody]);
          });
        }
      };
    };
  };
  typeclass.registered = reg;
  instance.registered = instances;
  return {
    typeclass: typeclass,
    instance: instance
  };
})(), typeclass = ref.typeclass, instance = ref.instance;

module.exports = {
  typeclass: typeclass,
  instance: instance
};

if (module.parent === null) {
  show = typeclass('Show').where({
    show: function(x) {
      return str(this.zero(x));
    },
    zero: function() {
      return 0;
    }
  }).show;
  instance('Show')(String).where({
    show: function(s) {
      return json(s);
    }
  });
  instance('Show')(Number).where({});
  log(function() {
    return show("hello");
  });
  log(function() {
    return show(1);
  });
  log(function() {
    return typeclass('Show').hasInstance(String);
  });
  log(function() {
    return typeclass('Show').hasInstance(Number);
  });
  log(function() {
    return typeclass('Show').hasInstance(Object);
  });
}


},{"coffee-mate/global":18}],80:[function(require,module,exports){
var Any, TypeSpec, constraints, typeclass, unmatchMessages;

require('coffee-mate/global');

typeclass = require('./typeclass').typeclass;

Any = require('./prim/any').Any;

TypeSpec = typeclass('TypeSpec').where({
  match: null,
  shape: function(t) {
    return Any;
  },
  constraints: function(t) {
    return (function(_this) {
      return function(v) {
        return [
          {
            label: function() {
              return (_this.show(t)) + " Expected, But Got " + (json(v));
            },
            flag: function() {
              return _this.match(t)(v);
            }
          }
        ];
      };
    })(this);
  },
  withSpec: function(t) {
    return function(v) {
      if (!this.match(t)(v)) {
        throw TypeError({
          expected: this.show(t),
          got: v
        });
      } else {
        return v;
      }
    };
  },
  show: function(t) {
    return t.name || 'UnnamedType';
  },
  samples: null,
  sample: function(t) {
    return head(this.samples(t));
  },
  htmlInline: function(t) {
    return "<span class='type-maker'>" + (this.show(t)) + "</span>";
  },
  htmlBlock: function(t) {
    return null;
  },
  showHtml: function(t) {
    var samplePart, specPart;
    specPart = (function(_this) {
      return function() {
        var block, ref, ref1;
        block = _this.htmlBlock(t);
        return ("<div class='spec'>\n<div class='" + (block != null ? 'fold' : 'inline') + "'><span class='meta-field'>spec</span>: " + (_this.htmlInline(t)) + "</div>\n" + (block != null ? "<div class='unfold'>\n	<span class='meta-field'>spec</span>: " + block.head + "\n	" + ((ref = block.body) != null ? ref : '') + "\n	" + ((ref1 = block.tail) != null ? ref1 : '') + "\n</div>" : '') + "\n</div>").replace(/(\t|\n)/g, '');
      };
    })(this)();
    samplePart = (function(_this) {
      return function() {
        var s;
        s = json(_this.sample(t), 4);
        return "<div class='sample'>\n<span class='meta-field'>sample</span>: " + (/\n/.test(s) ? "<pre class='code'>" + s + "</pre>" : "<span class='code'>" + s + "</span>") + "\n</div>";
      };
    })(this)();
    return "<div class='typespec'>" + (specPart + samplePart) + "</div>";
  }
});

constraints = TypeSpec.constraints;

unmatchMessages = function(spec) {
  return function(v) {
    var r, rec;
    r = [];
    rec = function(ls) {
      var rst;
      rst = true;
      foreach(ls, function(arg) {
        var flag, label, sub;
        label = arg.label, flag = arg.flag, sub = arg.sub;
        if (flag != null) {
          if (flag() === false) {
            r.push(label());
            rst = false;
            return foreach["break"];
          }
        } else if (sub != null) {
          if (rec(sub()) === false) {
            r.push(label());
            rst = false;
            return foreach["break"];
          }
        }
      });
      return rst;
    };
    rec(constraints(spec)(v));
    return r.reverse();
  };
};

module.exports = extend({
  unmatchMessages: unmatchMessages
})(TypeSpec);


},{"./prim/any":57,"./typeclass":79,"coffee-mate/global":18}]},{},[54])(54)
});


//# sourceMappingURL=global.js.map