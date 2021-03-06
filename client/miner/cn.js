var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
    if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key]
    }
}
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
if (Module["ENVIRONMENT"]) {
    if (Module["ENVIRONMENT"] === "WEB") {
        ENVIRONMENT_IS_WEB = true
    } else if (Module["ENVIRONMENT"] === "WORKER") {
        ENVIRONMENT_IS_WORKER = true
    } else if (Module["ENVIRONMENT"] === "NODE") {
        ENVIRONMENT_IS_NODE = true
    } else if (Module["ENVIRONMENT"] === "SHELL") {
        ENVIRONMENT_IS_SHELL = true
    } else {
        throw new Error("The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.")
    }
} else {
    ENVIRONMENT_IS_WEB = typeof window === "object";
    ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
    ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER
}
if (ENVIRONMENT_IS_NODE) {
    if (!Module["print"]) Module["print"] = console.log;
    if (!Module["printErr"]) Module["printErr"] = console.warn;
    var nodeFS;
    var nodePath;
    Module["read"] = function shell_read(filename, binary) {
        var ret;
        ret = tryParseAsDataURI(filename);
        if (!ret) {
            if (!nodeFS) nodeFS = require("fs");
            if (!nodePath) nodePath = require("path");
            filename = nodePath["normalize"](filename);
            ret = nodeFS["readFileSync"](filename)
        }
        return binary ? ret : ret.toString()
    };
    Module["readBinary"] = function readBinary(filename) {
        var ret = Module["read"](filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret)
        }
        assert(ret.buffer);
        return ret
    };
    if (!Module["thisProgram"]) {
        if (process["argv"].length > 1) {
            Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
        } else {
            Module["thisProgram"] = "unknown-program"
        }
    }
    Module["arguments"] = process["argv"].slice(2);
    if (typeof module !== "undefined") {
        module["exports"] = Module
    }
    process["on"]("uncaughtException", (function(ex) {
        if (!(ex instanceof ExitStatus)) {
            throw ex
        }
    }));
    process["on"]("unhandledRejection", (function(reason, p) {
        process["exit"](1)
    }));
    Module["inspect"] = (function() {
        return "[Emscripten Module object]"
    })
} else if (ENVIRONMENT_IS_SHELL) {
    if (!Module["print"]) Module["print"] = print;
    if (typeof printErr != "undefined") Module["printErr"] = printErr;
    if (typeof read != "undefined") {
        Module["read"] = function shell_read(f) {
            var data = tryParseAsDataURI(f);
            if (data) {
                return intArrayToString(data)
            }
            return read(f)
        }
    } else {
        Module["read"] = function shell_read() {
            throw "no read() available"
        }
    }
    Module["readBinary"] = function readBinary(f) {
        var data;
        data = tryParseAsDataURI(f);
        if (data) {
            return data
        }
        if (typeof readbuffer === "function") {
            return new Uint8Array(readbuffer(f))
        }
        data = read(f, "binary");
        assert(typeof data === "object");
        return data
    };
    if (typeof scriptArgs != "undefined") {
        Module["arguments"] = scriptArgs
    } else if (typeof arguments != "undefined") {
        Module["arguments"] = arguments
    }
    if (typeof quit === "function") {
        Module["quit"] = (function(status, toThrow) {
            quit(status)
        })
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module["read"] = function shell_read(url) {
        try {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText
        } catch (err) {
            var data = tryParseAsDataURI(url);
            if (data) {
                return intArrayToString(data)
            }
            throw err
        }
    };
    if (ENVIRONMENT_IS_WORKER) {
        Module["readBinary"] = function readBinary(url) {
            try {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            } catch (err) {
                var data = tryParseAsDataURI(url);
                if (data) {
                    return data
                }
                throw err
            }
        }
    }
    Module["readAsync"] = function readAsync(url, onload, onerror) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function xhr_onload() {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                onload(xhr.response);
                return
            }
            var data = tryParseAsDataURI(url);
            if (data) {
                onload(data.buffer);
                return
            }
            onerror()
        };
        xhr.onerror = onerror;
        xhr.send(null)
    };
    if (typeof arguments != "undefined") {
        Module["arguments"] = arguments
    }
    if (typeof console !== "undefined") {
        if (!Module["print"]) Module["print"] = function shell_print(x) {
            console.log(x)
        };
        if (!Module["printErr"]) Module["printErr"] = function shell_printErr(x) {
            console.warn(x)
        }
    } else {
        var TRY_USE_DUMP = false;
        if (!Module["print"]) Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
            dump(x)
        }) : (function(x) {})
    }
    if (typeof Module["setWindowTitle"] === "undefined") {
        Module["setWindowTitle"] = (function(title) {
            document.title = title
        })
    }
} else {
    throw new Error("Unknown runtime environment. Where are we?")
}
if (!Module["print"]) {
    Module["print"] = (function() {})
}
if (!Module["printErr"]) {
    Module["printErr"] = Module["print"]
}
if (!Module["arguments"]) {
    Module["arguments"] = []
}
if (!Module["thisProgram"]) {
    Module["thisProgram"] = "./this.program"
}
if (!Module["quit"]) {
    Module["quit"] = (function(status, toThrow) {
        throw toThrow
    })
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
Module["preRun"] = [];
Module["postRun"] = [];
for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key]
    }
}
moduleOverrides = undefined;
var STACK_ALIGN = 16;

function staticAlloc(size) {
    assert(!staticSealed);
    var ret = STATICTOP;
    STATICTOP = STATICTOP + size + 15 & -16;
    return ret
}

function dynamicAlloc(size) {
    assert(DYNAMICTOP_PTR);
    var ret = HEAP32[DYNAMICTOP_PTR >> 2];
    var end = ret + size + 15 & -16;
    HEAP32[DYNAMICTOP_PTR >> 2] = end;
    if (end >= TOTAL_MEMORY) {
        var success = enlargeMemory();
        if (!success) {
            HEAP32[DYNAMICTOP_PTR >> 2] = ret;
            return 0
        }
    }
    return ret
}

function alignMemory(size, factor) {
    if (!factor) factor = STACK_ALIGN;
    var ret = size = Math.ceil(size / factor) * factor;
    return ret
}

function getNativeTypeSize(type) {
    switch (type) {
        case "i1":
        case "i8":
            return 1;
        case "i16":
            return 2;
        case "i32":
            return 4;
        case "i64":
            return 8;
        case "float":
            return 4;
        case "double":
            return 8;
        default:
            {
                if (type[type.length - 1] === "*") {
                    return 4
                } else if (type[0] === "i") {
                    var bits = parseInt(type.substr(1));
                    assert(bits % 8 === 0);
                    return bits / 8
                } else {
                    return 0
                }
            }
    }
}

function warnOnce(text) {
    if (!warnOnce.shown) warnOnce.shown = {};
    if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        Module.printErr(text)
    }
}
var functionPointers = new Array(0);
var funcWrappers = {};

function dynCall(sig, ptr, args) {
    if (args && args.length) {
        return Module["dynCall_" + sig].apply(null, [ptr].concat(args))
    } else {
        return Module["dynCall_" + sig].call(null, ptr)
    }
}
var Runtime = {
    dynCall: dynCall
};
var GLOBAL_BASE = 1024;
var ABORT = 0;
var EXITSTATUS = 0;

function assert(condition, text) {
    if (!condition) {
        abort("Assertion failed: " + text)
    }
}

function getCFunc(ident) {
    var func = Module["_" + ident];
    assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
    return func
}
var JSfuncs = {
    "stackSave": (function() {
        stackSave()
    }),
    "stackRestore": (function() {
        stackRestore()
    }),
    "arrayToC": (function(arr) {
        var ret = stackAlloc(arr.length);
        writeArrayToMemory(arr, ret);
        return ret
    }),
    "stringToC": (function(str) {
        var ret = 0;
        if (str !== null && str !== undefined && str !== 0) {
            var len = (str.length << 2) + 1;
            ret = stackAlloc(len);
            stringToUTF8(str, ret, len)
        }
        return ret
    })
};
var toC = {
    "string": JSfuncs["stringToC"],
    "array": JSfuncs["arrayToC"]
};

function ccall(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
        for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]];
            if (converter) {
                if (stack === 0) stack = stackSave();
                cArgs[i] = converter(args[i])
            } else {
                cArgs[i] = args[i]
            }
        }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === "string") ret = Pointer_stringify(ret);
    if (stack !== 0) {
        stackRestore(stack)
    }
    return ret
}

function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    var numericArgs = argTypes.every((function(type) {
        return type === "number"
    }));
    var numericRet = returnType !== "string";
    if (numericRet && numericArgs) {
        return cfunc
    }
    return (function() {
        return ccall(ident, returnType, argTypes, arguments)
    })
}
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*") type = "i32";
    switch (type) {
        case "i1":
            HEAP8[ptr >> 0] = value;
            break;
        case "i8":
            HEAP8[ptr >> 0] = value;
            break;
        case "i16":
            HEAP16[ptr >> 1] = value;
            break;
        case "i32":
            HEAP32[ptr >> 2] = value;
            break;
        case "i64":
            tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
            break;
        case "float":
            HEAPF32[ptr >> 2] = value;
            break;
        case "double":
            HEAPF64[ptr >> 3] = value;
            break;
        default:
            abort("invalid type for setValue: " + type)
    }
}
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
var ALLOC_DYNAMIC = 3;
var ALLOC_NONE = 4;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === "number") {
        zeroinit = true;
        size = slab
    } else {
        zeroinit = false;
        size = slab.length
    }
    var singleType = typeof types === "string" ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
        ret = ptr
    } else {
        ret = [typeof _malloc === "function" ? _malloc : staticAlloc, stackAlloc, staticAlloc, dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
    }
    if (zeroinit) {
        var stop;
        ptr = ret;
        assert((ret & 3) == 0);
        stop = ret + (size & ~3);
        for (; ptr < stop; ptr += 4) {
            HEAP32[ptr >> 2] = 0
        }
        stop = ret + size;
        while (ptr < stop) {
            HEAP8[ptr++ >> 0] = 0
        }
        return ret
    }
    if (singleType === "i8") {
        if (slab.subarray || slab.slice) {
            HEAPU8.set(slab, ret)
        } else {
            HEAPU8.set(new Uint8Array(slab), ret)
        }
        return ret
    }
    var i = 0,
        type, typeSize, previousType;
    while (i < size) {
        var curr = slab[i];
        type = singleType || types[i];
        if (type === 0) {
            i++;
            continue
        }
        if (type == "i64") type = "i32";
        setValue(ret + i, curr, type);
        if (previousType !== type) {
            typeSize = getNativeTypeSize(type);
            previousType = type
        }
        i += typeSize
    }
    return ret
}

function getMemory(size) {
    if (!staticSealed) return staticAlloc(size);
    if (!runtimeInitialized) return dynamicAlloc(size);
    return _malloc(size)
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr) return "";
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
        t = HEAPU8[ptr + i >> 0];
        hasUtf |= t;
        if (t == 0 && !length) break;
        i++;
        if (length && i == length) break
    }
    if (!length) length = i;
    var ret = "";
    if (hasUtf < 128) {
        var MAX_CHUNK = 1024;
        var curr;
        while (length > 0) {
            curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
            ret = ret ? ret + curr : curr;
            ptr += MAX_CHUNK;
            length -= MAX_CHUNK
        }
        return ret
    }
    return UTF8ToString(ptr)
}
var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(u8Array, idx) {
    var endPtr = idx;
    while (u8Array[endPtr]) ++endPtr;
    if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))
    } else {
        var u0, u1, u2, u3, u4, u5;
        var str = "";
        while (1) {
            u0 = u8Array[idx++];
            if (!u0) return str;
            if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue
            }
            u1 = u8Array[idx++] & 63;
            if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue
            }
            u2 = u8Array[idx++] & 63;
            if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2
            } else {
                u3 = u8Array[idx++] & 63;
                if ((u0 & 248) == 240) {
                    u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
                } else {
                    u4 = u8Array[idx++] & 63;
                    if ((u0 & 252) == 248) {
                        u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
                    } else {
                        u5 = u8Array[idx++] & 63;
                        u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
                    }
                }
            }
            if (u0 < 65536) {
                str += String.fromCharCode(u0)
            } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
            }
        }
    }
}

function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr)
}

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) {
            if (outIdx >= endIdx) break;
            outU8Array[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break;
            outU8Array[outIdx++] = 192 | u >> 6;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break;
            outU8Array[outIdx++] = 224 | u >> 12;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 2097151) {
            if (outIdx + 3 >= endIdx) break;
            outU8Array[outIdx++] = 240 | u >> 18;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 67108863) {
            if (outIdx + 4 >= endIdx) break;
            outU8Array[outIdx++] = 248 | u >> 24;
            outU8Array[outIdx++] = 128 | u >> 18 & 63;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 5 >= endIdx) break;
            outU8Array[outIdx++] = 252 | u >> 30;
            outU8Array[outIdx++] = 128 | u >> 24 & 63;
            outU8Array[outIdx++] = 128 | u >> 18 & 63;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) {
            ++len
        } else if (u <= 2047) {
            len += 2
        } else if (u <= 65535) {
            len += 3
        } else if (u <= 2097151) {
            len += 4
        } else if (u <= 67108863) {
            len += 5
        } else {
            len += 6
        }
    }
    return len
}
var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

function demangle(func) {
    return func
}

function demangleAll(text) {
    var regex = /__Z[\w\d_]+/g;
    return text.replace(regex, (function(x) {
        var y = demangle(x);
        return x === y ? x : x + " [" + y + "]"
    }))
}

function jsStackTrace() {
    var err = new Error;
    if (!err.stack) {
        try {
            throw new Error(0)
        } catch (e) {
            err = e
        }
        if (!err.stack) {
            return "(no stack trace available)"
        }
    }
    return err.stack.toString()
}

function stackTrace() {
    var js = jsStackTrace();
    if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
    return demangleAll(js)
}
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;

function alignUp(x, multiple) {
    if (x % multiple > 0) {
        x += multiple - x % multiple
    }
    return x
}
var HEAP, buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBuffer(buf) {
    Module["buffer"] = buffer = buf
}

function updateGlobalBufferViews() {
    Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
    Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
    Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer)
}
var STATIC_BASE, STATICTOP, staticSealed;
var STACK_BASE, STACKTOP, STACK_MAX;
var DYNAMIC_BASE, DYNAMICTOP_PTR;
STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
staticSealed = false;

function abortOnCannotGrowMemory() {
    abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")
}

function enlargeMemory() {
    abortOnCannotGrowMemory()
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 67108864;
if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
if (Module["buffer"]) {
    buffer = Module["buffer"]
} else {
    if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
        Module["wasmMemory"] = new WebAssembly.Memory({
            "initial": TOTAL_MEMORY / WASM_PAGE_SIZE,
            "maximum": TOTAL_MEMORY / WASM_PAGE_SIZE
        });
        buffer = Module["wasmMemory"].buffer
    } else {
        buffer = new ArrayBuffer(TOTAL_MEMORY)
    }
}
updateGlobalBufferViews();

function getTotalMemory() {
    return TOTAL_MEMORY
}
HEAP32[0] = 1668509029;
HEAP16[1] = 25459;
if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw "Runtime error: expected the system to be little-endian!";
Module["HEAP"] = HEAP;
Module["buffer"] = buffer;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
            callback();
            continue
        }
        var func = callback.func;
        if (typeof func === "number") {
            if (callback.arg === undefined) {
                Module["dynCall_v"](func)
            } else {
                Module["dynCall_vi"](func, callback.arg)
            }
        } else {
            func(callback.arg === undefined ? null : callback.arg)
        }
    }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPRERUN__)
}

function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__)
}

function preMain() {
    callRuntimeCallbacks(__ATMAIN__)
}

function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true
}

function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}

function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}

function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer)
}
assert(Math["imul"] && Math["fround"] && Math["clz32"] && Math["trunc"], "this is a legacy browser, build with LEGACY_VM_SUPPORT");
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
    return id
}

function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
    return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0
}

function integrateWasmJS() {
    var wasmTextFile = "";
    var wasmBinaryFile = "data:application/octet-stream;base64,AGFzbQEAAAABiAEVYAN/f38AYAN/f38Bf2ABfwBgAAF/YAJ/fwF/YAF/AX9gAn9/AGAEf39/fwBgA39/fgBgAn9/AX5gBH9/f38Bf2ADfn9/AX9gAn5/AX9gBX9/f39/AGAGf3x/f39/AX9gAnx/AXxgAn9/AXxgBH9/f38BfGAFf39/f38BfGABfwF+YAJ8fAF8AqkCEANlbnYORFlOQU1JQ1RPUF9QVFIDfwADZW52CFNUQUNLVE9QA38ABmdsb2JhbANOYU4DfAAGZ2xvYmFsCEluZmluaXR5A3wAA2VudgZtZW1vcnkCAYAIgAgDZW52BXRhYmxlAXABDAwDZW52CXRhYmxlQmFzZQN/AANlbnYFYWJvcnQAAgNlbnYNZW5sYXJnZU1lbW9yeQADA2Vudg5nZXRUb3RhbE1lbW9yeQADA2VudhdhYm9ydE9uQ2Fubm90R3Jvd01lbW9yeQADA2VudgtfX19zZXRFcnJObwACA2VudgxfX19zeXNjYWxsMjAABANlbnYWX2Vtc2NyaXB0ZW5fbWVtY3B5X2JpZwABA2VudgZfZnRpbWUABQNlbnYHX2dtdGltZQAFA1RTBQAADQYBAgEGBQAFBAgMAAAPAgoABwEPFBQTCA8EAAUEBgQGAwYHBwIAAAcKAQAFARQAEhEQAQQGAQYBAQUAAQQEDgwLBAYEBAkFBQMDAgQAAwUGHwZ/ASMAC38BIwELfwFBAAt/AUEAC3wBIwILfAEjAwsHmQEKEV9fX2Vycm5vX2xvY2F0aW9uAFUbX2Vtc2NyaXB0ZW5fZ2V0X2dsb2JhbF9saWJjAFYIX2hhc2hfY24AWAdfbWFsbG9jABIMZHluQ2FsbF9paWlpADUMZHluQ2FsbF92aWlpADQIc2V0VGhyZXcATwpzdGFja0FsbG9jAFsMc3RhY2tSZXN0b3JlAFcJc3RhY2tTYXZlAFoJEgEAIwQLDB9FQh8ZOzczWRkZGQq72QRT1gEBBX8CQAJAIABB6ABqIgIoAgAiAQRAIAAoAmwgAU4NAQsgABBUIgVBAEgNACAAQQhqIQEgAigCACICBEAgASgCACIDIQEgAyAAKAIEIgNrIAIgAEHsAGoiAigCAGsiBEgEQCABIgQhAQUgAyAEQX9qaiEECwUgAEHsAGohAiABKAIAIgEhBCAAKAIEIQMLIAAgBDYCZCABBEAgAiABQQFqIANrIAIoAgBqNgIACyADQX9qIgAtAAAgBUcEQCAAIAU6AAALDAELIABBADYCZEF/IQULIAUL2R0BFX8gACAAKAIAIAJzIgQ2AgAgAkEQcyAAQQhqIgsoAgBzIQcgCyAHNgIAIAJBIHMgAEEQaiIMKAIAcyEIIAwgCDYCACACQTBzIABBGGoiDigCAHMhAyAOIAM2AgAgAEEgaiIPIAJBwABzIA8oAgBzNgIAIABBKGoiESACQdAAcyARKAIAczYCACAAQTBqIhMgAkHgAHMgEygCAHM2AgAgAEE4aiIVIAJB8ABzIBUoAgBzNgIAIAdBB3ZB/gNxIglBAnRB0CtqKAIAIQIgCEEPdkH+A3EiCkECdEHQK2ooAgAhByADQRh2QQF0Ig1BAnRB0CtqKAIAIQggAC0ALUEBdCIQQQJ0QdAraigCACEDIAAtADZBAXQiEkECdEHQK2ooAgAhBiAALQA/QQF0IhRBAnRB0CtqKAIAIQUgCUEBckECdEHQK2ooAgAiCUEIdCACQRh2ciAEQQF0Qf4DcSIEQQFyQQJ0QdAraigCAHMgCkEBckECdEHQK2ooAgAiCkEQdCAHQRB2cnMgDUEBckECdEHQK2ooAgAiDUEYdCAIQQh2cnMgAC0AJEEBdCIWQQJ0QdAraigCAHMgEEEBckECdEHQK2ooAgAiEEEYdiADQQh0cnMgEkEBckECdEHQK2ooAgAiEkEQdiAGQRB0cnMgFEEBckECdEHQK2ooAgAiFEEIdiAFQRh0cnMhFyABIAlBGHYgAkEIdHIgBEECdEHQK2ooAgBzIApBEHYgB0EQdHJzIA1BCHYgCEEYdHJzIBZBAXJBAnRB0CtqKAIAcyAQQQh0IANBGHZycyASQRB0IAZBEHZycyAUQRh0IAVBCHZyczYCACABIBc2AgQgAC0AEUEBdCIEQQJ0QdAraigCACECIAAtABpBAXQiCUECdEHQK2ooAgAhByAALQAjQQF0IgpBAnRB0CtqKAIAIQggAC0ANUEBdCINQQJ0QdAraigCACEDIAAtAD5BAXQiEEECdEHQK2ooAgAhBiAALQAHQQF0IhJBAnRB0CtqKAIAIQUgBEEBckECdEHQK2ooAgAiBEEIdCACQRh2ciALLQAAQQF0IgtBAXJBAnRB0CtqKAIAcyAJQQFyQQJ0QdAraigCACIJQRB0IAdBEHZycyAKQQFyQQJ0QdAraigCACIKQRh0IAhBCHZycyAALQAsQQF0IhRBAnRB0CtqKAIAcyANQQFyQQJ0QdAraigCACINQRh2IANBCHRycyAQQQFyQQJ0QdAraigCACIQQRB2IAZBEHRycyASQQFyQQJ0QdAraigCACISQQh2IAVBGHRycyEWIAEgBEEYdiACQQh0ciALQQJ0QdAraigCAHMgCUEQdiAHQRB0cnMgCkEIdiAIQRh0cnMgFEEBckECdEHQK2ooAgBzIA1BCHQgA0EYdnJzIBBBEHQgBkEQdnJzIBJBGHQgBUEIdnJzNgIIIAEgFjYCDCAALQAZQQF0IgVBAnRB0CtqKAIAIQIgAC0AIkEBdCIEQQJ0QdAraigCACELIAAtACtBAXQiCUECdEHQK2ooAgAhByAALQA9QQF0IgpBAnRB0CtqKAIAIQggAC0ABkEBdCINQQJ0QdAraigCACEDIAAtAA9BAXQiEEECdEHQK2ooAgAhBiAFQQFyQQJ0QdAraigCACIFQQh0IAJBGHZyIAwtAABBAXQiDEEBckECdEHQK2ooAgBzIARBAXJBAnRB0CtqKAIAIgRBEHQgC0EQdnJzIAlBAXJBAnRB0CtqKAIAIglBGHQgB0EIdnJzIAAtADRBAXQiEkECdEHQK2ooAgBzIApBAXJBAnRB0CtqKAIAIgpBGHYgCEEIdHJzIA1BAXJBAnRB0CtqKAIAIg1BEHYgA0EQdHJzIBBBAXJBAnRB0CtqKAIAIhBBCHYgBkEYdHJzIRQgASAFQRh2IAJBCHRyIAxBAnRB0CtqKAIAcyAEQRB2IAtBEHRycyAJQQh2IAdBGHRycyASQQFyQQJ0QdAraigCAHMgCkEIdCAIQRh2cnMgDUEQdCADQRB2cnMgEEEYdCAGQQh2cnM2AhAgASAUNgIUIAAtACFBAXQiBkECdEHQK2ooAgAhAiAALQAqQQF0IgVBAnRB0CtqKAIAIQsgAC0AM0EBdCIEQQJ0QdAraigCACEHIAAtAAVBAXQiCUECdEHQK2ooAgAhDCAALQAOQQF0IgpBAnRB0CtqKAIAIQggAC0AF0EBdCINQQJ0QdAraigCACEDIAZBAXJBAnRB0CtqKAIAIgZBCHQgAkEYdnIgDi0AAEEBdCIOQQFyQQJ0QdAraigCAHMgBUEBckECdEHQK2ooAgAiBUEQdCALQRB2cnMgBEEBckECdEHQK2ooAgAiBEEYdCAHQQh2cnMgAC0APEEBdCIQQQJ0QdAraigCAHMgCUEBckECdEHQK2ooAgAiCUEYdiAMQQh0cnMgCkEBckECdEHQK2ooAgAiCkEQdiAIQRB0cnMgDUEBckECdEHQK2ooAgAiDUEIdiADQRh0cnMhEiABIAZBGHYgAkEIdHIgDkECdEHQK2ooAgBzIAVBEHYgC0EQdHJzIARBCHYgB0EYdHJzIBBBAXJBAnRB0CtqKAIAcyAJQQh0IAxBGHZycyAKQRB0IAhBEHZycyANQRh0IANBCHZyczYCGCABIBI2AhwgAC0AKUEBdCIDQQJ0QdAraigCACECIAAtADJBAXQiBkECdEHQK2ooAgAhCyAALQA7QQF0IgVBAnRB0CtqKAIAIQcgAC0ADUEBdCIEQQJ0QdAraigCACEMIAAtABZBAXQiCUECdEHQK2ooAgAhCCAALQAfQQF0IgpBAnRB0CtqKAIAIQ4gA0EBckECdEHQK2ooAgAiA0EIdCACQRh2ciAPLQAAQQF0Ig9BAXJBAnRB0CtqKAIAcyAGQQFyQQJ0QdAraigCACIGQRB0IAtBEHZycyAFQQFyQQJ0QdAraigCACIFQRh0IAdBCHZycyAALQAEQQF0Ig1BAnRB0CtqKAIAcyAEQQFyQQJ0QdAraigCACIEQRh2IAxBCHRycyAJQQFyQQJ0QdAraigCACIJQRB2IAhBEHRycyAKQQFyQQJ0QdAraigCACIKQQh2IA5BGHRycyEQIAEgA0EYdiACQQh0ciAPQQJ0QdAraigCAHMgBkEQdiALQRB0cnMgBUEIdiAHQRh0cnMgDUEBckECdEHQK2ooAgBzIARBCHQgDEEYdnJzIAlBEHQgCEEQdnJzIApBGHQgDkEIdnJzNgIgIAEgEDYCJCAALQAxQQF0IgNBAnRB0CtqKAIAIQIgAC0AOkEBdCIPQQJ0QdAraigCACELIAAtAANBAXQiBkECdEHQK2ooAgAhByAALQAVQQF0IgVBAnRB0CtqKAIAIQwgAC0AHkEBdCIEQQJ0QdAraigCACEIIAAtACdBAXQiCUECdEHQK2ooAgAhDiADQQFyQQJ0QdAraigCACIDQQh0IAJBGHZyIBEtAABBAXQiEUEBckECdEHQK2ooAgBzIA9BAXJBAnRB0CtqKAIAIg9BEHQgC0EQdnJzIAZBAXJBAnRB0CtqKAIAIgZBGHQgB0EIdnJzIAAtAAxBAXQiCkECdEHQK2ooAgBzIAVBAXJBAnRB0CtqKAIAIgVBGHYgDEEIdHJzIARBAXJBAnRB0CtqKAIAIgRBEHYgCEEQdHJzIAlBAXJBAnRB0CtqKAIAIglBCHYgDkEYdHJzIQ0gASADQRh2IAJBCHRyIBFBAnRB0CtqKAIAcyAPQRB2IAtBEHRycyAGQQh2IAdBGHRycyAKQQFyQQJ0QdAraigCAHMgBUEIdCAMQRh2cnMgBEEQdCAIQRB2cnMgCUEYdCAOQQh2cnM2AiggASANNgIsIAAtADlBAXQiA0ECdEHQK2ooAgAhAiAALQACQQF0Ig9BAnRB0CtqKAIAIQsgAC0AC0EBdCIRQQJ0QdAraigCACEHIAAtAB1BAXQiBkECdEHQK2ooAgAhDCAALQAmQQF0IgVBAnRB0CtqKAIAIQggAC0AL0EBdCIEQQJ0QdAraigCACEOIANBAXJBAnRB0CtqKAIAIgNBCHQgAkEYdnIgEy0AAEEBdCITQQFyQQJ0QdAraigCAHMgD0EBckECdEHQK2ooAgAiD0EQdCALQRB2cnMgEUEBckECdEHQK2ooAgAiEUEYdCAHQQh2cnMgAC0AFEEBdCIJQQJ0QdAraigCAHMgBkEBckECdEHQK2ooAgAiBkEYdiAMQQh0cnMgBUEBckECdEHQK2ooAgAiBUEQdiAIQRB0cnMgBEEBckECdEHQK2ooAgAiBEEIdiAOQRh0cnMhCiABIANBGHYgAkEIdHIgE0ECdEHQK2ooAgBzIA9BEHYgC0EQdHJzIBFBCHYgB0EYdHJzIAlBAXJBAnRB0CtqKAIAcyAGQQh0IAxBGHZycyAFQRB0IAhBEHZycyAEQRh0IA5BCHZyczYCMCABIAo2AjQgAC0AAUEBdCIDQQJ0QdAraigCACECIAAtAApBAXQiD0ECdEHQK2ooAgAhCyAALQATQQF0IhFBAnRB0CtqKAIAIQcgAC0AJUEBdCITQQJ0QdAraigCACEMIAAtAC5BAXQiBkECdEHQK2ooAgAhCCAALQA3QQF0IgVBAnRB0CtqKAIAIQ4gA0EBckECdEHQK2ooAgAiA0EIdCACQRh2ciAVLQAAQQF0IhVBAXJBAnRB0CtqKAIAcyAPQQFyQQJ0QdAraigCACIPQRB0IAtBEHZycyARQQFyQQJ0QdAraigCACIRQRh0IAdBCHZycyAALQAcQQF0IgBBAnRB0CtqKAIAcyATQQFyQQJ0QdAraigCACITQRh2IAxBCHRycyAGQQFyQQJ0QdAraigCACIGQRB2IAhBEHRycyAFQQFyQQJ0QdAraigCACIFQQh2IA5BGHRycyEEIAEgA0EYdiACQQh0ciAVQQJ0QdAraigCAHMgD0EQdiALQRB0cnMgEUEIdiAHQRh0cnMgAEEBckECdEHQK2ooAgBzIBNBCHQgDEEYdnJzIAZBEHQgCEEQdnJzIAVBGHQgDkEIdnJzNgI4IAEgBDYCPAsWACAAKAIAQSBxRQRAIAEgAiAAEEcLC3cBAX8jBiEFIwZBgAJqJAYgAiADSiAEQYDABHFFcQRAIAUgASACIANrIgJBgAJJBH8gAgVBgAILEA4aIAJB/wFLBEAgAiEBA0AgACAFQYACEAsgAUGAfmoiAUH/AUsNAAsgAkH/AXEhAgsgACAFIAIQCwsgBSQGC9cCAQd/IAAtAAMhAiAALQACIQMgAC0AByEEIAAtAAEhBSAALQAGIQYgAC0ACyEHIAAgAC0ABUECdEGAEGooAgAgAC0AAEECdEGACGooAgBzIAAtAApBAnRBgBhqKAIAcyAALQAPQQJ0QYAgaigCAHMgASgCAHM2AgAgAEEEaiIIIAgtAABBAnRBgAhqKAIAIAJB/wFxQQJ0QYAgaigCAHMgAC0ACUECdEGAEGooAgBzIAAtAA5BAnRBgBhqKAIAcyABKAIEczYCACAAQQhqIgIgBEECdEGAIGooAgAgA0ECdEGAGGooAgBzIAItAABBAnRBgAhqKAIAcyAALQANQQJ0QYAQaigCAHMgASgCCHM2AgAgAEEMaiIAIAZBAnRBgBhqKAIAIAVBAnRBgBBqKAIAcyAHQQJ0QYAgaigCAHMgAC0AAEECdEGACGooAgBzIAEoAgxzNgIAC5oCAQR/IAAgAmohBCABQf8BcSEBIAJBwwBOBEADQCAAQQNxBEAgACABOgAAIABBAWohAAwBCwsgBEF8cSIFQcAAayEGIAEgAUEIdHIgAUEQdHIgAUEYdHIhAwNAIAAgBkwEQCAAIAM2AgAgACADNgIEIAAgAzYCCCAAIAM2AgwgACADNgIQIAAgAzYCFCAAIAM2AhggACADNgIcIAAgAzYCICAAIAM2AiQgACADNgIoIAAgAzYCLCAAIAM2AjAgACADNgI0IAAgAzYCOCAAIAM2AjwgAEHAAGohAAwBCwsDQCAAIAVIBEAgACADNgIAIABBBGohAAwBCwsLA0AgACAESARAIAAgAToAACAAQQFqIQAMAQsLIAQgAmsL8g0BCH8gAEUEQA8LQZjmACgCACECIABBeGoiBCAAQXxqKAIAIgBBeHEiAWohBgJ/IABBAXEEfyAEIgAFIAQoAgAhAyAAQQNxRQRADwsgBEEAIANraiIAIAJJBEAPCyADIAFqIQEgAEGc5gAoAgBGBEAgACAGQQRqIgIoAgAiBEEDcUEDRw0CGkGQ5gAgATYCACACIARBfnE2AgAgACABQQFyNgIEIAAgAWogATYCAA8LIANBA3YhBCADQYACSQRAIAAoAgwiAyAAKAIIIgJGBEBBiOYAQYjmACgCAEEBIAR0QX9zcTYCACAADAMFIAIgAzYCDCADIAI2AgggAAwDCwALIAAoAhghBwJAIAAoAgwiBCAARgRAIABBEGoiA0EEaiICKAIAIgRFBEAgAygCACIEBEAgAyECBUEAIQQMAwsLA0AgBEEUaiIFKAIAIgMEQCADIQQgBSECDAELIARBEGoiBSgCACIDBEAgAyEEIAUhAgwBCwsgAkEANgIABSAAKAIIIgIgBDYCDCAEIAI2AggLCyAHBH8gACAAKAIcIgNBAnRBuOgAaiICKAIARgRAIAIgBDYCACAERQRAQYzmAEGM5gAoAgBBASADdEF/c3E2AgAgAAwECwUgB0EQaiAHKAIQIABHQQJ0aiAENgIAIAAgBEUNAxoLIAQgBzYCGCAAQRBqIgIoAgAiAwRAIAQgAzYCECADIAQ2AhgLIAIoAgQiAgR/IAQgAjYCFCACIAQ2AhggAAUgAAsFIAALCwsiBCAGTwRADwsgBkEEaiICKAIAIgNBAXFFBEAPCyADQQJxBEAgAiADQX5xNgIAIAAgAUEBcjYCBCAEIAFqIAE2AgAgASEEBUGc5gAoAgAhAiAGQaDmACgCAEYEQEGU5gBBlOYAKAIAIAFqIgE2AgBBoOYAIAA2AgAgACABQQFyNgIEIAAgAkcEQA8LQZzmAEEANgIAQZDmAEEANgIADwsgBiACRgRAQZDmAEGQ5gAoAgAgAWoiATYCAEGc5gAgBDYCACAAIAFBAXI2AgQgBCABaiABNgIADwsgA0F4cSABaiEHIANBA3YhAQJAIANBgAJJBEAgBigCDCIDIAYoAggiAkYEQEGI5gBBiOYAKAIAQQEgAXRBf3NxNgIABSACIAM2AgwgAyACNgIICwUgBigCGCEIAkAgBigCDCIBIAZGBEAgBkEQaiIDQQRqIgIoAgAiAUUEQCADKAIAIgEEQCADIQIFQQAhAQwDCwsDQCABQRRqIgUoAgAiAwRAIAMhASAFIQIMAQsgAUEQaiIFKAIAIgMEQCADIQEgBSECDAELCyACQQA2AgAFIAYoAggiAiABNgIMIAEgAjYCCAsLIAgEQCAGIAYoAhwiA0ECdEG46ABqIgIoAgBGBEAgAiABNgIAIAFFBEBBjOYAQYzmACgCAEEBIAN0QX9zcTYCAAwECwUgCEEQaiAIKAIQIAZHQQJ0aiABNgIAIAFFDQMLIAEgCDYCGCAGQRBqIgIoAgAiAwRAIAEgAzYCECADIAE2AhgLIAIoAgQiAgRAIAEgAjYCFCACIAE2AhgLCwsLIAAgB0EBcjYCBCAEIAdqIAc2AgAgAEGc5gAoAgBGBEBBkOYAIAc2AgAPBSAHIQQLCyAEQQN2IQEgBEGAAkkEQCABQQN0QbDmAGohAkGI5gAoAgAiBEEBIAF0IgFxBH8gAkEIaiIBKAIABUGI5gAgBCABcjYCACACQQhqIQEgAgshBCABIAA2AgAgBCAANgIMIAAgBDYCCCAAIAI2AgwPCyAEQQh2IgEEfyAEQf///wdLBH9BHwUgBEEOIAEgAUGA/j9qQRB2QQhxIgN0IgJBgOAfakEQdkEEcSIBIANyIAIgAXQiAkGAgA9qQRB2QQJxIgFyayACIAF0QQ92aiIBQQdqdkEBcSABQQF0cgsFQQALIgVBAnRBuOgAaiEDIAAgBTYCHCAAQQA2AhQgAEEANgIQAkBBjOYAKAIAIgJBASAFdCIBcQRAIAMoAgAhAUEZIAVBAXZrIQIgBCAFQR9GBH9BAAUgAgt0IQUCQANAIAEoAgRBeHEgBEYNASAFQQF0IQMgAUEQaiAFQR92QQJ0aiIFKAIAIgIEQCADIQUgAiEBDAELCyAFIAA2AgAgACABNgIYIAAgADYCDCAAIAA2AggMAgsgAUEIaiICKAIAIgQgADYCDCACIAA2AgAgACAENgIIIAAgATYCDCAAQQA2AhgFQYzmACACIAFyNgIAIAMgADYCACAAIAM2AhggACAANgIMIAAgADYCCAsLQajmAEGo5gAoAgBBf2oiADYCACAABEAPBUHQ6QAhAAsDQCAAKAIAIgFBCGohACABDQALQajmAEF/NgIAC8YDAQN/IAJBgMAATgRAIAAgASACEAYPCyAAIQQgACACaiEDIABBA3EgAUEDcUYEQANAIABBA3EEQCACRQRAIAQPCyAAIAEsAAA6AAAgAEEBaiEAIAFBAWohASACQQFrIQIMAQsLIANBfHEiAkHAAGshBQNAIAAgBUwEQCAAIAEoAgA2AgAgACABKAIENgIEIAAgASgCCDYCCCAAIAEoAgw2AgwgACABKAIQNgIQIAAgASgCFDYCFCAAIAEoAhg2AhggACABKAIcNgIcIAAgASgCIDYCICAAIAEoAiQ2AiQgACABKAIoNgIoIAAgASgCLDYCLCAAIAEoAjA2AjAgACABKAI0NgI0IAAgASgCODYCOCAAIAEoAjw2AjwgAEHAAGohACABQcAAaiEBDAELCwNAIAAgAkgEQCAAIAEoAgA2AgAgAEEEaiEAIAFBBGohAQwBCwsFIANBBGshAgNAIAAgAkgEQCAAIAEsAAA6AAAgACABLAABOgABIAAgASwAAjoAAiAAIAEsAAM6AAMgAEEEaiEAIAFBBGohAQwBCwsLA0AgACADSARAIAAgASwAADoAACAAQQFqIQAgAUEBaiEBDAELCyAEC0ABA38gACABNgJoIAAgACgCCCIDIAAoAgQiAmsiBDYCbCACIAFqIQIgACABQQBHIAQgAUpxBH8gAgUgAws2AmQLwTIBDH8jBiEBIwZBEGokBiABIQoCQCAAQfUBSQRAIABBC2pBeHEhA0GI5gAoAgAiBiAAQQtJBH9BECIDBSADC0EDdiIAdiIBQQNxBEAgAUEBcUEBcyAAaiIBQQN0QbDmAGoiA0EIaiIFKAIAIgJBCGoiBCgCACEAIAMgAEYEQEGI5gAgBkEBIAF0QX9zcTYCAAUgACADNgIMIAUgADYCAAsgAiABQQN0IgBBA3I2AgQgAiAAakEEaiIAIAAoAgBBAXI2AgAgCiQGIAQPCyADQZDmACgCACIISwRAIAEEQCABIAB0QQIgAHQiAEEAIABrcnEiAEEAIABrcUF/aiIBQQx2QRBxIQAgASAAdiIBQQV2QQhxIgIgAHIgASACdiIAQQJ2QQRxIgFyIAAgAXYiAEEBdkECcSIBciAAIAF2IgBBAXZBAXEiAXIgACABdmoiAUEDdEGw5gBqIgJBCGoiBCgCACIFQQhqIgcoAgAhACACIABGBEBBiOYAIAZBASABdEF/c3EiADYCAAUgACACNgIMIAQgADYCACAGIQALIAUgA0EDcjYCBCAFIANqIgQgAUEDdCADayIFQQFyNgIEIAQgBWogBTYCACAIBEBBnOYAKAIAIQIgCEEDdiIDQQN0QbDmAGohASAAQQEgA3QiA3EEfyABQQhqIgMoAgAFQYjmACAAIANyNgIAIAFBCGohAyABCyEAIAMgAjYCACAAIAI2AgwgAiAANgIIIAIgATYCDAtBkOYAIAU2AgBBnOYAIAQ2AgAgCiQGIAcPC0GM5gAoAgAiCwRAIAtBACALa3FBf2oiAUEMdkEQcSEAIAEgAHYiAUEFdkEIcSICIAByIAEgAnYiAEECdkEEcSIBciAAIAF2IgBBAXZBAnEiAXIgACABdiIAQQF2QQFxIgFyIAAgAXZqQQJ0QbjoAGooAgAiAigCBEF4cSADayEBIAJBEGogAigCEEVBAnRqKAIAIgAEQANAIAAoAgRBeHEgA2siBSABSSIEBEAgBSEBCyAEBEAgACECCyAAQRBqIAAoAhBFQQJ0aigCACIADQAgASEFCwUgASEFCyACIAIgA2oiDEkEQCACKAIYIQkCQCACKAIMIgAgAkYEQCACQRRqIgEoAgAiAEUEQCACQRBqIgEoAgAiAEUEQEEAIQAMAwsLA0AgAEEUaiIEKAIAIgcEQCAHIQAgBCEBDAELIABBEGoiBCgCACIHBEAgByEAIAQhAQwBCwsgAUEANgIABSACKAIIIgEgADYCDCAAIAE2AggLCwJAIAkEQCACIAIoAhwiAUECdEG46ABqIgQoAgBGBEAgBCAANgIAIABFBEBBjOYAIAtBASABdEF/c3E2AgAMAwsFIAlBEGogCSgCECACR0ECdGogADYCACAARQ0CCyAAIAk2AhggAigCECIBBEAgACABNgIQIAEgADYCGAsgAigCFCIBBEAgACABNgIUIAEgADYCGAsLCyAFQRBJBEAgAiAFIANqIgBBA3I2AgQgAiAAakEEaiIAIAAoAgBBAXI2AgAFIAIgA0EDcjYCBCAMIAVBAXI2AgQgDCAFaiAFNgIAIAgEQEGc5gAoAgAhBCAIQQN2IgFBA3RBsOYAaiEAIAZBASABdCIBcQR/IABBCGoiAygCAAVBiOYAIAYgAXI2AgAgAEEIaiEDIAALIQEgAyAENgIAIAEgBDYCDCAEIAE2AgggBCAANgIMC0GQ5gAgBTYCAEGc5gAgDDYCAAsgCiQGIAJBCGoPBSADIQALBSADIQALBSADIQALBSAAQb9/SwRAQX8hAAUgAEELaiIAQXhxIQJBjOYAKAIAIgUEQCAAQQh2IgAEfyACQf///wdLBH9BHwUgAkEOIAAgAEGA/j9qQRB2QQhxIgB0IgFBgOAfakEQdkEEcSIDIAByIAEgA3QiAEGAgA9qQRB2QQJxIgFyayAAIAF0QQ92aiIAQQdqdkEBcSAAQQF0cgsFQQALIQhBACACayEDAkACQCAIQQJ0QbjoAGooAgAiAARAQRkgCEEBdmshBEEAIQEgAiAIQR9GBH9BAAUgBAt0IQdBACEEA0AgACgCBEF4cSACayIGIANJBEAgBgRAIAAhASAGIQMFQQAhAyAAIgEhAAwECwsgACgCFCIGRSAGIABBEGogB0EfdkECdGooAgAiAEZyRQRAIAYhBAsgByAARSIGQQFzdCEHIAZFDQALBUEAIQRBACEBCyAEIAFyBH8gBAUgBUECIAh0IgBBACAAa3JxIgBFBEAgAiEADAcLIABBACAAa3FBf2oiBEEMdkEQcSEAQQAhASAEIAB2IgRBBXZBCHEiByAAciAEIAd2IgBBAnZBBHEiBHIgACAEdiIAQQF2QQJxIgRyIAAgBHYiAEEBdkEBcSIEciAAIAR2akECdEG46ABqKAIACyIADQAgASEEDAELA0AgACgCBEF4cSACayIEIANJIgcEQCAEIQMLIAcEQCAAIQELIABBEGogACgCEEVBAnRqKAIAIgANACABIQQLCyAEBEAgA0GQ5gAoAgAgAmtJBEAgBCAEIAJqIghPBEAgCiQGQQAPCyAEKAIYIQkCQCAEKAIMIgAgBEYEQCAEQRRqIgEoAgAiAEUEQCAEQRBqIgEoAgAiAEUEQEEAIQAMAwsLA0AgAEEUaiIHKAIAIgYEQCAGIQAgByEBDAELIABBEGoiBygCACIGBEAgBiEAIAchAQwBCwsgAUEANgIABSAEKAIIIgEgADYCDCAAIAE2AggLCwJAIAkEfyAEIAQoAhwiAUECdEG46ABqIgcoAgBGBEAgByAANgIAIABFBEBBjOYAIAVBASABdEF/c3EiADYCAAwDCwUgCUEQaiAJKAIQIARHQQJ0aiAANgIAIABFBEAgBSEADAMLCyAAIAk2AhggBCgCECIBBEAgACABNgIQIAEgADYCGAsgBCgCFCIBBH8gACABNgIUIAEgADYCGCAFBSAFCwUgBQshAAsCQCADQRBJBEAgBCADIAJqIgBBA3I2AgQgBCAAakEEaiIAIAAoAgBBAXI2AgAFIAQgAkEDcjYCBCAIIANBAXI2AgQgCCADaiADNgIAIANBA3YhASADQYACSQRAIAFBA3RBsOYAaiEAQYjmACgCACIDQQEgAXQiAXEEfyAAQQhqIgMoAgAFQYjmACADIAFyNgIAIABBCGohAyAACyEBIAMgCDYCACABIAg2AgwgCCABNgIIIAggADYCDAwCCyADQQh2IgEEfyADQf///wdLBH9BHwUgA0EOIAEgAUGA/j9qQRB2QQhxIgF0IgJBgOAfakEQdkEEcSIFIAFyIAIgBXQiAUGAgA9qQRB2QQJxIgJyayABIAJ0QQ92aiIBQQdqdkEBcSABQQF0cgsFQQALIgFBAnRBuOgAaiECIAggATYCHCAIQRBqIgVBADYCBCAFQQA2AgAgAEEBIAF0IgVxRQRAQYzmACAAIAVyNgIAIAIgCDYCACAIIAI2AhggCCAINgIMIAggCDYCCAwCCyACKAIAIQBBGSABQQF2ayECIAMgAUEfRgR/QQAFIAILdCEBAkADQCAAKAIEQXhxIANGDQEgAUEBdCECIABBEGogAUEfdkECdGoiASgCACIFBEAgAiEBIAUhAAwBCwsgASAINgIAIAggADYCGCAIIAg2AgwgCCAINgIIDAILIABBCGoiASgCACIDIAg2AgwgASAINgIAIAggAzYCCCAIIAA2AgwgCEEANgIYCwsgCiQGIARBCGoPBSACIQALBSACIQALBSACIQALCwsLQZDmACgCACICIABPBEBBnOYAKAIAIQEgAiAAayIDQQ9LBEBBnOYAIAEgAGoiAjYCAEGQ5gAgAzYCACACIANBAXI2AgQgAiADaiADNgIAIAEgAEEDcjYCBAVBkOYAQQA2AgBBnOYAQQA2AgAgASACQQNyNgIEIAEgAmpBBGoiACAAKAIAQQFyNgIACyAKJAYgAUEIag8LQZTmACgCACIDIABLBEBBlOYAIAMgAGsiAzYCAEGg5gBBoOYAKAIAIgEgAGoiAjYCACACIANBAXI2AgQgASAAQQNyNgIEIAokBiABQQhqDwtB4OkAKAIABH9B6OkAKAIABUHo6QBBgCA2AgBB5OkAQYAgNgIAQezpAEF/NgIAQfDpAEF/NgIAQfTpAEEANgIAQcTpAEEANgIAIAogCkFwcUHYqtWqBXMiATYCAEHg6QAgATYCAEGAIAsiASAAQS9qIgRqIgdBACABayIGcSIFIABNBEAgCiQGQQAPC0HA6QAoAgAiAQRAQbjpACgCACICIAVqIgggAk0gCCABS3IEQCAKJAZBAA8LCyAAQTBqIQgCQAJAQcTpACgCAEEEcQRAQQAhAwUCQAJAAkBBoOYAKAIAIgFFDQBByOkAIQIDQAJAIAIoAgAiCSABTQRAIAkgAkEEaiIJKAIAaiABSw0BCyACKAIIIgINAQwCCwsgByADayAGcSIDQf////8HSQRAIAMQFCIBIAIoAgAgCSgCAGpGBEAgAUF/Rw0GBQwDCwVBACEDCwwCC0EAEBQiAUF/RgRAQQAhAwVB5OkAKAIAIgNBf2oiAiABakEAIANrcSABayEDIAIgAXEEfyADBUEACyAFaiIDQbjpACgCACIHaiECIAMgAEsgA0H/////B0lxBEBBwOkAKAIAIgYEQCACIAdNIAIgBktyBEBBACEDDAULCyADEBQiAiABRg0FIAIhAQwCBUEAIQMLCwwBCyAIIANLIANB/////wdJIAFBf0dxcUUEQCABQX9GBEBBACEDDAIFDAQLAAsgBCADa0Ho6QAoAgAiAmpBACACa3EiAkH/////B08NAkEAIANrIQQgAhAUQX9GBEAgBBAUGkEAIQMFIAIgA2ohAwwDCwtBxOkAQcTpACgCAEEEcjYCAAsgBUH/////B0kEQCAFEBQiAUEAEBQiAkkgAUF/RyACQX9HcXEhBSACIAFrIgIgAEEoaksiBARAIAIhAwsgAUF/RiAEQQFzciAFQQFzckUNAQsMAQtBuOkAQbjpACgCACADaiICNgIAIAJBvOkAKAIASwRAQbzpACACNgIACwJAQaDmACgCACIEBEBByOkAIQICQAJAA0AgASACKAIAIgUgAkEEaiIHKAIAIgZqRg0BIAIoAggiAg0ACwwBCyACKAIMQQhxRQRAIAQgAUkgBCAFT3EEQCAHIAYgA2o2AgBBlOYAKAIAIQVBACAEQQhqIgJrQQdxIQFBoOYAIAQgAkEHcQR/IAEFQQAiAQtqIgI2AgBBlOYAIAUgAyABa2oiATYCACACIAFBAXI2AgQgAiABakEoNgIEQaTmAEHw6QAoAgA2AgAMBAsLCyABQZjmACgCAEkEQEGY5gAgATYCAAsgASADaiEFQcjpACECAkACQANAIAIoAgAgBUYNASACKAIIIgINAAsMAQsgAigCDEEIcUUEQCACIAE2AgAgAkEEaiICIAIoAgAgA2o2AgBBACABQQhqIgNrQQdxIQJBACAFQQhqIgdrQQdxIQkgASADQQdxBH8gAgVBAAtqIgggAGohBiAFIAdBB3EEfyAJBUEAC2oiBSAIayAAayEHIAggAEEDcjYCBAJAIAUgBEYEQEGU5gBBlOYAKAIAIAdqIgA2AgBBoOYAIAY2AgAgBiAAQQFyNgIEBSAFQZzmACgCAEYEQEGQ5gBBkOYAKAIAIAdqIgA2AgBBnOYAIAY2AgAgBiAAQQFyNgIEIAYgAGogADYCAAwCCyAFKAIEIgBBA3FBAUYEfyAAQXhxIQkgAEEDdiEDAkAgAEGAAkkEQCAFKAIMIgAgBSgCCCIBRgRAQYjmAEGI5gAoAgBBASADdEF/c3E2AgAFIAEgADYCDCAAIAE2AggLBSAFKAIYIQQCQCAFKAIMIgAgBUYEQCAFQRBqIgFBBGoiAygCACIABEAgAyEBBSABKAIAIgBFBEBBACEADAMLCwNAIABBFGoiAygCACICBEAgAiEAIAMhAQwBCyAAQRBqIgMoAgAiAgRAIAIhACADIQEMAQsLIAFBADYCAAUgBSgCCCIBIAA2AgwgACABNgIICwsgBEUNAQJAIAUgBSgCHCIBQQJ0QbjoAGoiAygCAEYEQCADIAA2AgAgAA0BQYzmAEGM5gAoAgBBASABdEF/c3E2AgAMAwUgBEEQaiAEKAIQIAVHQQJ0aiAANgIAIABFDQMLCyAAIAQ2AhggBUEQaiIDKAIAIgEEQCAAIAE2AhAgASAANgIYCyADKAIEIgFFDQEgACABNgIUIAEgADYCGAsLIAUgCWohACAJIAdqBSAFIQAgBwshBSAAQQRqIgAgACgCAEF+cTYCACAGIAVBAXI2AgQgBiAFaiAFNgIAIAVBA3YhASAFQYACSQRAIAFBA3RBsOYAaiEAQYjmACgCACIDQQEgAXQiAXEEfyAAQQhqIgMoAgAFQYjmACADIAFyNgIAIABBCGohAyAACyEBIAMgBjYCACABIAY2AgwgBiABNgIIIAYgADYCDAwCCwJ/IAVBCHYiAAR/QR8gBUH///8HSw0BGiAFQQ4gACAAQYD+P2pBEHZBCHEiAHQiAUGA4B9qQRB2QQRxIgMgAHIgASADdCIAQYCAD2pBEHZBAnEiAXJrIAAgAXRBD3ZqIgBBB2p2QQFxIABBAXRyBUEACwsiAUECdEG46ABqIQAgBiABNgIcIAZBEGoiA0EANgIEIANBADYCAEGM5gAoAgAiA0EBIAF0IgJxRQRAQYzmACADIAJyNgIAIAAgBjYCACAGIAA2AhggBiAGNgIMIAYgBjYCCAwCCyAAKAIAIQBBGSABQQF2ayEDIAUgAUEfRgR/QQAFIAMLdCEBAkADQCAAKAIEQXhxIAVGDQEgAUEBdCEDIABBEGogAUEfdkECdGoiASgCACICBEAgAyEBIAIhAAwBCwsgASAGNgIAIAYgADYCGCAGIAY2AgwgBiAGNgIIDAILIABBCGoiASgCACIDIAY2AgwgASAGNgIAIAYgAzYCCCAGIAA2AgwgBkEANgIYCwsgCiQGIAhBCGoPCwtByOkAIQIDQAJAIAIoAgAiBSAETQRAIAUgAigCBGoiCCAESw0BCyACKAIIIQIMAQsLQQAgCEFRaiICQQhqIgVrQQdxIQcgAiAFQQdxBH8gBwVBAAtqIgIgBEEQaiILSQR/IAQiAgUgAgtBCGohBiACQRhqIQUgA0FYaiEMQQAgAUEIaiIJa0EHcSEHQaDmACABIAlBB3EEfyAHBUEAIgcLaiIJNgIAQZTmACAMIAdrIgc2AgAgCSAHQQFyNgIEIAkgB2pBKDYCBEGk5gBB8OkAKAIANgIAIAJBBGoiB0EbNgIAIAZByOkAKQIANwIAIAZB0OkAKQIANwIIQcjpACABNgIAQczpACADNgIAQdTpAEEANgIAQdDpACAGNgIAIAUhAQNAIAFBBGoiA0EHNgIAIAFBCGogCEkEQCADIQEMAQsLIAIgBEcEQCAHIAcoAgBBfnE2AgAgBCACIARrIgdBAXI2AgQgAiAHNgIAIAdBA3YhAyAHQYACSQRAIANBA3RBsOYAaiEBQYjmACgCACICQQEgA3QiA3EEfyABQQhqIgIoAgAFQYjmACACIANyNgIAIAFBCGohAiABCyEDIAIgBDYCACADIAQ2AgwgBCADNgIIIAQgATYCDAwDCyAHQQh2IgEEfyAHQf///wdLBH9BHwUgB0EOIAEgAUGA/j9qQRB2QQhxIgF0IgNBgOAfakEQdkEEcSICIAFyIAMgAnQiAUGAgA9qQRB2QQJxIgNyayABIAN0QQ92aiIBQQdqdkEBcSABQQF0cgsFQQALIgNBAnRBuOgAaiEBIAQgAzYCHCAEQQA2AhQgC0EANgIAQYzmACgCACICQQEgA3QiBXFFBEBBjOYAIAIgBXI2AgAgASAENgIAIAQgATYCGCAEIAQ2AgwgBCAENgIIDAMLIAEoAgAhAUEZIANBAXZrIQIgByADQR9GBH9BAAUgAgt0IQMCQANAIAEoAgRBeHEgB0YNASADQQF0IQIgAUEQaiADQR92QQJ0aiIDKAIAIgUEQCACIQMgBSEBDAELCyADIAQ2AgAgBCABNgIYIAQgBDYCDCAEIAQ2AggMAwsgAUEIaiIDKAIAIgIgBDYCDCADIAQ2AgAgBCACNgIIIAQgATYCDCAEQQA2AhgLBUGY5gAoAgAiAkUgASACSXIEQEGY5gAgATYCAAtByOkAIAE2AgBBzOkAIAM2AgBB1OkAQQA2AgBBrOYAQeDpACgCADYCAEGo5gBBfzYCAEEAIQIDQCACQQN0QbDmAGoiBSAFNgIMIAUgBTYCCCACQQFqIgJBIEcNAAsgA0FYaiECQQAgAUEIaiIFa0EHcSEDQaDmACABIAVBB3EEfyADBUEAIgMLaiIBNgIAQZTmACACIANrIgM2AgAgASADQQFyNgIEIAEgA2pBKDYCBEGk5gBB8OkAKAIANgIACwtBlOYAKAIAIgEgAEsEQEGU5gAgASAAayIDNgIAQaDmAEGg5gAoAgAiASAAaiICNgIAIAIgA0EBcjYCBCABIABBA3I2AgQgCiQGIAFBCGoPCwtBnD5BDDYCACAKJAZBAAuGHwEbfyAAIAAoAgBBf3M2AgAgAEEEaiIFIAUoAgAgAkF/c3M2AgAgAEEIaiIHKAIAQX9zIQYgByAGNgIAIABBDGoiByACQf////9+cyAHKAIAczYCACAAQRBqIgkgCSgCAEF/czYCACAAQRRqIg0gAkH/////fXMgDSgCAHM2AgAgAEEYaiIIKAIAQX9zIQMgCCADNgIAIABBHGoiCiACQf////98cyAKKAIAczYCACAAQSBqIgsgCygCAEF/czYCACAAQSRqIg4gAkH/////e3MgDigCAHM2AgAgAEEoaiIPKAIAQX9zIQQgDyAENgIAIABBLGoiFSACQf////96cyAVKAIAczYCACAAQTBqIhcgFygCAEF/czYCACAAQTRqIhogAkH/////eXMgGigCAHM2AgAgAEE4aiIbKAIAQX9zIQwgGyAMNgIAIABBPGoiHCACQf////94cyAcKAIAczYCACADQQd2Qf4DcSISQQJ0QdAraigCACECIARBD3ZB/gNxIhNBAnRB0CtqKAIAIQMgDEEYdkEBdCIUQQJ0QdAraigCACEEIAAtABVBAXQiFkECdEHQK2ooAgAhDCAALQAmQQF0IhhBAnRB0CtqKAIAIRAgAC0AN0EBdCIZQQJ0QdAraigCACERIBJBAXJBAnRB0CtqKAIAIhJBCHQgAkEYdnIgBkEBdEH+A3EiBkEBckECdEHQK2ooAgBzIBNBAXJBAnRB0CtqKAIAIhNBEHQgA0EQdnJzIBRBAXJBAnRB0CtqKAIAIhRBGHQgBEEIdnJzIAUtAABBAXQiBUECdEHQK2ooAgBzIBZBAXJBAnRB0CtqKAIAIhZBGHYgDEEIdHJzIBhBAXJBAnRB0CtqKAIAIhhBEHYgEEEQdHJzIBlBAXJBAnRB0CtqKAIAIhlBCHYgEUEYdHJzIR0gASASQRh2IAJBCHRyIAZBAnRB0CtqKAIAcyATQRB2IANBEHRycyAUQQh2IARBGHRycyAFQQFyQQJ0QdAraigCAHMgFkEIdCAMQRh2cnMgGEEQdCAQQRB2cnMgGUEYdCARQQh2cnM2AgAgASAdNgIEIAAtACFBAXQiEEECdEHQK2ooAgAhAiAALQAyQQF0IhFBAnRB0CtqKAIAIQUgAC0AA0EBdCISQQJ0QdAraigCACEGIAAtAB1BAXQiE0ECdEHQK2ooAgAhAyAALQAuQQF0IhRBAnRB0CtqKAIAIQQgAC0AP0EBdCIWQQJ0QdAraigCACEMIBBBAXJBAnRB0CtqKAIAIhBBCHQgAkEYdnIgCS0AAEEBdCIJQQFyQQJ0QdAraigCAHMgEUEBckECdEHQK2ooAgAiEUEQdCAFQRB2cnMgEkEBckECdEHQK2ooAgAiEkEYdCAGQQh2cnMgBy0AAEEBdCIHQQJ0QdAraigCAHMgE0EBckECdEHQK2ooAgAiE0EYdiADQQh0cnMgFEEBckECdEHQK2ooAgAiFEEQdiAEQRB0cnMgFkEBckECdEHQK2ooAgAiFkEIdiAMQRh0cnMhGCABIBBBGHYgAkEIdHIgCUECdEHQK2ooAgBzIBFBEHYgBUEQdHJzIBJBCHYgBkEYdHJzIAdBAXJBAnRB0CtqKAIAcyATQQh0IANBGHZycyAUQRB0IARBEHZycyAWQRh0IAxBCHZyczYCCCABIBg2AgwgAC0AKUEBdCIEQQJ0QdAraigCACECIAAtADpBAXQiDEECdEHQK2ooAgAhBSAALQALQQF0IhBBAnRB0CtqKAIAIQYgAC0AJUEBdCIRQQJ0QdAraigCACEHIAAtADZBAXQiEkECdEHQK2ooAgAhCSAALQAHQQF0IhNBAnRB0CtqKAIAIQMgBEEBckECdEHQK2ooAgAiBEEIdCACQRh2ciAILQAAQQF0IghBAXJBAnRB0CtqKAIAcyAMQQFyQQJ0QdAraigCACIMQRB0IAVBEHZycyAQQQFyQQJ0QdAraigCACIQQRh0IAZBCHZycyANLQAAQQF0Ig1BAnRB0CtqKAIAcyARQQFyQQJ0QdAraigCACIRQRh2IAdBCHRycyASQQFyQQJ0QdAraigCACISQRB2IAlBEHRycyATQQFyQQJ0QdAraigCACITQQh2IANBGHRycyEUIAEgBEEYdiACQQh0ciAIQQJ0QdAraigCAHMgDEEQdiAFQRB0cnMgEEEIdiAGQRh0cnMgDUEBckECdEHQK2ooAgBzIBFBCHQgB0EYdnJzIBJBEHQgCUEQdnJzIBNBGHQgA0EIdnJzNgIQIAEgFDYCFCAALQAxQQF0IghBAnRB0CtqKAIAIQIgAC0AAkEBdCIDQQJ0QdAraigCACEFIAAtABNBAXQiBEECdEHQK2ooAgAhBiAALQAtQQF0IgxBAnRB0CtqKAIAIQcgAC0APkEBdCIQQQJ0QdAraigCACEJIAAtAA9BAXQiEUECdEHQK2ooAgAhDSAIQQFyQQJ0QdAraigCACIIQQh0IAJBGHZyIAstAABBAXQiC0EBckECdEHQK2ooAgBzIANBAXJBAnRB0CtqKAIAIgNBEHQgBUEQdnJzIARBAXJBAnRB0CtqKAIAIgRBGHQgBkEIdnJzIAotAABBAXQiCkECdEHQK2ooAgBzIAxBAXJBAnRB0CtqKAIAIgxBGHYgB0EIdHJzIBBBAXJBAnRB0CtqKAIAIhBBEHYgCUEQdHJzIBFBAXJBAnRB0CtqKAIAIhFBCHYgDUEYdHJzIRIgASAIQRh2IAJBCHRyIAtBAnRB0CtqKAIAcyADQRB2IAVBEHRycyAEQQh2IAZBGHRycyAKQQFyQQJ0QdAraigCAHMgDEEIdCAHQRh2cnMgEEEQdCAJQRB2cnMgEUEYdCANQQh2cnM2AhggASASNgIcIAAtADlBAXQiCEECdEHQK2ooAgAhAiAALQAKQQF0IgNBAnRB0CtqKAIAIQUgAC0AG0EBdCIKQQJ0QdAraigCACEGIAAtADVBAXQiC0ECdEHQK2ooAgAhByAALQAGQQF0IgRBAnRB0CtqKAIAIQkgAC0AF0EBdCIMQQJ0QdAraigCACENIAhBAXJBAnRB0CtqKAIAIghBCHQgAkEYdnIgDy0AAEEBdCIPQQFyQQJ0QdAraigCAHMgA0EBckECdEHQK2ooAgAiA0EQdCAFQRB2cnMgCkEBckECdEHQK2ooAgAiCkEYdCAGQQh2cnMgDi0AAEEBdCIOQQJ0QdAraigCAHMgC0EBckECdEHQK2ooAgAiC0EYdiAHQQh0cnMgBEEBckECdEHQK2ooAgAiBEEQdiAJQRB0cnMgDEEBckECdEHQK2ooAgAiDEEIdiANQRh0cnMhECABIAhBGHYgAkEIdHIgD0ECdEHQK2ooAgBzIANBEHYgBUEQdHJzIApBCHYgBkEYdHJzIA5BAXJBAnRB0CtqKAIAcyALQQh0IAdBGHZycyAEQRB0IAlBEHZycyAMQRh0IA1BCHZyczYCICABIBA2AiQgAC0AAUEBdCIIQQJ0QdAraigCACECIAAtABJBAXQiA0ECdEHQK2ooAgAhBSAALQAjQQF0IgpBAnRB0CtqKAIAIQYgAC0APUEBdCILQQJ0QdAraigCACEHIAAtAA5BAXQiDkECdEHQK2ooAgAhCSAALQAfQQF0Ig9BAnRB0CtqKAIAIQ0gCEEBckECdEHQK2ooAgAiCEEIdCACQRh2ciAXLQAAQQF0IgRBAXJBAnRB0CtqKAIAcyADQQFyQQJ0QdAraigCACIDQRB0IAVBEHZycyAKQQFyQQJ0QdAraigCACIKQRh0IAZBCHZycyAVLQAAQQF0IhVBAnRB0CtqKAIAcyALQQFyQQJ0QdAraigCACILQRh2IAdBCHRycyAOQQFyQQJ0QdAraigCACIOQRB2IAlBEHRycyAPQQFyQQJ0QdAraigCACIPQQh2IA1BGHRycyEXIAEgCEEYdiACQQh0ciAEQQJ0QdAraigCAHMgA0EQdiAFQRB0cnMgCkEIdiAGQRh0cnMgFUEBckECdEHQK2ooAgBzIAtBCHQgB0EYdnJzIA5BEHQgCUEQdnJzIA9BGHQgDUEIdnJzNgIoIAEgFzYCLCAALQAJQQF0IghBAnRB0CtqKAIAIQIgAC0AGkEBdCIDQQJ0QdAraigCACEFIAAtACtBAXQiCkECdEHQK2ooAgAhBiAALQAFQQF0IgtBAnRB0CtqKAIAIQcgAC0AFkEBdCIOQQJ0QdAraigCACEJIAAtACdBAXQiD0ECdEHQK2ooAgAhDSAIQQFyQQJ0QdAraigCACIIQQh0IAJBGHZyIBstAABBAXQiBEEBckECdEHQK2ooAgBzIANBAXJBAnRB0CtqKAIAIgNBEHQgBUEQdnJzIApBAXJBAnRB0CtqKAIAIgpBGHQgBkEIdnJzIBotAABBAXQiFUECdEHQK2ooAgBzIAtBAXJBAnRB0CtqKAIAIgtBGHYgB0EIdHJzIA5BAXJBAnRB0CtqKAIAIg5BEHYgCUEQdHJzIA9BAXJBAnRB0CtqKAIAIg9BCHYgDUEYdHJzIRcgASAIQRh2IAJBCHRyIARBAnRB0CtqKAIAcyADQRB2IAVBEHRycyAKQQh2IAZBGHRycyAVQQFyQQJ0QdAraigCAHMgC0EIdCAHQRh2cnMgDkEQdCAJQRB2cnMgD0EYdCANQQh2cnM2AjAgASAXNgI0IAAtABFBAXQiCEECdEHQK2ooAgAhAiAALQAiQQF0IgNBAnRB0CtqKAIAIQUgAC0AM0EBdCIKQQJ0QdAraigCACEGIAAtAA1BAXQiC0ECdEHQK2ooAgAhByAALQAeQQF0Ig5BAnRB0CtqKAIAIQkgAC0AL0EBdCIPQQJ0QdAraigCACENIAhBAXJBAnRB0CtqKAIAIghBCHQgAkEYdnIgAC0AAEEBdCIAQQFyQQJ0QdAraigCAHMgA0EBckECdEHQK2ooAgAiA0EQdCAFQRB2cnMgCkEBckECdEHQK2ooAgAiCkEYdCAGQQh2cnMgHC0AAEEBdCIEQQJ0QdAraigCAHMgC0EBckECdEHQK2ooAgAiC0EYdiAHQQh0cnMgDkEBckECdEHQK2ooAgAiDkEQdiAJQRB0cnMgD0EBckECdEHQK2ooAgAiD0EIdiANQRh0cnMhFSABIAhBGHYgAkEIdHIgAEECdEHQK2ooAgBzIANBEHYgBUEQdHJzIApBCHYgBkEYdHJzIARBAXJBAnRB0CtqKAIAcyALQQh0IAdBGHZycyAOQRB0IAlBEHZycyAPQRh0IA1BCHZyczYCOCABIBU2AjwLWwECfyMFKAIAIgIgAEEPakFwcSIAaiEBIABBAEogASACSHEgAUEASHIEQBADGkEMEARBfw8LIwUgATYCACABEAJKBEAQAUUEQCMFIAI2AgBBDBAEQX8PCwsgAgsUAQF/IAAQOCECIAEEfyACBSAACwucAgEFf0HAACAAQThqIgYoAgBBA3UiA2shBCADBEAgAkIDiEI/gyAErVoEQCAAQcAAaiADaiABIAQQEBogAEEwaiIFKAIAQYAEaiEDIAUgAzYCACADRQRAIABBNGoiAyADKAIAQQFqNgIACyAAIABBwABqECwgASAEaiEBQQAhAyACIARBA3SsfSECCwVBACEDCyACQv8DVgRAIABBMGohBCAAQTRqIQUDQCAEIAQoAgBBgARqIgc2AgAgB0UEQCAFIAUoAgBBAWo2AgALIAAgARAsIAFBwABqIQEgAkKAfHwiAkL/A1YNAAsLIAJCAFEEQCAGQQA2AgAPCyAAQcAAaiADaiABIAJCA4inEBAaIAYgA0EDdK0gAnw+AgALgQECAn8BfiAApyECIABC/////w9WBEADQCABQX9qIgEgAEIKgqdB/wFxQTByOgAAIABCCoAhBCAAQv////+fAVYEQCAEIQAMAQsLIASnIQILIAIEQANAIAFBf2oiASACQQpwQTByOgAAIAJBCm4hAyACQQpPBEAgAyECDAELCwsgAQseACMGIQEjBkEQaiQGIAEgAjYCACAAIAEQQyABJAYLBgBBARAAC8cBAgJ/AXwgAUH/B0oEQCABQYF4aiIDQf8HSiECIABEAAAAAAAA4H+iIgREAAAAAAAA4H+iIQAgAUGCcGoiAUH/B04EQEH/ByEBCyACRQRAIAMhAQsgAkUEQCAEIQALBSABQYJ4SARAIAFB/gdqIgNBgnhIIQIgAEQAAAAAAAAQAKIiBEQAAAAAAAAQAKIhACABQfwPaiIBQYJ4TARAQYJ4IQELIAJFBEAgAyEBCyACRQRAIAQhAAsLCyAAIAFB/wdqrUI0hr+iC8gjAhl/FH4gAEEgaiIBIAEpAwAgAEGgAWoiEikDAIU3AwAgAEEoaiIBIAEpAwAgAEGoAWoiEykDAIU3AwAgAEEwaiIMKQMAIABBsAFqIhQpAwCFIRogDCAaNwMAIABBOGoiCiAKKQMAIABBuAFqIhUpAwCFNwMAIABBwABqIgEgASkDACAAQcABaiIWKQMAhTcDACAAQcgAaiIBIAEpAwAgAEHIAWoiFykDAIU3AwAgAEHQAGoiDSkDACAAQdABaiIYKQMAhSEdIA0gHTcDACAAQdgAaiILIAspAwAgAEHYAWoiGSkDAIU3AwAgAEHwAGohDiAAQfgAaiEPIABBkAFqIRAgAEGYAWohEUIAIS0DQCAtp0EFdEH0wQBqIQJCACEhA0AgAEGAAWogIaciAUEDdGoiAykDACIlQn+FIRsgAEHAAGogAUEDdGoiBCkDACIgIABBIGogAUEDdGoiBSkDACACIAFBA3RqKQAAIh4gAEHgAGogAUEDdGoiBikDACIcQn+Fg4UiH4MgHoUhHiAdIBogAiABQQJyQQN0aikAACIiIABB8ABqIAFBA3RqIgcpAwAiGkJ/hYOFIiSDICKFISIgHCAgQn+FgyImIBuFIicgICAfIBwgG4OFIiAgHIOFIh+EICCFIhsgHoMgH4UiKCAkIBogAEGQAWogAUEDdGoiCCkDACIqQn+FIimDhSIkIBqDIB2FIiMgGiAdQn+FgyIrICmFIimEICSFIiyFIR0gGyAihSArICqFICSDIBqFIiSFICYgJYUgIIMgHIUiHCAfgyAnhSIghSEaIAUgHCAehSIeICOFICwgIoOFIhwgG4U3AwAgBCAaICiFNwMAIAYgHSAehSAbICmFICQgI4OFIhuFNwMAIAMgHSAghTcDACAAQTBqIAFBA3RqIB1CAYZCqtWq1arVqtWqf4MgHUIBiELVqtWq1arVqtUAg4Q3AwAgAEHQAGogAUEDdGogHEIBhkKq1arVqtWq1ap/gyAcQgGIQtWq1arVqtWq1QCDhDcDACAHIBpCAYZCqtWq1arVqtWqf4MgGkIBiELVqtWq1arVqtUAg4Q3AwAgCCAbQgGGQqrVqtWq1arVqn+DIBtCAYhC1arVqtWq1arVAIOENwMAICFCAXxCAlQEQEIBISEgCikDACEaIAspAwAhHQwBCwsgLUIBfKdBBXRB9MEAaiECQgAhIQNAIABBgAFqICGnIgFBA3RqIgMpAwAiJkJ/hSEcIABBwABqIAFBA3RqIgQpAwAiGyAAQSBqIAFBA3RqIgUpAwAgAiABQQN0aikAACIaIABB4ABqIAFBA3RqIgYpAwAiHUJ/hYOFIh+DIBqFISAgAEHQAGogAUEDdGoiBykDACIeIABBMGogAUEDdGoiCCkDACACIAFBAnJBA3RqKQAAIiIgAEHwAGogAUEDdGoiCSkDACIaQn+Fg4UiI4MgIoUhIiAdIBtCf4WDIicgHIUiKCAbIB8gHSAcg4UiHyAdg4UiJIQgH4UiGyAggyAkhSIqICMgGiAAQZABaiABQQN0aiIBKQMAIilCf4UiHIOFIiMgGoMgHoUiJSAaIB5Cf4WDIh4gHIUiK4QgI4UiLIUhHCAbICKFIB4gKYUgI4MgGoUiHoUgJyAmhSAfgyAdhSIaICSDICiFIh+FIR0gBSAaICCFIiAgJYUgLCAig4UiGiAbhTcDACAEIB0gKoU3AwAgBiAcICCFIBsgK4UgHiAlg4UiG4U3AwAgAyAcIB+FNwMAIAggHEIChkLMmbPmzJmz5kyDIBxCAohCs+bMmbPmzJkzg4Q3AwAgByAaQgKGQsyZs+bMmbPmTIMgGkICiEKz5syZs+bMmTODhDcDACAJIB1CAoZCzJmz5syZs+ZMgyAdQgKIQrPmzJmz5syZM4OENwMAIAEgG0IChkLMmbPmzJmz5kyDIBtCAohCs+bMmbPmzJkzg4Q3AwAgIUIBfEICVARAQgEhIQwBCwsgLUICfKdBBXRB9MEAaiECQgAhIQNAIABBgAFqICGnIgFBA3RqIgMpAwAiJkJ/hSEcIABBwABqIAFBA3RqIgQpAwAiGyAAQSBqIAFBA3RqIgUpAwAgAiABQQN0aikAACIaIABB4ABqIAFBA3RqIgYpAwAiHUJ/hYOFIh+DIBqFISAgAEHQAGogAUEDdGoiBykDACIeIABBMGogAUEDdGoiCCkDACACIAFBAnJBA3RqKQAAIiIgAEHwAGogAUEDdGoiCSkDACIaQn+Fg4UiI4MgIoUhIiAdIBtCf4WDIicgHIUiKCAbIB8gHSAcg4UiHyAdg4UiJIQgH4UiGyAggyAkhSIqICMgGiAAQZABaiABQQN0aiIBKQMAIilCf4UiHIOFIiMgGoMgHoUiJSAaIB5Cf4WDIh4gHIUiK4QgI4UiLIUhHCAbICKFIB4gKYUgI4MgGoUiHoUgJyAmhSAfgyAdhSIaICSDICiFIh+FIR0gBSAaICCFIiAgJYUgLCAig4UiGiAbhTcDACAEIB0gKoU3AwAgBiAcICCFIBsgK4UgHiAlg4UiG4U3AwAgAyAcIB+FNwMAIAggHEIEhkLw4cOHj568+HCDIBxCBIhCj568+PDhw4cPg4Q3AwAgByAaQgSGQvDhw4ePnrz4cIMgGkIEiEKPnrz48OHDhw+DhDcDACAJIB1CBIZC8OHDh4+evPhwgyAdQgSIQo+evPjw4cOHD4OENwMAIAEgG0IEhkLw4cOHj568+HCDIBtCBIhCj568+PDhw4cPg4Q3AwAgIUIBfEICVARAQgEhIQwBCwsgLUIDfKdBBXRB9MEAaiECQgAhIQNAIABBgAFqICGnIgFBA3RqIgMpAwAiJkJ/hSEcIABBwABqIAFBA3RqIgQpAwAiGyAAQSBqIAFBA3RqIgUpAwAgAiABQQN0aikAACIaIABB4ABqIAFBA3RqIgYpAwAiHUJ/hYOFIh+DIBqFISAgAEHQAGogAUEDdGoiBykDACIeIABBMGogAUEDdGoiCCkDACACIAFBAnJBA3RqKQAAIiIgAEHwAGogAUEDdGoiCSkDACIaQn+Fg4UiI4MgIoUhIiAdIBtCf4WDIicgHIUiKCAbIB8gHSAcg4UiHyAdg4UiJIQgH4UiGyAggyAkhSIqICMgGiAAQZABaiABQQN0aiIBKQMAIilCf4UiHIOFIiMgGoMgHoUiJSAaIB5Cf4WDIh4gHIUiK4QgI4UiLIUhHCAbICKFIB4gKYUgI4MgGoUiHoUgJyAmhSAfgyAdhSIaICSDICiFIh+FIR0gBSAaICCFIiAgJYUgLCAig4UiGiAbhTcDACAEIB0gKoU3AwAgBiAcICCFIBsgK4UgHiAlg4UiG4U3AwAgAyAcIB+FNwMAIAggHEIIhkKA/oP4j+C/gH+DIBxCCIhC/4H8h/CfwP8Ag4Q3AwAgByAaQgiGQoD+g/iP4L+Af4MgGkIIiEL/gfyH8J/A/wCDhDcDACAJIB1CCIZCgP6D+I/gv4B/gyAdQgiIQv+B/Ifwn8D/AIOENwMAIAEgG0IIhkKA/oP4j+C/gH+DIBtCCIhC/4H8h/CfwP8Ag4Q3AwAgIUIBfEICVARAQgEhIQwBCwsgLUIEfKdBBXRB9MEAaiECQgAhIQNAIABBgAFqICGnIgFBA3RqIgMpAwAiJkJ/hSEcIABBwABqIAFBA3RqIgQpAwAiGyAAQSBqIAFBA3RqIgUpAwAgAiABQQN0aikAACIaIABB4ABqIAFBA3RqIgYpAwAiHUJ/hYOFIh+DIBqFISAgAEHQAGogAUEDdGoiBykDACIeIABBMGogAUEDdGoiCCkDACACIAFBAnJBA3RqKQAAIiIgAEHwAGogAUEDdGoiCSkDACIaQn+Fg4UiI4MgIoUhIiAdIBtCf4WDIicgHIUiKCAbIB8gHSAcg4UiHyAdg4UiJIQgH4UiGyAggyAkhSIqICMgGiAAQZABaiABQQN0aiIBKQMAIilCf4UiHIOFIiMgGoMgHoUiJSAaIB5Cf4WDIh4gHIUiK4QgI4UiLIUhHCAbICKFIB4gKYUgI4MgGoUiHoUgJyAmhSAfgyAdhSIaICSDICiFIh+FIR0gBSAaICCFIiAgJYUgLCAig4UiGiAbhTcDACAEIB0gKoU3AwAgBiAcICCFIBsgK4UgHiAlg4UiG4U3AwAgAyAcIB+FNwMAIAggHEIQhkKAgPz/j4BAgyAcQhCIQv//g4Dw/z+DhDcDACAHIBpCEIZCgID8/4+AQIMgGkIQiEL//4OA8P8/g4Q3AwAgCSAdQhCGQoCA/P+PgECDIB1CEIhC//+DgPD/P4OENwMAIAEgG0IQhkKAgPz/j4BAgyAbQhCIQv//g4Dw/z+DhDcDACAhQgF8QgJUBEBCASEhDAELCyAtQgV8p0EFdEH0wQBqIQJCACEhA0AgAEGAAWogIaciAUEDdGoiAykDACImQn+FIRwgAEHAAGogAUEDdGoiBCkDACIbIABBIGogAUEDdGoiBSkDACACIAFBA3RqKQAAIhogAEHgAGogAUEDdGoiBikDACIdQn+Fg4UiH4MgGoUhICAAQdAAaiABQQN0aiIHKQMAIh4gAEEwaiABQQN0aiIIKQMAIAIgAUECckEDdGopAAAiIiAAQfAAaiABQQN0aiIJKQMAIhpCf4WDhSIjgyAihSEiIB0gG0J/hYMiJyAchSIoIBsgHyAdIByDhSIfIB2DhSIkhCAfhSIbICCDICSFIiogIyAaIABBkAFqIAFBA3RqIgEpAwAiKUJ/hSIcg4UiIyAagyAehSIlIBogHkJ/hYMiHiAchSIrhCAjhSIshSEcIBsgIoUgHiAphSAjgyAahSIehSAnICaFIB+DIB2FIhogJIMgKIUiH4UhHSAFIBogIIUiICAlhSAsICKDhSIaIBuFNwMAIAQgHSAqhTcDACAGIBwgIIUgGyArhSAeICWDhSIbhTcDACADIBwgH4U3AwAgCCAcQiCGIBxCIIiENwMAIAcgGkIghiAaQiCIhDcDACAJIB1CIIYgHUIgiIQ3AwAgASAbQiCGIBtCIIiENwMAICFCAXxCAlQEQEIBISEMAQsLIC1CBnynQQV0QfTBAGohAkIAIRwDQCAAQYABaiAcpyIBQQN0aiIDKQMAIiRCf4UhISAAQcAAaiABQQN0aiIEKQMAIhsgAEEgaiABQQN0aiIFKQMAIAIgAUEDdGopAAAiGiAAQeAAaiABQQN0aiIGKQMAIh1Cf4WDhSIjgyAahSEgIABB0ABqIAFBA3RqIgcpAwAiHiAAQTBqIAFBA3RqIggpAwAgAiABQQJyQQN0aikAACIiIABB8ABqIAFBA3RqIgkpAwAiGkJ/hYOFIiWDICKFISIgHSAbQn+FgyImICGFIR8gGyAjIB0gIYOFIhsgHYOFISEgJiAkhSAbgyAdhSIjICGDIB+FISQgCCAfICGEIBuFIh0gIIMgIYUiHyAlIBogAEGQAWogAUEDdGoiASkDACIlQn+FIiaDhSIhIBqDIB6FIhsgGiAeQn+FgyInICaFIiaEICGFIiiFIh43AwAgByAjICCFIiAgG4UgKCAig4UiIzcDACAJIB0gIoUgJyAlhSAhgyAahSIahSAkhSIhNwMAIAEgHSAmhSAaIBuDhSIaNwMAIAUgIyAdhTcDACAEICEgH4U3AwAgBiAeICCFIBqFNwMAIAMgHiAkhTcDACAcQgF8QgJUBEBCASEcDAELCyAMKQMAIR0gDCAKKQMAIho3AwAgCiAdNwMAIA0pAwAhHCANIAspAwAiHTcDACALIBw3AwAgDikDACEcIA4gDykDACIbNwMAIA8gHDcDACAQKQMAISEgECARKQMAIiA3AwAgESAhNwMAIC1CB3wiLUIqVA0ACyAAQeAAaiIBIAEpAwAgEikDAIU3AwAgAEHoAGoiASABKQMAIBMpAwCFNwMAIA4gGyAUKQMAhTcDACAPIBwgFSkDAIU3AwAgAEGAAWoiASABKQMAIBYpAwCFNwMAIABBiAFqIgAgACkDACAXKQMAhTcDACAQICAgGCkDAIU3AwAgESAhIBkpAwCFNwMAC88UAhZ/AX4jBiEKIwZBwABqJAYgCkEUaiEUIApBEGoiD0G0zAA2AgAgAEEARyETIApBGGoiDUEoaiIRIRYgDUEnaiEXIApBCGoiFUEEaiEZQQAhBEEAIQxBACENQbTMACEHAkACQANAAkAgDEF/SgRAIARB/////wcgDGtKBH9BnD5BywA2AgBBfwUgBCAMagshDAsgBywAACIERQ0CIAchBgJAAkADQAJAAkACQAJAIARBGHRBGHUOJgECAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAAgsgBiEIDAQLIAYiBCEGDAELIA8gBkEBaiIGNgIAIAYsAAAhBAwBCwsMAQsDQCAILAABQSVHBEAgBiEEIAghBgwCCyAGQQFqIQYgDyAIQQJqIgg2AgAgCCwAAEElRg0AIAYhBCAIIQYLCyAEIAdrIQQgEwRAIAAgByAEEAsLIAQEQCAGIQcMAgsgDyAGQQFqIgQsAABBUGoiDkEKSQR/IAZBA2ohCCAGLAACQSRGIgUEfyAIBSAECyEGIAUEQEEBIQ0LIAVFBEBBfyEOCyANIQUgBgVBfyEOIA0hBSAECyINNgIAAkAgDSwAACIGQWBqIghBIEkEQEEAIQQDQEEBIAh0IghBidEEcUUNAiAIIARyIQQgDyANQQFqIg02AgAgDSwAACIGQWBqIghBIEkNAAsFQQAhBAsLIAZB/wFxQSpGBH8CfwJAIA1BAWoiBiwAAEFQaiIIQQpPDQAgDSwAAkEkRw0AIAMgCEECdGpBCjYCACACIAYsAABBUGpBA3RqKQMApyEFIA1BA2ohBkEBDAELIAUEQEF/IQwMAwsgEwR/IAEoAgBBA2pBfHEiDSgCACEFIAEgDUEEajYCAEEABUEAIQVBAAsLIQkgDyAGNgIAIARBgMAAciEIQQAgBWshECAFQQBIIg1FBEAgBCEICyANRQRAIAUhEAsgCQUgDxAoIhBBAEgEQEF/IQwMAgsgBCEIIA8oAgAhBiAFCyENAkAgBiwAAEEuRgRAIAZBAWoiBCwAAEEqRwRAIA8gBDYCACAPECghBCAPKAIAIQYMAgsgBkECaiIFLAAAQVBqIgRBCkkEQCAGLAADQSRGBEAgAyAEQQJ0akEKNgIAIAIgBSwAAEFQakEDdGopAwCnIQQgDyAGQQRqIgY2AgAMAwsLIA0EQEF/IQwMAwsgEwRAIAEoAgBBA2pBfHEiBigCACEEIAEgBkEEajYCAAVBACEECyAPIAU2AgAgBSEGBUF/IQQLC0EAIQsgBiEFA0AgBSwAAEG/f2pBOUsEQEF/IQwMAgsgDyAFQQFqIgY2AgAgC0E6bCAFLAAAakGy0gBqLAAAIhJB/wFxIglBf2pBCEkEQCAJIQsgBiEFDAELCyASRQRAQX8hDAwBCyAOQX9KIRgCQAJAIBJBE0YEQCAYBEBBfyEMDAQFDAILAAUgGARAIAMgDkECdGogCTYCACAKIAIgDkEDdGopAwA3AwAMAgsgE0UEQEEAIQwMBAsgCiAJIAEQJwsMAQsgE0UEQEEAIQQgBiEHDAMLCyAFLAAAIglBX3EhBSALQQBHIAlBD3FBA0ZxRQRAIAkhBQsgCEH//3txIQkgCEGAwABxBEAgCSEICwJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgBUHBAGsOOAsMCQwLCwsMDAwMDAwMDAwMDAoMDAwMAgwMDAwMDAwMCwwGBAsLCwwEDAwMBwADAQwMCAwFDAwCDAsCQAJAAkACQAJAAkACQAJAIAtB/wFxQRh0QRh1DggAAQIDBAcFBgcLIAooAgAgDDYCAEEAIQQgBiEHDBsLIAooAgAgDDYCAEEAIQQgBiEHDBoLIAooAgAgDKw3AwBBACEEIAYhBwwZCyAKKAIAIAw7AQBBACEEIAYhBwwYCyAKKAIAIAw6AABBACEEIAYhBwwXCyAKKAIAIAw2AgBBACEEIAYhBwwWCyAKKAIAIAysNwMAQQAhBCAGIQcMFQtBACEEIAYhBwwUC0H4ACEFIARBCE0EQEEIIQQLIAhBCHIhCAwLCwwKCyAWIAopAwAiGiAREEwiB2siC0EBaiEOQQAhCUHD1gAhBSAIQQhxRSAEIAtKckUEQCAOIQQLDA0LIAopAwAiGkIAUwRAIApCACAafSIaNwMAQQEhCUHD1gAhBQwKBSAIQYAQcUUhByAIQQFxBH9BxdYABUHD1gALIQUgCEGBEHFBAEchCSAHRQRAQcTWACEFCwwKCwALQQAhCUHD1gAhBSAKKQMAIRoMCAsgFyAKKQMAPAAAIBchB0EAIQtBw9YAIQ4gESEFQQEhBCAJIQgMDAtBnD4oAgAiB0GYPygCABBJIQcMBwsgCigCACIHRQRAQc3WACEHCwwGCyAVIAopAwA+AgAgGUEANgIAIAogFTYCAEF/IQsgFSEEDAYLIAooAgAhByAEBEAgBCELIAchBAwGBSAAQSAgEEEAIAgQDEEAIQcMCAsACyAAIAorAwAgECAEIAggBRBLIQQgBiEHDAkLQQAhC0HD1gAhDiARIQUMBgsgCikDACIaIBEgBUEgcRBNIQcgBUEEdUHD1gBqIQUgCEEIcUUgGkIAUXIiCQRAQcPWACEFCyAJBH9BAAVBAgshCQwDCyAaIBEQFyEHDAILIAcgBBApIghFIRIgCCAHayELIAcgBGohBSASRQRAIAshBAtBACELQcPWACEOIBJFBEAgCCEFCyAJIQgMAwsgBCEJQQAhB0EAIQUDQAJAIAkoAgAiDkUNACAUIA4QJiIFQQBIIAUgCyAHa0tyDQAgCUEEaiEJIAsgBSAHaiIHSw0BCwsgBUEASARAQX8hDAwECyAAQSAgECAHIAgQDCAHBEBBACEFA0AgBCgCACIJRQ0DIBQgCRAmIgkgBWoiBSAHSg0DIARBBGohBCAAIBQgCRALIAUgB0kNAAwDCwAFQQAhBwwCCwALIAhB//97cSELIARBf0oEQCALIQgLIARBAEcgGkIAUiILciEOIAQgC0EBc0EBcSAWIAdraiILSgRAIAQhCwsgDgRAIAshBAsgDkUEQCARIQcLIAkhCyAFIQ4gESEFDAELIABBICAQIAcgCEGAwABzEAwgECAHSgR/IBAFIAcLIQQgBiEHDAILIABBICAQIAQgBSAHayIJSAR/IAkFIAQLIhIgC2oiBUgEfyAFBSAQCyIEIAUgCBAMIAAgDiALEAsgAEEwIAQgBSAIQYCABHMQDCAAQTAgEiAJQQAQDCAAIAcgCRALIABBICAEIAUgCEGAwABzEAwgBiEHDAELCwwBCyAARQRAIA0EQEEBIQADQAJAIAMgAEECdGooAgAiDUUEQEEAIQEMAQsgAiAAQQN0aiANIAEQJyAAQQFqIgBBCkgNAUEBIQwMBAsLA0AgAQRAQX8hDAwECyAAQQFqIgBBCkgEQCADIABBAnRqKAIAIQEMAQVBASEMCwsFQQAhDAsLCyAKJAYgDAucBwEmfyMGIQMjBkGAAmokBiACQT9MBEAgAyQGDwsgA0GAAWohByADQcAAaiEEIABBBGohCiADQcABaiIFQQRqIQsgAEEIaiEMIAVBCGohDSAAQQxqIQ4gBUEMaiEPIABBEGohECAFQRBqIREgAEEUaiESIAVBFGohEyAAQRhqIRQgBUEYaiEVIABBHGohFiAFQRxqIRcgAEEgaiEYIAVBIGohGSAAQSRqIRogBUEkaiEbIABBKGohHCAFQShqIR0gAEEsaiEeIAVBLGohHyAAQTBqISAgBUEwaiEhIABBNGohIiAFQTRqISMgAEE4aiEkIAVBOGohJSAAQTxqISYgBUE8aiEnIABBwABqIQggAEHEAGohCQNAIAMgASkCADcCACADIAEpAgg3AgggAyABKQIQNwIQIAMgASkCGDcCGCADIAEpAiA3AiAgAyABKQIoNwIoIAMgASkCMDcCMCADIAEpAjg3AjggBSAAKAIAIAEoAgBzNgIAIAsgCigCACABKAIEczYCACANIAwoAgAgASgCCHM2AgAgDyAOKAIAIAEoAgxzNgIAIBEgECgCACABKAIQczYCACATIBIoAgAgASgCFHM2AgAgFSAUKAIAIAEoAhhzNgIAIBcgFigCACABKAIcczYCACAZIBgoAgAgASgCIHM2AgAgGyAaKAIAIAEoAiRzNgIAIB0gHCgCACABKAIoczYCACAfIB4oAgAgASgCLHM2AgAgISAgKAIAIAEoAjBzNgIAICMgIigCACABKAI0czYCACAlICQoAgAgASgCOHM2AgAgJyAmKAIAIAEoAjxzNgIAIAMgBEEAEBMgBCADQYCAgAgQEyADIARBgICAEBATIAQgA0GAgIAYEBMgAyAEQYCAgCAQEyAEIANBgICAKBATIAMgBEGAgIAwEBMgBCADQYCAgDgQEyADIARBgICAwAAQEyAEIAdBgICAyAAQEyAFIARBABAKIAQgA0EBEAogAyAEQQIQCiAEIANBAxAKIAMgBEEEEAogBCADQQUQCiADIARBBhAKIAQgA0EHEAogAyAEQQgQCiAEIAVBCRAKQQAhBgNAIAAgBkECdGoiKCAHIAZBAnRqKAIAIAUgBkECdGooAgBzICgoAgBzNgIAIAZBAWoiBkEQRw0ACyAIIAgoAgBBAWoiBjYCACAGRQRAIAkgCSgCAEEBajYCAAsgAUHAAGohASACQUBqIgJBP0oNAAsgAyQGC5M2AhF/JH4jBiEEIwZBwABqJAYgA60hNSAEQQhqIQUgBEEQaiEGIARBGGohByAEQSBqIQggBEEoaiEJIARBMGohCiAEQThqIQsgAkF/aq1CAXwhNiAAQQhqIgwpAwAiNyEsIABBEGoiDSkDACEqIABBGGoiDikDACEiIABBIGoiDykDACEjIABBKGoiECkDACEkIABBMGoiESkDACElIABBOGoiEikDACEmIABBwABqIhMpAwAhICAAQcgAaiIUKQMAISEgAEHQAGoiAykDACEnA0AgIkKitPDPqvvG6BuFICOFICSFICWFICaFICCFICGFIRdBACEAA0AgBCAAQQN2QQN0aiABIABBAXJqLQAArUIIhiABIABqLQAArYQgASAAQQJyai0AAK1CEIaEIAEgAEEDcmotAACtQhiGhCABIABBBHJqLQAArUIghoQgASAAQQVyai0AAK1CKIaEIAEgAEEGcmotAACtQjCGfCABIABBB3JqLQAArUI4hnw3AwAgAEEIaiIAQcAASQ0ACyAsIDV8IiwgKoUhLyABQcAAaiEBIAQpAwAiOCAifCAFKQMAICN8IhV8IR8gISAqfCItIAopAwB8IAspAwAgJ3wiGXwhHSAGKQMAICR8IAcpAwAgJXwiFnwiGCAVQi6GIBVCEoiEIB+FIh58IRwgGUIlhiAZQhuIhCAdhSIaIAgpAwAgJnwgICAsfCIuIAkpAwB8Iht8Ihl8IRUgFkIkhiAWQhyIhCAYhSIWIB98ISsgGkIbhiAaQiWIhCAVhSIaIBx8ISkgFSAeQiGGIB5CH4iEIByFIhh8IhUgGEIRhiAYQi+IhIUiHyAbQhOGIBtCLYiEIBmFIhsgHXwiGCAWQiqGIBZCFoiEICuFIhZ8Ihl8IRwgFSAWQjGGIBZCD4iEIBmFIh18IR4gGkInhiAaQhmIhCAphSIaIBtCDoYgG0IyiIQgGIUiFiArfCIYfCIZICN8IB9CLIYgH0IUiIQgHIUgJHwiFXwhGyAcICcgL3wiMHwgFyAnhSIoQgF8IBpCCYYgGkI3iIQgGYV8Ihd8IR8gFUInhiAVQhmIhCAbhSIcIBZCJIYgFkIciIQgGIUiFiApfCIYICV8IB1COIYgHUIIiIQgHoUgJnwiFXwiGXwhGiAbIBVCHoYgFUIiiIQgGYUiG3whHSAXQhiGIBdCKIiEIB+FIhcgHiAgfCAWQjaGIBZCCoiEIBiFIC18IhZ8Ihh8IhkgHEINhiAcQjOIhCAahSIVfCEcIBdCMoYgF0IOiIQgGYUiFyAafCEeIBVCGYYgFUIniIQgHIUiGiAWQiKGIBZCHoiEIBiFIhYgH3wiGCAbQhGGIBtCL4iEIB2FIhV8Ihl8IRsgHCAVQh2GIBVCI4iEIBmFIhx8IR8gF0IrhiAXQhWIhCAehSIXIBZCCoYgFkI2iIQgGIUiFiAdfCIYfCIZICR8IBpCCIYgGkI4iIQgG4UgJXwiFXwhGiAbICggLHwiMXwgIkICfCAXQiOGIBdCHYiEIBmFfCIXfCEdIBVCLoYgFUISiIQgGoUiGyAWQieGIBZCGYiEIBiFIhYgHnwiGCAmfCAcQhaGIBxCKoiEIB+FICB8IhV8Ihl8IRwgGiAVQiSGIBVCHIiEIBmFIhp8IR4gF0IlhiAXQhuIhCAdhSIXIB8gIXwgFkI4hiAWQgiIhCAYhSAwfCIWfCIYfCIZIBtCIYYgG0IfiIQgHIUiFXwhGyAXQhuGIBdCJYiEIBmFIhcgHHwhHyAVQhGGIBVCL4iEIBuFIhwgFkIThiAWQi2IhCAYhSIWIB18IhggGkIqhiAaQhaIhCAehSIVfCIZfCEaIBsgFUIxhiAVQg+IhCAZhSIbfCEdIBdCJ4YgF0IZiIQgH4UiFyAWQg6GIBZCMoiEIBiFIhYgHnwiGHwiGSAlfCAcQiyGIBxCFIiEIBqFICZ8IhV8IRwgGiAiICp8IjJ8ICNCA3wgF0IJhiAXQjeIhCAZhXwiF3whHiAVQieGIBVCGYiEIByFIhogFkIkhiAWQhyIhCAYhSIWIB98IhggIHwgG0I4hiAbQgiIhCAdhSAhfCIVfCIZfCEbIBwgFUIehiAVQiKIhCAZhSIcfCEfIBdCGIYgF0IoiIQgHoUiFyAdICd8IBZCNoYgFkIKiIQgGIUgMXwiFnwiGHwiGSAaQg2GIBpCM4iEIBuFIhV8IRogF0IyhiAXQg6IhCAZhSIXIBt8IR0gFUIZhiAVQieIhCAahSIbIBZCIoYgFkIeiIQgGIUiFiAefCIYIBxCEYYgHEIviIQgH4UiFXwiGXwhHCAaIBVCHYYgFUIjiIQgGYUiGnwhHiAXQiuGIBdCFYiEIB2FIhcgFkIKhiAWQjaIhCAYhSIWIB98Ihh8IhkgJnwgG0IIhiAbQjiIhCAchSAgfCIVfCEbIBwgIyAvfCIzfCAkQgR8IBdCI4YgF0IdiIQgGYV8Ihd8IR8gFUIuhiAVQhKIhCAbhSIcIBZCJ4YgFkIZiIQgGIUiFiAdfCIYICF8IBpCFoYgGkIqiIQgHoUgJ3wiFXwiGXwhGiAbIBVCJIYgFUIciIQgGYUiG3whHSAXQiWGIBdCG4iEIB+FIhcgHiAofCAWQjiGIBZCCIiEIBiFIDJ8IhZ8Ihh8IhkgHEIhhiAcQh+IhCAahSIVfCEcIBdCG4YgF0IliIQgGYUiFyAafCEeIBVCEYYgFUIviIQgHIUiGiAWQhOGIBZCLYiEIBiFIhYgH3wiGCAbQiqGIBtCFoiEIB2FIhV8Ihl8IRsgHCAVQjGGIBVCD4iEIBmFIhx8IR8gF0InhiAXQhmIhCAehSIXIBZCDoYgFkIyiIQgGIUiFiAdfCIYfCIZICB8IBpCLIYgGkIUiIQgG4UgIXwiFXwhGiAbICQgLHwiKXwgJUIFfCAXQgmGIBdCN4iEIBmFfCIXfCEdIBVCJ4YgFUIZiIQgGoUiGyAWQiSGIBZCHIiEIBiFIhYgHnwiGCAnfCAcQjiGIBxCCIiEIB+FICh8IhV8Ihl8IRwgGiAVQh6GIBVCIoiEIBmFIhp8IR4gF0IYhiAXQiiIhCAdhSIXIB8gInwgFkI2hiAWQgqIhCAYhSAzfCIWfCIYfCIZIBtCDYYgG0IziIQgHIUiFXwhGyAXQjKGIBdCDoiEIBmFIhcgHHwhHyAVQhmGIBVCJ4iEIBuFIhwgFkIihiAWQh6IhCAYhSIWIB18IhggGkIRhiAaQi+IhCAehSIVfCIZfCEaIBsgFUIdhiAVQiOIhCAZhSIbfCEdIBdCK4YgF0IViIQgH4UiFyAWQgqGIBZCNoiEIBiFIhYgHnwiGHwiGSAhfCAcQgiGIBxCOIiEIBqFICd8IhV8IRwgGiAlICp8IjR8ICZCBnwgF0IjhiAXQh2IhCAZhXwiF3whHiAVQi6GIBVCEoiEIByFIhogFkInhiAWQhmIhCAYhSIWIB98IhggKHwgG0IWhiAbQiqIhCAdhSAifCIVfCIZfCEbIBwgFUIkhiAVQhyIhCAZhSIcfCEfIBdCJYYgF0IbiIQgHoUiFyAdICN8IBZCOIYgFkIIiIQgGIUgKXwiFnwiGHwiGSAaQiGGIBpCH4iEIBuFIhV8IRogF0IbhiAXQiWIhCAZhSIXIBt8IR0gFUIRhiAVQi+IhCAahSIbIBZCE4YgFkItiIQgGIUiFiAefCIYIBxCKoYgHEIWiIQgH4UiFXwiGXwhHCAaIBVCMYYgFUIPiIQgGYUiGnwhHiAXQieGIBdCGYiEIB2FIhcgFkIOhiAWQjKIhCAYhSIWIB98Ihh8IhkgJ3wgG0IshiAbQhSIhCAchSAofCIVfCEbIBwgJiAvfCIrfCAgQgd8IBdCCYYgF0I3iIQgGYV8Ihd8IR8gFUInhiAVQhmIhCAbhSIcIBZCJIYgFkIciIQgGIUiFiAdfCIYICJ8IBpCOIYgGkIIiIQgHoUgI3wiFXwiGXwhGiAbIBVCHoYgFUIiiIQgGYUiG3whHSAXQhiGIBdCKIiEIB+FIhcgHiAkfCAWQjaGIBZCCoiEIBiFIDR8IhZ8Ihh8IhkgHEINhiAcQjOIhCAahSIVfCEcIBdCMoYgF0IOiIQgGYUiFyAafCEeIBVCGYYgFUIniIQgHIUiGiAWQiKGIBZCHoiEIBiFIhYgH3wiGCAbQhGGIBtCL4iEIB2FIhV8Ihl8IRsgHCAVQh2GIBVCI4iEIBmFIhx8IR8gF0IrhiAXQhWIhCAehSIXIBZCCoYgFkI2iIQgGIUiFiAdfCIYfCIZICh8IBpCCIYgGkI4iIQgG4UgInwiFXwhGiAbIC58ICFCCHwgF0IjhiAXQh2IhCAZhXwiF3whHSAVQi6GIBVCEoiEIBqFIhsgFkInhiAWQhmIhCAYhSIWIB58IhggI3wgHEIWhiAcQiqIhCAfhSAkfCIVfCIZfCEcIBogFUIkhiAVQhyIhCAZhSIafCEeIBdCJYYgF0IbiIQgHYUiFyAfICV8IBZCOIYgFkIIiIQgGIUgK3wiFnwiGHwiGSAbQiGGIBtCH4iEIByFIhV8IRsgF0IbhiAXQiWIhCAZhSIXIBx8IR8gFUIRhiAVQi+IhCAbhSIcIBZCE4YgFkItiIQgGIUiFiAdfCIYIBpCKoYgGkIWiIQgHoUiFXwiGXwhGiAbIBVCMYYgFUIPiIQgGYUiG3whHSAXQieGIBdCGYiEIB+FIhcgFkIOhiAWQjKIhCAYhSIWIB58Ihh8IhkgInwgHEIshiAcQhSIhCAahSAjfCIVfCEcIBogLXwgJ0IJfCAXQgmGIBdCN4iEIBmFfCIXfCEeIBVCJ4YgFUIZiIQgHIUiGiAWQiSGIBZCHIiEIBiFIhYgH3wiGCAkfCAbQjiGIBtCCIiEIB2FICV8IhV8Ihl8IRsgHCAVQh6GIBVCIoiEIBmFIhx8IR8gF0IYhiAXQiiIhCAehSIXIB0gJnwgFkI2hiAWQgqIhCAYhSAufCIWfCIYfCIZIBpCDYYgGkIziIQgG4UiFXwhGiAXQjKGIBdCDoiEIBmFIhcgG3whHSAVQhmGIBVCJ4iEIBqFIhsgFkIihiAWQh6IhCAYhSIWIB58IhggHEIRhiAcQi+IhCAfhSIVfCIZfCEcIBogFUIdhiAVQiOIhCAZhSIafCEeIBdCK4YgF0IViIQgHYUiFyAWQgqGIBZCNoiEIBiFIhYgH3wiGHwiGSAjfCAbQgiGIBtCOIiEIByFICR8IhV8IRsgHCAwfCAoQgp8IBdCI4YgF0IdiIQgGYV8Ihd8IR8gFUIuhiAVQhKIhCAbhSIcIBZCJ4YgFkIZiIQgGIUiFiAdfCIYICV8IBpCFoYgGkIqiIQgHoUgJnwiFXwiGXwhGiAbIBVCJIYgFUIciIQgGYUiG3whHSAXQiWGIBdCG4iEIB+FIhcgHiAgfCAWQjiGIBZCCIiEIBiFIC18IhZ8Ihh8IhkgHEIhhiAcQh+IhCAahSIVfCEcIBdCG4YgF0IliIQgGYUiFyAafCEeIBVCEYYgFUIviIQgHIUiGiAWQhOGIBZCLYiEIBiFIhYgH3wiGCAbQiqGIBtCFoiEIB2FIhV8Ihl8IRsgHCAVQjGGIBVCD4iEIBmFIhx8IR8gF0InhiAXQhmIhCAehSIXIBZCDoYgFkIyiIQgGIUiFiAdfCIYfCIZICR8IBpCLIYgGkIUiIQgG4UgJXwiFXwhGiAbIDF8ICJCC3wgF0IJhiAXQjeIhCAZhXwiF3whHSAVQieGIBVCGYiEIBqFIhsgFkIkhiAWQhyIhCAYhSIWIB58IhggJnwgHEI4hiAcQgiIhCAfhSAgfCIVfCIZfCEcIBogFUIehiAVQiKIhCAZhSIafCEeIBdCGIYgF0IoiIQgHYUiFyAfICF8IBZCNoYgFkIKiIQgGIUgMHwiFnwiGHwiGSAbQg2GIBtCM4iEIByFIhV8IRsgF0IyhiAXQg6IhCAZhSIXIBx8IR8gFUIZhiAVQieIhCAbhSIcIBZCIoYgFkIeiIQgGIUiFiAdfCIYIBpCEYYgGkIviIQgHoUiFXwiGXwhGiAbIBVCHYYgFUIjiIQgGYUiG3whHSAXQiuGIBdCFYiEIB+FIhcgFkIKhiAWQjaIhCAYhSIWIB58Ihh8IhkgJXwgHEIIhiAcQjiIhCAahSAmfCIVfCEcIBogMnwgI0IMfCAXQiOGIBdCHYiEIBmFfCIXfCEeIBVCLoYgFUISiIQgHIUiGiAWQieGIBZCGYiEIBiFIhYgH3wiGCAgfCAbQhaGIBtCKoiEIB2FICF8IhV8Ihl8IRsgHCAVQiSGIBVCHIiEIBmFIhx8IR8gF0IlhiAXQhuIhCAehSIXIB0gJ3wgFkI4hiAWQgiIhCAYhSAxfCIWfCIYfCIZIBpCIYYgGkIfiIQgG4UiFXwhGiAXQhuGIBdCJYiEIBmFIhcgG3whHSAVQhGGIBVCL4iEIBqFIhsgFkIThiAWQi2IhCAYhSIWIB58IhggHEIqhiAcQhaIhCAfhSIVfCIZfCEcIBogFUIxhiAVQg+IhCAZhSIafCEeIBdCJ4YgF0IZiIQgHYUiFyAWQg6GIBZCMoiEIBiFIhYgH3wiGHwiGSAmfCAbQiyGIBtCFIiEIByFICB8IhV8IRsgHCAzfCAkQg18IBdCCYYgF0I3iIQgGYV8Ihd8IR8gFUInhiAVQhmIhCAbhSIcIBZCJIYgFkIciIQgGIUiFiAdfCIYICF8IBpCOIYgGkIIiIQgHoUgJ3wiFXwiGXwhGiAbIBVCHoYgFUIiiIQgGYUiG3whHSAXQhiGIBdCKIiEIB+FIhcgHiAofCAWQjaGIBZCCoiEIBiFIDJ8IhZ8Ihh8IhkgHEINhiAcQjOIhCAahSIVfCEcIBdCMoYgF0IOiIQgGYUiFyAafCEeIBVCGYYgFUIniIQgHIUiGiAWQiKGIBZCHoiEIBiFIhYgH3wiGCAbQhGGIBtCL4iEIB2FIhV8Ihl8IRsgHCAVQh2GIBVCI4iEIBmFIhx8IR8gF0IrhiAXQhWIhCAehSIXIBZCCoYgFkI2iIQgGIUiFiAdfCIYfCIZICB8IBpCCIYgGkI4iIQgG4UgIXwiFXwhGiAbICl8ICVCDnwgF0IjhiAXQh2IhCAZhXwiF3whHSAVQi6GIBVCEoiEIBqFIhsgFkInhiAWQhmIhCAYhSIWIB58IhggJ3wgHEIWhiAcQiqIhCAfhSAofCIVfCIZfCEcIBogFUIkhiAVQhyIhCAZhSIafCEeIBdCJYYgF0IbiIQgHYUiFyAfICJ8IBZCOIYgFkIIiIQgGIUgM3wiFnwiGHwiGSAbQiGGIBtCH4iEIByFIhV8IRsgF0IbhiAXQiWIhCAZhSIXIBx8IR8gFUIRhiAVQi+IhCAbhSIcIBZCE4YgFkItiIQgGIUiFiAdfCIYIBpCKoYgGkIWiIQgHoUiFXwiGXwhGiAbIBVCMYYgFUIPiIQgGYUiG3whHSAXQieGIBdCGYiEIB+FIhcgFkIOhiAWQjKIhCAYhSIWIB58Ihh8IhkgIXwgHEIshiAcQhSIhCAahSAnfCIVfCEcIBogNHwgJkIPfCAXQgmGIBdCN4iEIBmFfCIXfCEeIBVCJ4YgFUIZiIQgHIUiGiAWQiSGIBZCHIiEIBiFIhYgH3wiGCAofCAbQjiGIBtCCIiEIB2FICJ8IhV8Ihl8IRsgHCAVQh6GIBVCIoiEIBmFIhx8IR8gF0IYhiAXQiiIhCAehSIXIB0gI3wgFkI2hiAWQgqIhCAYhSApfCIWfCIYfCIZIBpCDYYgGkIziIQgG4UiFXwhGiAXQjKGIBdCDoiEIBmFIhcgG3whKSAVQhmGIBVCJ4iEIBqFIh0gFkIihiAWQh6IhCAYhSIbIB58IhggHEIRhiAcQi+IhCAfhSIVfCIZfCEWIBogFUIdhiAVQiOIhCAZhSIcfCEeIBdCK4YgF0IViIQgKYUiFyAbQgqGIBtCNoiEIBiFIhogH3wiGHwiGSAnfCAdQgiGIB1COIiEIBaFICh8IhV8IRsgFiArfCAgQhB8IBdCI4YgF0IdiIQgGYV8Ihd8IR8gFUIuhiAVQhKIhCAbhSIWIBpCJ4YgGkIZiIQgGIUiFSApfCIZICJ8IBxCFoYgHEIqiIQgHoUgI3wiGHwiIHwhHCAbIBhCJIYgGEIciIQgIIUiGnwhHSAXQiWGIBdCG4iEIB+FIhcgHiAkfCAVQjiGIBVCCIiEIBmFIDR8IhV8Ihl8IiAgFkIhhiAWQh+IhCAchSIYfCEbIBdCG4YgF0IliIQgIIUiFiAcfCEeIBhCEYYgGEIviIQgG4UiFyAVQhOGIBVCLYiEIBmFIhUgH3wiGSAaQiqGIBpCFoiEIB2FIhh8IiB8IRogGyAYQjGGIBhCD4iEICCFIht8IRwgFkInhiAWQhmIhCAehSIYIBVCDoYgFUIyiIQgGYUiFiAdfCIZfCIgICh8IBdCLIYgF0IUiIQgGoUgInwiFXwhFyAaIC58ICFCEXwgGEIJhiAYQjeIhCAghXwiGHwhHSAVQieGIBVCGYiEIBeFIhogFkIkhiAWQhyIhCAZhSIVIB58IiAgI3wgG0I4hiAbQgiIhCAchSAkfCIZfCIhfCEbIBcgGUIehiAZQiKIhCAhhSIWfCEeIBhCGIYgGEIoiIQgHYUiGCAcICV8IBVCNoYgFUIKiIQgIIUgK3wiF3wiIHwiISAaQg2GIBpCM4iEIBuFIhl8IRUgGEIyhiAYQg6IhCAhhSIYIBt8IRwgGUIZhiAZQieIhCAVhSIaIBdCIoYgF0IeiIQgIIUiGyAdfCIgIBZCEYYgFkIviIQgHoUiGXwiIXwhFiAVIBlCHYYgGUIjiIQgIYUiF3whFSAOIBhCK4YgGEIViIQgHIUiGCAbQgqGIBtCNoiEICCFIiAgHnwiIXwiGSAifCA4hSIiNwMAIA8gGkIIhiAaQjiIhCAWhSAjfCAFKQMAhSIjNwMAIBAgIEInhiAgQhmIhCAhhSIgIBx8IiEgJHwgBikDAIUiJDcDACARIBdCFoYgF0IqiIQgFYUgJXwgBykDAIUiJTcDACASIBUgJnwgCCkDAIUiJjcDACATICBCOIYgIEIIiIQgIYUgLnwgCSkDAIUiIDcDACAUIBYgLXwgCikDAIUiITcDACADICdCEnwgGEIjhiAYQh2IhCAZhXwgCykDAIUiJzcDACAqQv//////////v3+DISogAkF/aiICDQALIAwgNyA2IDV+fDcDACANICo3AwAgBCQGCwgAQQAQAEEACwgAIAAgARAaCwgAIAAgARA6CyIAIAG9QoCAgICAgICAgH+DIAC9Qv///////////wCDhL8L4QMCBn8CfgJAAkACQCAAQQRqIgMoAgAiASAAQeQAaiIEKAIASQR/IAMgAUEBajYCACABLQAABSAAEAkLIgFBK2sOAwABAAELIAFBLUYhBSADKAIAIgEgBCgCAEkEQCADIAFBAWo2AgAgAS0AACEBDAIFIAAQCSEBDAILAAtBACEFCyABQVBqQQlLBEAgBCgCAAR+IAMgAygCAEF/ajYCAEKAgICAgICAgIB/BUKAgICAgICAgIB/CyEHBUEAIQIDQCABQVBqIAJBCmxqIQIgAygCACIBIAQoAgBJBH8gAyABQQFqNgIAIAEtAAAFIAAQCQsiAUFQakEKSSIGIAJBzJmz5gBIcQ0ACyACrCEHIAYEQCABIQIDQCADKAIAIgEgBCgCAEkEfyADIAFBAWo2AgAgAS0AAAUgABAJCyIBQVBqQQpJIAKsQlB8IAdCCn58IgdCro+F18fC66MBU3EEQCABIQIMAQsLCyAEKAIAIQIgAUFQakEKSQRAIAIhAQNAIAMoAgAiAiABSQRAIAMgAkEBajYCACACLQAAIQIFIAAQCSECIAQoAgAhAQsgAkFQakEKSQ0ACwUgAiEBCyABBEAgAyADKAIAQX9qNgIAC0IAIAd9IQggBQRAIAghBwsLIAcLVQACQCAABEACQAJAAkACQAJAAkAgAUF+aw4GAAECAwUEBQsgACACPAAADAYLIAAgAj0BAAwFCyAAIAI+AgAMBAsgACACPgIADAMLIAAgAjcDAAsLCwuGEQECfgJAAkACQAJAIAC9IgJCNIgiA6dB/w9xDoAQAAICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgECCyABIABEAAAAAAAAAABiBH8gAEQAAAAAAADwQ6IgARAlIQAgASgCAEFAagVBAAs2AgAMAgsMAQsgASADp0H/D3FBgnhqNgIAIAJC/////////4eAf4NCgICAgICAgPA/hL8hAAsgAAsQACAABH8gACABEEoFQQALC9oDAwF/AX4BfAJAIAFBFE0EQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAUEJaw4KAAECAwQFBgcICQoLIAIoAgBBA2pBfHEiASgCACEDIAIgAUEEajYCACAAIAM2AgAMCwsgAigCAEEDakF8cSIBKAIAIQMgAiABQQRqNgIAIAAgA6w3AwAMCgsgAigCAEEDakF8cSIBKAIAIQMgAiABQQRqNgIAIAAgA603AwAMCQsgAigCAEEHakF4cSIBKQMAIQQgAiABQQhqNgIAIAAgBDcDAAwICyACKAIAQQNqQXxxIgEoAgAhAyACIAFBBGo2AgAgACADQf//A3FBEHRBEHWsNwMADAcLIAIoAgBBA2pBfHEiASgCACEDIAIgAUEEajYCACAAIANB//8Dca03AwAMBgsgAigCAEEDakF8cSIBKAIAIQMgAiABQQRqNgIAIAAgA0H/AXFBGHRBGHWsNwMADAULIAIoAgBBA2pBfHEiASgCACEDIAIgAUEEajYCACAAIANB/wFxrTcDAAwECyACKAIAQQdqQXhxIgErAwAhBSACIAFBCGo2AgAgACAFOQMADAMLIAIoAgBBB2pBeHEiASsDACEFIAIgAUEIajYCACAAIAU5AwALCwsLVwEEfyAAKAIAIgIsAABBUGoiAUEKSQRAQQAhAwNAIAEgA0EKbGohASAAIAJBAWoiAjYCACACLAAAQVBqIgRBCkkEQCABIQMgBCEBDAELCwVBACEBCyABC9EBAQF/AkAgAUEARyICIABBA3FBAEdxBEADQCAALAAARQ0CIAFBf2oiAUEARyICIABBAWoiAEEDcUEAR3ENAAsLIAIEQCAALAAABEACQAJAIAFBA00NAANAIAAoAgAiAkGAgYKEeHFBgIGChHhzIAJB//37d2pxRQRAIABBBGohACABQXxqIgFBA0sNAQwCCwsMAQsgAUUEQEEAIQEMBAsLA0AgACwAAEUNAyAAQQFqIQAgAUF/aiIBDQBBACEBCwsFQQAhAQsLIAEEfyAABUEACwviDAEGfyAAIAFqIQUCQCAAKAIEIgNBAXFFBEAgACgCACECIANBA3FFBEAPCyACIAFqIQEgAEEAIAJraiIAQZzmACgCAEYEQCAFQQRqIgIoAgAiA0EDcUEDRw0CQZDmACABNgIAIAIgA0F+cTYCACAAIAFBAXI2AgQgACABaiABNgIADwsgAkEDdiEEIAJBgAJJBEAgACgCDCICIAAoAggiA0YEQEGI5gBBiOYAKAIAQQEgBHRBf3NxNgIADAMFIAMgAjYCDCACIAM2AggMAwsACyAAKAIYIQcCQCAAKAIMIgIgAEYEQCAAQRBqIgNBBGoiBCgCACICBEAgBCEDBSADKAIAIgJFBEBBACECDAMLCwNAIAJBFGoiBCgCACIGBEAgBiECIAQhAwwBCyACQRBqIgQoAgAiBgRAIAYhAiAEIQMMAQsLIANBADYCAAUgACgCCCIDIAI2AgwgAiADNgIICwsgBwRAIAAgACgCHCIDQQJ0QbjoAGoiBCgCAEYEQCAEIAI2AgAgAkUEQEGM5gBBjOYAKAIAQQEgA3RBf3NxNgIADAQLBSAHQRBqIAcoAhAgAEdBAnRqIAI2AgAgAkUNAwsgAiAHNgIYIABBEGoiBCgCACIDBEAgAiADNgIQIAMgAjYCGAsgBCgCBCIDBEAgAiADNgIUIAMgAjYCGAsLCwsgBUEEaiIDKAIAIgJBAnEEQCADIAJBfnE2AgAgACABQQFyNgIEIAAgAWogATYCACABIQIFQZzmACgCACEDIAVBoOYAKAIARgRAQZTmAEGU5gAoAgAgAWoiATYCAEGg5gAgADYCACAAIAFBAXI2AgQgACADRwRADwtBnOYAQQA2AgBBkOYAQQA2AgAPCyAFIANGBEBBkOYAQZDmACgCACABaiIBNgIAQZzmACAANgIAIAAgAUEBcjYCBCAAIAFqIAE2AgAPCyACQXhxIAFqIQYgAkEDdiEDAkAgAkGAAkkEQCAFKAIMIgEgBSgCCCICRgRAQYjmAEGI5gAoAgBBASADdEF/c3E2AgAFIAIgATYCDCABIAI2AggLBSAFKAIYIQcCQCAFKAIMIgEgBUYEQCAFQRBqIgJBBGoiAygCACIBBEAgAyECBSACKAIAIgFFBEBBACEBDAMLCwNAIAFBFGoiAygCACIEBEAgBCEBIAMhAgwBCyABQRBqIgMoAgAiBARAIAQhASADIQIMAQsLIAJBADYCAAUgBSgCCCICIAE2AgwgASACNgIICwsgBwRAIAUgBSgCHCICQQJ0QbjoAGoiAygCAEYEQCADIAE2AgAgAUUEQEGM5gBBjOYAKAIAQQEgAnRBf3NxNgIADAQLBSAHQRBqIAcoAhAgBUdBAnRqIAE2AgAgAUUNAwsgASAHNgIYIAVBEGoiAygCACICBEAgASACNgIQIAIgATYCGAsgAygCBCICBEAgASACNgIUIAIgATYCGAsLCwsgACAGQQFyNgIEIAAgBmogBjYCACAAQZzmACgCAEYEQEGQ5gAgBjYCAA8FIAYhAgsLIAJBA3YhAyACQYACSQRAIANBA3RBsOYAaiEBQYjmACgCACICQQEgA3QiA3EEfyABQQhqIgMoAgAFQYjmACACIANyNgIAIAFBCGohAyABCyECIAMgADYCACACIAA2AgwgACACNgIIIAAgATYCDA8LIAJBCHYiAQR/IAJB////B0sEf0EfBSACQQ4gASABQYD+P2pBEHZBCHEiAXQiA0GA4B9qQRB2QQRxIgQgAXIgAyAEdCIBQYCAD2pBEHZBAnEiA3JrIAEgA3RBD3ZqIgFBB2p2QQFxIAFBAXRyCwVBAAsiA0ECdEG46ABqIQEgACADNgIcIABBADYCFCAAQQA2AhBBjOYAKAIAIgRBASADdCIGcUUEQEGM5gAgBCAGcjYCACABIAA2AgAgACABNgIYIAAgADYCDCAAIAA2AggPCyABKAIAIQFBGSADQQF2ayEEIAIgA0EfRgR/QQAFIAQLdCEDAkADQCABKAIEQXhxIAJGDQEgA0EBdCEEIAFBEGogA0EfdkECdGoiAygCACIGBEAgBCEDIAYhAQwBCwsgAyAANgIAIAAgATYCGCAAIAA2AgwgACAANgIIDwsgAUEIaiICKAIAIgMgADYCDCACIAA2AgAgACADNgIIIAAgATYCDCAAQQA2AhgLsQgBC38gAEUEQCABEBIPCyABQb9/SwRAQZw+QQw2AgBBAA8LIAFBC2pBeHEhBCABQQtJBEBBECEECyAAQXhqIgggAEF8aiIHKAIAIglBeHEiAmohBQJAIAlBA3EEQCACIARPBEAgAiAEayIBQQ9NBEAgAA8LIAcgCUEBcSAEckECcjYCACAIIARqIgIgAUEDcjYCBCACIAFqQQRqIgMgAygCAEEBcjYCACACIAEQKiAADwsgBUGg5gAoAgBGBEBBlOYAKAIAIAJqIgIgBE0NAiAHIAlBAXEgBHJBAnI2AgAgCCAEaiIBIAIgBGsiAkEBcjYCBEGg5gAgATYCAEGU5gAgAjYCACAADwsgBUGc5gAoAgBGBEBBkOYAKAIAIAJqIgIgBEkNAiAJQQFxIQMgAiAEayIBQQ9LBEAgCCAEaiICIAFqIQYgByADIARyQQJyNgIAIAIgAUEBcjYCBCAGIAE2AgAgBkEEaiIDIAMoAgBBfnE2AgAFIAcgAyACckECcjYCACAIIAJqQQRqIgEgASgCAEEBcjYCAEEAIQJBACEBC0GQ5gAgATYCAEGc5gAgAjYCACAADwsgBSgCBCIDQQJxRQRAIANBeHEgAmoiDCAETwRAIAwgBGshCiADQQN2IQYCQCADQYACSQRAIAUoAgwiASAFKAIIIgJGBEBBiOYAQYjmACgCAEEBIAZ0QX9zcTYCAAUgAiABNgIMIAEgAjYCCAsFIAUoAhghCwJAIAUoAgwiASAFRgRAIAVBEGoiAkEEaiIDKAIAIgEEQCADIQIFIAIoAgAiAUUEQEEAIQEMAwsLA0AgAUEUaiIDKAIAIgYEQCAGIQEgAyECDAELIAFBEGoiAygCACIGBEAgBiEBIAMhAgwBCwsgAkEANgIABSAFKAIIIgIgATYCDCABIAI2AggLCyALBEAgBSAFKAIcIgJBAnRBuOgAaiIDKAIARgRAIAMgATYCACABRQRAQYzmAEGM5gAoAgBBASACdEF/c3E2AgAMBAsFIAtBEGogCygCECAFR0ECdGogATYCACABRQ0DCyABIAs2AhggBUEQaiIDKAIAIgIEQCABIAI2AhAgAiABNgIYCyADKAIEIgIEQCABIAI2AhQgAiABNgIYCwsLCyAJQQFxIQEgCkEQSQRAIAcgDCABckECcjYCACAIIAxqQQRqIgEgASgCAEEBcjYCACAADwUgByABIARyQQJyNgIAIAggBGoiASAKQQNyNgIEIAEgCmpBBGoiAiACKAIAQQFyNgIAIAEgChAqIAAPCwALCwUgBEGAAkkgAiAEQQRySXJFBEAgAiAEa0Ho6QAoAgBBAXRNBEAgAA8LCwsLIAEQEiICRQRAQQAPCyACIAAgBygCACIDQXhxIANBA3EEf0EEBUEIC2siAyABSQR/IAMFIAELEBAaIAAQDyACC84OAR9/IwYhBiMGQcAAaiQGQQAhAgNAIAYgAkECdGogASACQQJ0aiIELQABQRB0IAQtAABBGHRyIAQtAAJBCHRyIAQtAANyNgIAIAJBAWoiAkEQRw0ACyAAKAIAIQwgAEEEaiIWKAIAIQggAEEIaiIXKAIAIQkgAEEMaiIYKAIAIQ8gAEEQaiIZKAIAIQEgAEEUaiIaKAIAIQIgAEEYaiIbKAIAIQQgAEEcaiIcKAIAIQUgAEEgaiIdKAIAQYjV/aECcyEQIABBJGoiHigCAEHTkYyteHMhCyAAQShqIh8oAgBBrpTmmAFzIRMgAEEsaiIgKAIAQcTmwRtzIRQgACgCPAR/QaLwpKB6IRFB0OP8zAIhDUGY9bvBACESQYnZueJ+IQ5BAAUgACgCMCINQaLwpKB6cyERIA1B0OP8zAJzIQ0gACgCNCIOQZj1u8EAcyESIA5Bidm54n5zIQ5BAAshBwNAIA0gB0EEdEHMzgBqLQAAIg1BAnRB0DtqKAIAIAYgB0EEdEHLzgBqLQAAIgpBAnRqKAIAcyACaiAIaiIIcyIDQRB0IANBEHZyIgMgC2oiCyACcyICQRR0IAJBDHZyIgIgAyAKQQJ0QdA7aigCACAGIA1BAnRqKAIAcyACaiAIaiIIcyICQRh0IAJBCHZyIg0gC2oiC3MiAkEZdCACQQd2ciECIAQgEiAHQQR0Qc7OAGotAAAiEkECdEHQO2ooAgAgBiAHQQR0Qc3OAGotAAAiCkECdGooAgBzIARqIAlqIgRzIglBEHQgCUEQdnIiCSATaiITcyIDQRR0IANBDHZyIgMgCSAKQQJ0QdA7aigCACAGIBJBAnRqKAIAcyADaiAEaiIJcyIEQRh0IARBCHZyIhIgE2oiE3MiBEEZdCAEQQd2ciEEIAUgDiAHQQR0QdDOAGotAAAiDkECdEHQO2ooAgAgBiAHQQR0Qc/OAGotAAAiCkECdGooAgBzIAVqIA9qIgVzIg9BEHQgD0EQdnIiDyAUaiIUcyIDQRR0IANBDHZyIgMgDyAKQQJ0QdA7aigCACAGIA5BAnRqKAIAcyADaiAFaiIPcyIFQRh0IAVBCHZyIg4gFGoiFHMiBUEZdCAFQQd2ciEFIBIgB0EEdEHYzgBqLQAAIhJBAnRB0DtqKAIAIAYgB0EEdEHXzgBqLQAAIgpBAnRqKAIAcyARIAdBBHRBys4Aai0AACIRQQJ0QdA7aigCACAGIAdBBHRByc4Aai0AACIDQQJ0aigCAHMgAWogDGoiDHMiFUEQdCAVQRB2ciIVIBBqIhAgAXMiAUEUdCABQQx2ciIBIBUgA0ECdEHQO2ooAgAgBiARQQJ0aigCAHMgAWogDGoiDHMiAUEYdCABQQh2ciIRIBBqIhBzIgFBGXQgAUEHdnIiA2ogD2oiD3MiAUEQdCABQRB2ciIVIAtqIQEgFSAKQQJ0QdA7aigCACAGIBJBAnRqKAIAcyADIAFzIgtBFHQgC0EMdnIiCmogD2oiD3MiC0EYdCALQQh2ciISIAFqIQsgCiALcyIBQRl0IAFBB3ZyIQEgBSANIAdBBHRB1s4Aai0AACINQQJ0QdA7aigCACAGIAdBBHRB1c4Aai0AACIKQQJ0aigCAHMgBWogCWoiBXMiCUEQdCAJQRB2ciIJIBBqIhBzIgNBFHQgA0EMdnIiAyAJIApBAnRB0DtqKAIAIAYgDUECdGooAgBzIANqIAVqIglzIgVBGHQgBUEIdnIiDSAQaiIQcyIFQRl0IAVBB3ZyIQUgAiAOIAdBBHRB0s4Aai0AACIOQQJ0QdA7aigCACAGIAdBBHRB0c4Aai0AACIKQQJ0aigCAHMgAmogDGoiAnMiDEEQdCAMQRB2ciIMIBNqIhNzIgNBFHQgA0EMdnIiAyAMIApBAnRB0DtqKAIAIAYgDkECdGooAgBzIANqIAJqIgxzIgJBGHQgAkEIdnIiDiATaiITcyICQRl0IAJBB3ZyIQIgBCARIAdBBHRB1M4Aai0AACIRQQJ0QdA7aigCACAGIAdBBHRB084Aai0AACIKQQJ0aigCAHMgBGogCGoiBHMiCEEQdCAIQRB2ciIIIBRqIhRzIgNBFHQgA0EMdnIiAyAIIApBAnRB0DtqKAIAIAYgEUECdGooAgBzIANqIARqIghzIgRBGHQgBEEIdnIiESAUaiIUcyIEQRl0IARBB3ZyIQQgB0EBaiIHQQ5HDQALIBYoAgAgCHMgC3MhCCAXKAIAIAlzIBNzIQsgGCgCACAPcyAUcyEJIBkoAgAgAXMgEXMhASAaKAIAIAJzIA1zIQIgGygCACAEcyAScyEEIBwoAgAgBXMgDnMhBSAAIAAoAgAgDHMgEHMgHSgCACIAczYCACAWIAggHigCACIMczYCACAXIAsgHygCACIQczYCACAYIAkgICgCACIIczYCACAZIAEgAHM2AgAgGiACIAxzNgIAIBsgBCAQczYCACAcIAUgCHM2AgAgBiQGC7IHAg1/AX4jBiECIwZBEGokBkEYEBIiAEUEQCACJAZBAA8LIABBfGooAgBBA3EEQCAAQgA3AAAgAEIANwAIIABCADcAEAsgAhAHGiACEAghASACLwEEIgUQEiIDRSIGRQRAIANBfGooAgBBA3EEQCADQQAgBRAOGgsLIAEoAhQhByABKAIQIQggASgCDCEJIAEoAgghCiABKAIEIQsgASgCACEBIwYhBCMGQRBqJAZBFCAEEAUhDCAEJAYgDCEEIAZFBEAgAxAPC0GA5gAgBUHtDmogB2ogCGogAyAFamogCWogCmogC2ogAWogBGoiAUF/aq03AwAgAEEANgIAIABBBGoiASABLgEAQX5xOwEAQYDmAEGA5gApAwBCrf7V5NSF/ajYAH5CAXwiDTcDACAAIA1CIYg8AAZBgOYAQYDmACkDAEKt/tXk1IX9qNgAfkIBfCINNwMAIAAgDUIhiDwAB0GA5gBBgOYAKQMAQq3+1eTUhf2o2AB+QgF8Ig03AwAgACANQiGIPAAIQYDmAEGA5gApAwBCrf7V5NSF/ajYAH5CAXwiDTcDACAAIA1CIYg8AAlBgOYAQYDmACkDAEKt/tXk1IX9qNgAfkIBfCINNwMAIAAgDUIhiDwACkGA5gBBgOYAKQMAQq3+1eTUhf2o2AB+QgF8Ig03AwAgACANQiGIPAALQYDmAEGA5gApAwBCrf7V5NSF/ajYAH5CAXwiDTcDACAAIA1CIYg8AAxBgOYAQYDmACkDAEKt/tXk1IX9qNgAfkIBfCINNwMAIAAgDUIhiDwADUGA5gBBgOYAKQMAQq3+1eTUhf2o2AB+QgF8Ig03AwAgACANQiGIPAAOQYDmAEGA5gApAwBCrf7V5NSF/ajYAH5CAXwiDTcDACAAIA1CIYg8AA9BgOYAQYDmACkDAEKt/tXk1IX9qNgAfkIBfCINNwMAIAAgDUIhiDwAEEGA5gBBgOYAKQMAQq3+1eTUhf2o2AB+QgF8Ig03AwAgACANQiGIPAARQYDmAEGA5gApAwBCrf7V5NSF/ajYAH5CAXwiDTcDACAAIA1CIYg8ABJBgOYAQYDmACkDAEKt/tXk1IX9qNgAfkIBfCINNwMAIAAgDUIhiDwAE0GA5gBBgOYAKQMAQq3+1eTUhf2o2AB+QgF8Ig03AwAgACANQiGIPAAUQYDmAEGA5gApAwBCrf7V5NSF/ajYAH5CAXwiDTcDACAAIA1CIYg8ABUgASABLgEAQQJyOwEAIAIkBiAAC9YGAQ5/IwYhBiMGQRBqJAZBGBASIgMEQCADQXxqKAIAQQNxBEAgA0IANwAAIANCADcACCADQgA3ABALCyAAIAM2AgAgA0EgNgIAQSAQEiICBEAgAkF8aigCAEEDcQRAIAJCADcAACACQgA3AAggAkIANwAQIAJCADcAGAsLIAMgAjYCBCACIAEpAAA3AAAgAiABKQAINwAIIAIgASkAEDcAECACIAEpABg3ABggACgCACIBQQg2AhQgAUEPNgIQIAFB8AE2AghB8AEQEiICBEAgAkF8aigCAEEDcQRAIAJBAEHwARAOGgsLIAEgAjYCDCACIAEoAgQgASgCABAQGiAGQQFqIQggBkECaiELIAZBA2ohDEEIIQUDQCAGIAEoAgwiDSAFQQJ0IglBfGpqKAAAIgQ2AgAgBEEIdiEOIARBEHYhDyAEQRh2IQogBUEHcQRAIA9B/wFxIQcgDkH/AXEhAyAEQf8BcSECIAUgASgCFCIBcEEERgRAIAYgBEEEdkEPcUEEdEG/zABqIARBD3FqLAAAIgI6AAAgCCAEQQx2QQ9xQQR0Qb/MAGogDkEPcWosAAAiAzoAACALIARBFHZBD3FBBHRBv8wAaiAPQQ9xaiwAACIHOgAAIAwgBEEcdkEEdEG/zABqIApBD3FqLAAAIgo6AAALBSAGIAhBAxA2GiAGLQAAIgJBBHZBBHRBv8wAaiACQQ9xaiwAACECIAggCC0AACIDQQR2QQR0Qb/MAGogA0EPcWosAAAiAzoAACALIAstAAAiB0EEdkEEdEG/zABqIAdBD3FqLAAAIgc6AAAgDCAEQQR2QQ9xQQR0Qb/MAGogBEEPcWosAAAiCjoAACAGIAUgASgCFCIBbkG+zgBqLAAAIAJzIgI6AAALIA0gCWogAiANIAUgAWtBAnRqLAAAczoAACAAKAIAIgEoAgwiAiAJQQFyaiADIAIgBSABKAIUa0ECdEEBcmosAABzOgAAIAAoAgAiASgCDCICIAlBAnJqIAcgAiAFIAEoAhRrQQJ0QQJyaiwAAHM6AAAgACgCACIBKAIMIgIgCUEDcmogCiACIAUgASgCFGtBAnRBA3JqLAAAczoAACAFQQFqIgVBPEcEQCAAKAIAIQEMAQsLIAYkBgvLHQIFfxt+IAOtIRsgAkF/aq1CAXwhHiAAQQhqIgQpAwAiHyEWIABBEGoiBSkDACEUIABBGGoiBikDACEQIABBIGoiBykDACESIABBKGoiCCkDACERIABBMGoiAykDACETA0AgFiAbfCIWIBSFIRcgAUEgaiEAIBEgFHwiGCABLQARrUIIhiABLQAQrYQgAS0AEq1CEIaEIAEtABOtQhiGhCABLQAUrUIghoQgAS0AFa1CKIaEIAEtABatQjCGfCABLQAXrUI4hnwiIHwgAS0AGa1CCIYgAS0AGK2EIAEtABqtQhCGhCABLQAbrUIYhoQgAS0AHK1CIIaEIAEtAB2tQiiGhCABLQAerUIwhnwgAS0AH61COIZ8IiEgE3wiCnwhDSAKQhCGIApCMIiEIA2FIgwgAS0AAa1CCIYgAS0AAK2EIAEtAAKtQhCGhCABLQADrUIYhoQgAS0ABK1CIIaEIAEtAAWtQiiGhCABLQAGrUIwhnwgAS0AB61COIZ8IiIgEHwgEiAWfCIcIAEtAAmtQgiGIAEtAAithCABLQAKrUIQhoQgAS0AC61CGIaEIAEtAAytQiCGhCABLQANrUIohoQgAS0ADq1CMIZ8IAEtAA+tQjiGfCIjfCILfCIKfCEJIAxCNIYgDEIMiIQgCYUiDCALQg6GIAtCMoiEIAqFIgsgDXwiCnwhDSAMQiiGIAxCGIiEIA2FIgwgC0I5hiALQgeIhCAKhSILIAl8Igp8IQ4gC0IXhiALQimIhCAKhSIJIA18IgogEyAXfCIZfCAQQqK08M+q+8boG4UgEoUgEYUgE4UiFUIBfCAMQgWGIAxCO4iEIA6FfCILfCENIAtCIYYgC0IfiIQgDYUiDCAOIBJ8IAlCJYYgCUIbiIQgCoUgGHwiC3wiCnwhCSAMQi6GIAxCEoiEIAmFIgwgC0IZhiALQieIhCAKhSILIA18Igp8IQ0gDEIWhiAMQiqIhCANhSIMIAtCDIYgC0I0iIQgCoUiCyAJfCIKfCEOIAtCOoYgC0IGiIQgCoUiCSANfCIKIBUgFnwiGnwgEEICfCAMQiCGIAxCIIiEIA6FfCILfCENIAtCEIYgC0IwiIQgDYUiDCAOIBF8IAlCIIYgCUIgiIQgCoUgGXwiC3wiCnwhCSAMQjSGIAxCDIiEIAmFIgwgC0IOhiALQjKIhCAKhSILIA18Igp8IQ4gDEIohiAMQhiIhCAOhSIMIAtCOYYgC0IHiIQgCoUiCyAJfCIKfCENIAtCF4YgC0IpiIQgCoUiCSAOfCIKIBAgFHwiHXwgEkIDfCAMQgWGIAxCO4iEIA2FfCILfCEOIAtCIYYgC0IfiIQgDoUiDCANIBN8IAlCJYYgCUIbiIQgCoUgGnwiC3wiCnwhDSAMQi6GIAxCEoiEIA2FIgkgC0IZhiALQieIhCAKhSILIA58Igp8IQwgCUIWhiAJQiqIhCAMhSIJIAtCDIYgC0I0iIQgCoUiCyANfCIKfCEPIAtCOoYgC0IGiIQgCoUiDiAMfCIKIBIgF3wiDHwgEUIEfCAJQiCGIAlCIIiEIA+FfCILfCENIAtCEIYgC0IwiIQgDYUiCSAPIBV8IA5CIIYgDkIgiIQgCoUgHXwiC3wiCnwhDiAJQjSGIAlCDIiEIA6FIgkgC0IOhiALQjKIhCAKhSILIA18Igp8IQ0gCUIohiAJQhiIhCANhSIJIAtCOYYgC0IHiIQgCoUiCyAOfCIKfCEPIAtCF4YgC0IpiIQgCoUiDiANfCIKIBEgFnwiC3wgE0IFfCAJQgWGIAlCO4iEIA+FfCIJfCENIAlCIYYgCUIfiIQgDYUiCSAPIBB8IA5CJYYgDkIbiIQgCoUgDHwiDHwiCnwhDiAJQi6GIAlCEoiEIA6FIgkgDEIZhiAMQieIhCAKhSIMIA18Igp8IQ0gCUIWhiAJQiqIhCANhSIJIAxCDIYgDEI0iIQgCoUiDCAOfCIKfCEPIAxCOoYgDEIGiIQgCoUiDiANfCIKIBMgFHwiDHwgFUIGfCAJQiCGIAlCIIiEIA+FfCIJfCENIAlCEIYgCUIwiIQgDYUiCSAPIBJ8IA5CIIYgDkIgiIQgCoUgC3wiC3wiCnwhDiAJQjSGIAlCDIiEIA6FIgkgC0IOhiALQjKIhCAKhSILIA18Igp8IQ0gCUIohiAJQhiIhCANhSIJIAtCOYYgC0IHiIQgCoUiCyAOfCIKfCEPIAtCF4YgC0IpiIQgCoUiDiANfCIKIBUgF3wiC3wgEEIHfCAJQgWGIAlCO4iEIA+FfCIJfCENIAlCIYYgCUIfiIQgDYUiCSAPIBF8IA5CJYYgDkIbiIQgCoUgDHwiDHwiCnwhDiAJQi6GIAlCEoiEIA6FIgkgDEIZhiAMQieIhCAKhSIMIA18Igp8IQ0gCUIWhiAJQiqIhCANhSIJIAxCDIYgDEI0iIQgCoUiDCAOfCIKfCEPIAxCOoYgDEIGiIQgCoUiDiANfCIKIBAgFnwiDHwgEkIIfCAJQiCGIAlCIIiEIA+FfCIJfCENIAlCEIYgCUIwiIQgDYUiCSAPIBN8IA5CIIYgDkIgiIQgCoUgC3wiC3wiCnwhDiAJQjSGIAlCDIiEIA6FIgkgC0IOhiALQjKIhCAKhSILIA18Igp8IQ0gCUIohiAJQhiIhCANhSIJIAtCOYYgC0IHiIQgCoUiCyAOfCIKfCEPIAtCF4YgC0IpiIQgCoUiDiANfCIKIBIgFHwiC3wgEUIJfCAJQgWGIAlCO4iEIA+FfCIJfCENIAlCIYYgCUIfiIQgDYUiCSAPIBV8IA5CJYYgDkIbiIQgCoUgDHwiDHwiCnwhDiAJQi6GIAlCEoiEIA6FIgkgDEIZhiAMQieIhCAKhSIMIA18Igp8IQ0gCUIWhiAJQiqIhCANhSIJIAxCDIYgDEI0iIQgCoUiDCAOfCIKfCEPIAxCOoYgDEIGiIQgCoUiDiANfCIKIBEgF3wiDHwgE0IKfCAJQiCGIAlCIIiEIA+FfCIJfCENIAlCEIYgCUIwiIQgDYUiCSAPIBB8IA5CIIYgDkIgiIQgCoUgC3wiC3wiCnwhDiAJQjSGIAlCDIiEIA6FIgkgC0IOhiALQjKIhCAKhSILIA18Igp8IQ0gCUIohiAJQhiIhCANhSIJIAtCOYYgC0IHiIQgCoUiCyAOfCIKfCEPIAtCF4YgC0IpiIQgCoUiDiANfCIKIBMgFnwiC3wgFUILfCAJQgWGIAlCO4iEIA+FfCIJfCENIAlCIYYgCUIfiIQgDYUiCSAPIBJ8IA5CJYYgDkIbiIQgCoUgDHwiDHwiCnwhDiAJQi6GIAlCEoiEIA6FIgkgDEIZhiAMQieIhCAKhSIMIA18Igp8IQ0gCUIWhiAJQiqIhCANhSIJIAxCDIYgDEI0iIQgCoUiDCAOfCIKfCEPIAxCOoYgDEIGiIQgCoUiDiANfCIKIBUgFHwiDHwgEEIMfCAJQiCGIAlCIIiEIA+FfCIJfCENIAlCEIYgCUIwiIQgDYUiCSAPIBF8IA5CIIYgDkIgiIQgCoUgC3wiC3wiCnwhDiAJQjSGIAlCDIiEIA6FIgkgC0IOhiALQjKIhCAKhSILIA18Igp8IQ0gCUIohiAJQhiIhCANhSIJIAtCOYYgC0IHiIQgCoUiCyAOfCIKfCEPIAtCF4YgC0IpiIQgCoUiDiANfCIKIBAgF3wiC3wgEkINfCAJQgWGIAlCO4iEIA+FfCIJfCENIAlCIYYgCUIfiIQgDYUiCSAPIBN8IA5CJYYgDkIbiIQgCoUgDHwiDHwiCnwhDiAJQi6GIAlCEoiEIA6FIgkgDEIZhiAMQieIhCAKhSIMIA18Igp8IQ8gCUIWhiAJQiqIhCAPhSINIAxCDIYgDEI0iIQgCoUiDCAOfCIKfCEOIAxCOoYgDEIGiIQgCoUiCSAPfCIKIBx8IBFCDnwgDUIghiANQiCIhCAOhXwiDHwhDSAMQhCGIAxCMIiEIA2FIgwgDiAVfCAJQiCGIAlCIIiEIAqFIAt8Igt8Igp8IQkgDEI0hiAMQgyIhCAJhSIMIAtCDoYgC0IyiIQgCoUiCyANfCIKfCENIAxCKIYgDEIYiIQgDYUiDCALQjmGIAtCB4iEIAqFIgsgCXwiCnwhDiALQheGIAtCKYiEIAqFIgkgDXwiCiAYfCATQg98IAxCBYYgDEI7iIQgDoV8Igt8IQ0gC0IhhiALQh+IhCANhSIMIA4gEHwgCUIlhiAJQhuIhCAKhSAcfCILfCIKfCEJIAxCLoYgDEISiIQgCYUiDCALQhmGIAtCJ4iEIAqFIgsgDXwiCnwhDSAMQhaGIAxCKoiEIA2FIgwgC0IMhiALQjSIhCAKhSILIAl8Igp8IQ4gC0I6hiALQgaIhCAKhSIJIA18IgogGXwgFUIQfCAMQiCGIAxCIIiEIA6FfCILfCENIAtCEIYgC0IwiIQgDYUiDCAOIBJ8IAlCIIYgCUIgiIQgCoUgGHwiC3wiCnwhCSAMQjSGIAxCDIiEIAmFIgwgC0IOhiALQjKIhCAKhSILIA18Igp8IQ4gDEIohiAMQhiIhCAOhSIMIAtCOYYgC0IHiIQgCoUiCyAJfCIKfCENIAtCF4YgC0IpiIQgCoUiCSAOfCIKIBp8IBBCEXwgDEIFhiAMQjuIhCANhXwiEHwhCyAQQiGGIBBCH4iEIAuFIgwgDSARfCAJQiWGIAlCG4iEIAqFIBl8IhB8IhF8IQogEEIZhiAQQieIhCARhSIRIAt8IQsgEUIMhiARQjSIhCALhSIRIAp8IRAgEUI6hiARQgaIhCAQhSINIAxCLoYgDEISiIQgCoUiCiALfCIRfCEJIAYgCkIWhiAKQiqIhCARhSIMIBB8IgsgE3wgIoUiEDcDACAHIA1CIIYgDUIgiIQgCYUgGnwgI4UiCjcDACAIIAkgHXwgIIUiETcDACADIBJCEnwgDEIghiAMQiCIhCALhXwgIYUiEzcDACAUQv//////////v3+DIRQgAkF/aiICBEAgACEBIAohEgwBCwsgBCAfIB4gG358NwMAIAUgFDcDAAvDGQJLfx1+IwYhBSMGQcADaiQGIAVBgAFqIgQgAEEIaiIYKQMAIlQ3AwAgBEEIaiIIIABBEGoiGSkDACJPNwMAIAOtIWsgBEEYaiEGIARBIGohGiAEQShqIRsgBEEwaiEcIARBOGohHSAEQcAAaiEeIARByABqIR8gBEHQAGohICAEQdgAaiEhIARB4ABqISIgBEHoAGohIyAEQfAAaiEkIARB+ABqISUgBEGAAWohJiAEQYgBaiEnIARBkAFqISggBEGYAWohKSAEQRBqISogBUEIaiEJIAVBEGohCiAFQRhqIQsgBUEgaiEMIAVBKGohDSAFQTBqIQ4gBUE4aiEPIAVBwABqIRAgBUHIAGohESAFQdAAaiESIAVB2ABqIRMgBUHgAGohFCAFQegAaiEVIAVB8ABqIRYgBUH4AGohFyABIQMgVCFjIABBGGoiKykDACFZIABBIGoiLCkDACFcIABBKGoiLSkDACFgIABBMGoiLikDACFdIABBOGoiLykDACFVIABBwABqIjApAwAhUiAAQcgAaiIxKQMAIVMgAEHQAGoiMikDACFQIABB2ABqIjMpAwAhWiAAQeAAaiI0KQMAIVEgAEHoAGoiNSkDACFWIABB8ABqIjYpAwAhVyAAQfgAaiI3KQMAIVsgAEGAAWoiOCkDACFYIABBiAFqIjkpAwAhVCAAQZABaiI6KQMAIV4DQCAEIGMga3wiXzcDACAGIFk3AwAgGiBcNwMAIBsgYDcDACAcIF03AwAgHSBVNwMAIB4gUjcDACAfIFM3AwAgICBQNwMAICEgWjcDACAiIFE3AwAgIyBWNwMAICQgVzcDACAlIFs3AwAgJiBYNwMAICcgVDcDACAoIF43AwAgKSBeQqK08M+q+8boG4UgWYUgXIUgYIUgXYUgVYUgUoUgU4UgUIUgWoUgUYUgVoUgV4UgW4UgWIUgVIU3AwAgKiBPIF+FNwMAQQAhAANAIAUgAEEDdkEDdGogAyAAQQFyai0AAK1CCIYgAyAAai0AAK2EIAMgAEECcmotAACtQhCGhCADIABBA3JqLQAArUIYhoQgAyAAQQRyai0AAK1CIIaEIAMgAEEFcmotAACtQiiGhCADIABBBnJqLQAArUIwhnwgAyAAQQdyai0AAK1COIZ8NwMAIABBCGoiAEGAAUkNAAsgVCAWKQMAfCBPfCFUIFggFSkDAHwgX3whWCBbIBQpAwB8IVsgVyATKQMAfCFXIFYgEikDAHwhViBRIBEpAwB8IVEgWiAQKQMAfCFaIFAgDykDAHwhUCBTIA4pAwB8IVMgUiANKQMAfCFSIFUgDCkDAHwhVSBdIAspAwB8IV0gYCAKKQMAfCFgIFwgCSkDAHwhXCBZIAUpAwB8IVlBASEBIF4gFykDAHwhTwNAIFxCGIYgXEIoiIQgXCBZfCJchSFjIF1CDYYgXUIziIQgXSBgfCJdhSFeIFJCCIYgUkI4iIQgUiBVfCJShSFVIFBCL4YgUEIRiIQgUCBTfCJQhSFTIFdCEYYgV0IviIQgVyBWfCJXhSJmIFB8IV8gT0IlhiBPQhuIhCBPIFR8Ik+FImAgUnwhUiBXIFN8IlAgU0IxhiBTQg+IhIUiYSBRQgiGIFFCOIiEIFEgWnwiVoUiYiBcfCJRfCFqIE8gVXwiVyBVQheGIFVCKYiEhSJTIFhCFoYgWEIqiIQgWCBbfCJPhSJZIF18Ilt8IVUgUiBPIF58IlggXkIShiBeQi6IhIUiT3wiVCBPQjOGIE9CDYiEhSFkIF8gViBjfCJPIGNCNIYgY0IMiISFIlp8IlYgWkINhiBaQjOIhIUhZSBgQjeGIGBCCYiEIFKFIlogWHwhYyBTQgSGIFNCPIiEIFWFIl4gZkIKhiBmQjaIhCBfhSJSIE98Ik98IVMgBiABQQN0aiI7KQMAIFpCIoYgWkIeiIQgY4UiXyBqfCJcfCFgIAYgAUEBaiIHQQN0aiI8KQMAIFlCE4YgWUItiIQgW4UiWiBXfCJYIGV8Il0gZUIvhiBlQhGIhIV8IWcgBiABQQJqIgBBA3RqIj0pAwAgUkI7hiBSQgWIhCBPhSJZIFV8Ild8IVUgBiABQQNqIj5BA3RqIj8pAwAgZEIQhiBkQjCIhCBkIGJCJoYgYkIaiIQgUYUiUSBQfCJPfCJbhXwhaCAGIAFBBGpBA3RqIkApAwAgVCBRQhGGIFFCL4iEIE+FIlB8IlR8IVIgBiABQQVqQQN0aiJBKQMAIF5CHIYgXkIkiIQgU4V8IWkgBiABQQZqQQN0aiJCKQMAIFpCKYYgWkIXiIQgWIUiUSBWfCJYfCFaIAYgAUEHakEDdGoiQykDACBjIGFCIYYgYUIfiIQgaoUiVnwiTyBWQhmGIFZCJ4iEhXwhZCAGIAFBCGpBA3RqIkQpAwAgU3whUyAGIAFBCWpBA3RqIkUpAwAgVCBQQimGIFBCF4iEhXwhZSAGIAFBCmpBA3RqIkYpAwAgW3whVCAGIAFBC2pBA3RqIkcpAwAgWUIUhiBZQiyIhCBXhXwhWSAGIAFBDGpBA3RqIkgpAwAgT3whUCAGIAFBDWpBA3RqIkkpAwAgUUIwhiBRQhCIhCBYhXwgBCABQQN0aiJKKQMAfCFmIAYgAUEOakEDdGoiSykDACFRIAQgB0EDdGoiTCkDACFWIF9CBYYgX0I7iIQgXIUgAa0ianwgBiABQQ9qQQN0aiJNKQMAfCFiIAYgAUEQakEDdGoiTiAGIAFBf2oiB0EDdGopAwA3AwAgBCAAQQN0aiAEIAdBA3RqKQMAImM3AwAgZ0IphiBnQheIhCBgIGd8IleFIWEgaEIJhiBoQjeIhCBVIGh8IluFIV4gaUIlhiBpQhuIhCBSIGl8IliFIV8gZEIfhiBkQiGIhCBaIGR8Ik+FIVUgWUIvhiBZQhGIhCBUIFl8IlSFIlkgT3whXCBiQh6GIGJCIoiEIFEgXXwgVnwgYnwiT4UiYCBYfCFSIFQgVXwiWiBVQgSGIFVCPIiEhSJoIGVCDIYgZUI0iIQgUyBlfCJWhSJiIFd8IlF8IWkgTyBffCJXIF9CKoYgX0IWiISFIlMgZkIshiBmQhSIhCBQIGZ8Ik+FIl0gW3wiW3whVSBSIE8gXnwiVCBeQjWGIF5CC4iEhSJPfCJYIE9CL4YgT0IRiISFIWcgXCBWIGF8Ik8gYUIphiBhQheIhIUiUHwiViBQQi6GIFBCEoiEhSFhIGBCM4YgYEINiIQgUoUiUCBUfCFkIFNCLIYgU0IUiIQgVYUiUiBZQjiGIFlCCIiEIFyFIlMgT3wiT3whZSBQQhOGIFBCLYiEIGSFImYgaXwiXiA8KQMAfCFZIF1CIoYgXUIeiIQgW4UiUCBXfCJUIGF8Il8gYUIXhiBhQimIhIUgPSkDAHwhXCBVIFNCLIYgU0IUiIQgT4UiYXwiVyA/KQMAfCFgIGdCJYYgZ0IbiIQgZyBiQhCGIGJCMIiEIFGFIlEgWnwiT3wiW4UgQCkDAHwhXSBBKQMAIFggUUIZhiBRQieIhCBPhSJRfCJYfCFVIFJCH4YgUkIhiIQgZYUgQikDAHwhUiBDKQMAIFBCKoYgUEIWiIQgVIUiYiBWfCJUfCFTIEQpAwAgZCBoQh+GIGhCIYiEIGmFIlZ8Ik8gVkIUhiBWQiyIhIV8IVAgRSkDACBlfCFaIEYpAwAgWCBRQjSGIFFCDIiEhXwhUSBHKQMAIFt8IVYgSCkDACBXIGFCMIYgYUIQiISFfCFXIEkpAwAgT3whWyBLKQMAIGJCI4YgYkIdiIQgVIV8IEwpAwB8IVggXyBjfCBNKQMAfCFUIGpCAXwgZkIJhiBmQjeIhCBehXwgTikDAHwhTyAGIAFBEWpBA3RqIDspAwA3AwAgBCA+QQN0aiBKKQMANwMAIABBFUkEQCAAIQEMAQsLICsgBSkDACBZhSJZNwMAICwgCSkDACBchSJcNwMAIC0gCikDACBghSJgNwMAIC4gCykDACBdhSJdNwMAIC8gDCkDACBVhSJVNwMAIDAgDSkDACBShSJSNwMAIDEgDikDACBThSJTNwMAIDIgDykDACBQhSJQNwMAIDMgECkDACBahSJaNwMAIDQgESkDACBRhSJRNwMAIDUgEikDACBWhSJWNwMAIDYgEykDACBXhSJXNwMAIDcgFCkDACBbhSJbNwMAIDggFSkDACBYhSJYNwMAIDkgFikDACBUhSJUNwMAIDogFykDACBPhSJPNwMAIAggCCkDAEL//////////79/gyJfNwMAIAJBf2oiAgRAIANBgAFqIQMgBCkDACFjIE8hXiBfIU8MAQsLIBggBCkDADcDACAZIF83AwAgBSQGC6ALAht/HX4gAEEoaiEBIABBCGohAiAAQRBqIQMgAEEYaiEEIABBIGohBUEAIQsgACkDACEdIABB0ABqIgwpAwAhHCAAQfgAaiINKQMAIR8gAEGgAWoiDikDACEeIABBMGoiDykDACEjIABB2ABqIhApAwAhJCAAQYABaiIRKQMAISUgAEGoAWoiEikDACEhIABBOGoiEykDACEqIABB4ABqIhQpAwAhKyAAQYgBaiIVKQMAISwgAEGwAWoiFikDACEiIABBwABqIhcpAwAhLSAAQegAaiIYKQMAIS4gAEGQAWoiGSkDACEvIABBuAFqIgYpAwAhICAAQcgAaiIaKQMAITAgAEHwAGoiBykDACEpIABBmAFqIggpAwAhMiAAQcABaiIJKQMAISYDQCABKQMAIjQgHYUgHIUgH4UgHoUhJyAqIAMpAwAiNYUgK4UgLIUgIoUhKCAtIAQpAwAiNoUgLoUgL4UgIIUhMSAAICMgAikDACI3hSAkhSAlhSAhhSIzQgGGIDNCP4iEIDAgBSkDACI4hSAphSAyhSAmhSIphSIgIB2FNwMAIAEgNCAghTcDACAMIBwgIIU3AwAgDSAfICCFNwMAIA4gHiAghTcDACACIChCAYYgKEI/iIQgJ4UiHCA3hSIdNwMAIA8gIyAchTcDACAQICQgHIU3AwAgESAlIByFNwMAIBIgISAchTcDACADIDFCAYYgMUI/iIQgM4UiHCA1hTcDACATICogHIU3AwAgFCArIByFNwMAIBUgLCAchTcDACAWICIgHIU3AwAgBCApQgGGIClCP4iEICiFIhwgNoU3AwAgFyAtIByFNwMAIBggLiAchTcDACAZIC8gHIU3AwAgBiAGKQMAIByFNwMAIAUgJ0IBhiAnQj+IhCAxhSIcIDiFNwMAIBogMCAchTcDACAHIAcpAwAgHIU3AwAgCCAIKQMAIByFNwMAIAkgCSkDACAchTcDAEEAIQoDQCAAIApBAnRB8CpqKAIAQQN0aiIbKQMAIRwgGyAdQcAAIApBAnRBkCpqKAIAIhtrrYggHSAbrYaENwMAIApBAWoiCkEYRwRAIBwhHQwBCwsgBCkDACEdIAUpAwAhHCAAIAMpAwAiHyACKQMAIh5Cf4WDIAApAwAiI4U3AwAgAiAdIB9Cf4WDIB6FNwMAIAMgHCAdQn+FgyAfhTcDACAEICMgHEJ/hYMgHYU3AwAgBSAeICNCf4WDIByFNwMAIBcpAwAhHSAaKQMAIRwgASATKQMAIh8gDykDACIeQn+FgyABKQMAIiSFNwMAIA8gHSAfQn+FgyAehSIjNwMAIBMgHCAdQn+FgyAfhSIqNwMAIBcgJCAcQn+FgyAdhSItNwMAIBogHiAkQn+FgyAchSIwNwMAIBgpAwAhHSAHKQMAIR8gDCAUKQMAIh4gECkDACIlQn+FgyAMKQMAIiGFIhw3AwAgECAdIB5Cf4WDICWFIiQ3AwAgFCAfIB1Cf4WDIB6FIis3AwAgGCAhIB9Cf4WDIB2FIi43AwAgByAlICFCf4WDIB+FIik3AwAgGSkDACEdIAgpAwAhHiANIBUpAwAiISARKQMAIiJCf4WDIA0pAwAiIIUiHzcDACARIB0gIUJ/hYMgIoUiJTcDACAVIB4gHUJ/hYMgIYUiLDcDACAZICAgHkJ/hYMgHYUiLzcDACAIICIgIEJ/hYMgHoUiMjcDACAGKQMAIR0gCSkDACEmIA4gFikDACIiIBIpAwAiJ0J/hYMgDikDACIohSIeNwMAIBIgHSAiQn+FgyAnhSIhNwMAIBYgJiAdQn+FgyAihSIiNwMAIAYgKCAmQn+FgyAdhSIgNwMAIAkgJyAoQn+FgyAmhSImNwMAIAAgACkDACALQQN0QYAoaikDAIUiHTcDACALQQFqIgtBGEcNAAsLqgIAIAAgAS0ABUECdEGAEGooAgAgAS0AAEECdEGACGooAgBzIAEtAApBAnRBgBhqKAIAcyABLQAPQQJ0QYAgaigCAHMgAigCAHM2AgAgACABLQAEQQJ0QYAIaigCACABLQADQQJ0QYAgaigCAHMgAS0ACUECdEGAEGooAgBzIAEtAA5BAnRBgBhqKAIAcyACKAIEczYCBCAAIAEtAAdBAnRBgCBqKAIAIAEtAAJBAnRBgBhqKAIAcyABLQAIQQJ0QYAIaigCAHMgAS0ADUECdEGAEGooAgBzIAIoAghzNgIIIAAgAS0ABkECdEGAGGooAgAgAS0AAUECdEGAEGooAgBzIAEtAAtBAnRBgCBqKAIAcyABLQAMQQJ0QYAIaigCAHMgAigCDHM2AgwL4QkCBH8CfiMGIQMjBkHgAWokBiADQQhqIgVCADcDCCADQYACNgIAIANBIGoiBEH0wAApAAA3AAAgBEH8wAApAAA3AAggBEGEwQApAAA3ABAgBEGMwQApAAA3ABggBEGUwQApAAA3ACAgBEGcwQApAAA3ACggBEGkwQApAAA3ADAgBEGswQApAAA3ADggBEG0wQApAAA3AEAgBEG8wQApAAA3AEggBEHEwQApAAA3AFAgBEHMwQApAAA3AFggBEHUwQApAAA3AGAgBEHcwQApAAA3AGggBEHkwQApAAA3AHAgBEHswQApAAA3AHggBSABQQN0IgGtIgc3AwAgAUH/A0sEfyADQaABaiEBQgAhCANAIAEgACAIp2oiBCkAADcAACABIAQpAAg3AAggASAEKQAQNwAQIAEgBCkAGDcAGCABIAQpACA3ACAgASAEKQAoNwAoIAEgBCkAMDcAMCABIAQpADg3ADggAxAbIAhCwAB8IQggB0KAfHwiB0L/A1YNAAsgCKcFQQALIQEgA0EQaiEEIAdCAFIEQCADQaABaiEGIAAgAWohACAHQgOIQj+DIQggB0IHg0IAUQR/IAYgACAIpxAQBSAGIAAgCEIBfKcQEAsaIAQgBzcDAAsgBSkDACIHQv8DgyIIQgBRBEAgA0GgAWoiAEIANwMAIABCADcDCCAAQgA3AxAgAEIANwMYIABCADcDICAAQgA3AyggAEIANwMwIABCADcDOCAAQYB/OgAAIAMgBzwA3wEgAyAHQgiIPADeASADIAdCEIg8AN0BIAMgB0IYiDwA3AEgAyAHQiCIPADbASADIAdCKIg8ANoBIAMgB0IwiDwA2QEgAyAHQjiIPADYASADEBsFIAhCA4ghCCAEKQMAQgeDQgBRBEAgAyAIpyIAQaABampBAEHAACAAaxAOGgUgCEIBfKciAEHAAEkEQCADIABBoAFqakEAQcAAIABrEA4aCwsgA0GgAWogB0IDiKdBP3FqIgAgAC0AAEEBIAenQQdxQQdzdHI6AAAgAxAbIANBoAFqIgBCADcDACAAQgA3AwggAEIANwMQIABCADcDGCAAQgA3AyAgAEIANwMoIABCADcDMCAAQgA3AzggAyAFKQMAIgc8AN8BIAMgB0IIiDwA3gEgAyAHQhCIPADdASADIAdCGIg8ANwBIAMgB0IgiDwA2wEgAyAHQiiIPADaASADIAdCMIg8ANkBIAMgB0I4iDwA2AEgAxAbCwJAAkACQAJAAkAgAygCAEGgfmoiAEEFdiAAQRt0cg4KAAEEBAQCBAQEAwQLIAIgA0GEAWoiACkAADcAACACIAApAAg3AAggAiAAKQAQNwAQIAIgACgAGDYAGCADJAYPCyACIANBgAFqIgApAAA3AAAgAiAAKQAINwAIIAIgACkAEDcAECACIAApABg3ABggAyQGDwsgAiADQfAAaiIAKQAANwAAIAIgACkACDcACCACIAApABA3ABAgAiAAKQAYNwAYIAIgACkAIDcAICACIAApACg3ACggAyQGDwsgAiADQeAAaiIAKQAANwAAIAIgACkACDcACCACIAApABA3ABAgAiAAKQAYNwAYIAIgACkAIDcAICACIAApACg3ACggAiAAKQAwNwAwIAIgACkAODcAOCADJAYPCyADJAYLEwAgASACIAMgAEEHcUEEahEAAAsQACABIAIgAyAAQQNxEQEAC10BAX8gASAASCAAIAEgAmpIcQRAIAEgAmohASAAIgMgAmohAANAIAJBAEoEQCACQQFrIQIgAEEBayIAIAFBAWsiASwAADoAAAwBCwsgAyEABSAAIAEgAhAQGgsgAAvjCwEJfyMGIQMjBkHQAmokBiADQgA3AgAgA0IANwIIIANCADcCECADQgA3AhggA0IANwIgIANCADcCKCADQgA3AjAgA0EANgI4IANBPGoiC0GAgAQ2AgAgA0GIAWoiBUEANgIAIANBwABqIgZBADYCACADQcQAaiIEQQA2AgAgA0GMAWoiB0EANgIAIAMgACABQf////8BcSIIEB0gAUHA////AXEiASAISQRAA0AgACABaiwAACEJIAUgBSgCACIKQQFqNgIAIANByABqIApqIAk6AAAgAUEBaiIBIAhHDQALCyAHKAIAIgEEQCADIAUoAgBqQccAaiIAIAAtAABBASABdEF/akEIIAFrdHE6AAAgAyAFKAIAakHHAGoiACAALQAAQQFBByAHKAIAa3RzOgAAIAdBADYCAAUgBSAFKAIAIgBBAWo2AgAgA0HIAGogAGpBgH86AAALAkACQCAFKAIAIgBBOEoEQCAAQcAASARAA0AgBSAAQQFqNgIAIANByABqIABqQQA6AAAgBSgCACIAQcAASA0ACwsgAyADQcgAakHAABAdIAVBADYCAEEAIQAMAQUgAEE4Rw0BCwwBCwNAIAUgAEEBajYCACADQcgAaiAAakEAOgAAIAUoAgAiAEE4SA0ACwsgBiAGKAIAQQFqIgE2AgAgAUUEQCAEIAQoAgBBAWo2AgALIAVBwAA2AgBBwAAhAANAIAUgAEF/aiIANgIAIANByABqIABqIAE6AAAgAUEIdiEBIAUoAgAiAEE8Sg0ACyAGIAE2AgAgAEE4SgRAIAQoAgAhAQNAIAUgAEF/aiIANgIA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CigCAEUEQEF/IQELIAggCTYCACAHQQA2AgAgDEEANgIAIAtBADYCACAKQQA2AgALCyAAIAAoAgAiACAGQSBxcjYCACAAQSBxBEBBfyEBCwsgAiQGIAELEAAjB0UEQCAAJAcgASQICwvEAgEEfyMGIQIjBkGAAWokBiACQdA/KQIANwIAIAJB2D8pAgA3AgggAkHgPykCADcCECACQeg/KQIANwIYIAJB8D8pAgA3AiAgAkH4PykCADcCKCACQYDAACkCADcCMCACQYjAACkCADcCOCACQZDAACkCADcCQCACQZjAACkCADcCSCACQaDAACkCADcCUCACQajAACkCADcCWCACQbDAACkCADcCYCACQbjAACkCADcCaCACQcDAACkCADcCcCACQcjAACgCADYCeCACQX4gAGsiA0H/////B0kEfyADBUH/////ByIDCzYCMCACQRRqIgQgADYCACACIAA2AiwgAkEQaiIFIAAgA2oiADYCACACIAA2AhwgAiABEE4hACADBEAgBCgCACIBIAEgBSgCAEZBH3RBH3VqQQA6AAALIAIkBiAAC14BAn8gACwAACICRSACIAEsAAAiA0dyBEAgAyEAIAIhAQUDQCAAQQFqIgAsAAAiAkUgAiABQQFqIgEsAAAiA0dyBEAgAyEAIAIhAQUMAQsLCyABQf8BcSAAQf8BcWsL5QoCCH8FfgJ+IAFBJEsEfkGcPkEWNgIAQgAFIABBBGohBCAAQeQAaiEFA0AgBCgCACICIAUoAgBJBH8gBCACQQFqNgIAIAItAAAFIAAQCQsiAiIDQSBGIANBd2pBBUlyDQALAkACQAJAIAJBK2sOAwABAAELIAJBLUZBH3RBH3UhCCAEKAIAIgIgBSgCAEkEQCAEIAJBAWo2AgAgAi0AACECDAIFIAAQCSECDAILAAtBACEICyABRSEDAkACQAJAAkAgAUEQckEQRiACQTBGcQRAIAQoAgAiAiAFKAIASQR/IAQgAkEBajYCACACLQAABSAAEAkLIgJBIHJB+ABHBEAgAwRAQQghAQwEBQwDCwALIAQoAgAiASAFKAIASQR/IAQgAUEBajYCACABLQAABSAAEAkLIgJB6tAAai0AAEEPSgRAIAUoAgAEQCAEIAQoAgBBf2o2AgALIABBABARQgAMBwVBECEBDAMLAAUgAkHq0ABqLQAA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kKWmlXpzIAQoAgBzNgIAIABBf2ohAiAABEAgAiEADAELCyAGIANBJ2o2AgAgAUEAIAYQGCAQIANBKGo2AgAgAUECakEAIBAQGCAFIANBKWo2AgAgAUEEakEAIAUQGCAIIANBKmo2AgAgAUEGakEAIAgQGEGQg4ABEBIiBEGAg4ABaiIGEC02AgAgCEEAQcgBEA4aIAUgAykAADcAACAFIAMpAAg3AAggBSADKQAQNwAQIAUgAykAGDcAGCAFIAMpACA3ACAgBSADKQAoNwAoIAUgAykAMDcAMCAFIAMpADg3ADggBSADKQBANwBAIAUgAygASDYASCAFQQE6AEwgBUHNAGoiAEIANwAAIABCADcACCAAQgA3ABAgAEIANwAYIABCADcAICAAQgA3ACggAEIANwAwIABBADsAOCAFQYB/OgCHAUEAIQBCACEaA0AgCCAAQQN0aiAaIAUgAEEDdGopAACFNwMAIABBAWohASAAQRBHBEAgCCABIgBBA3RqKQMAIRoMAQsLIAgQMSAEQYCAgAFqIg0gCEHIARAQGiAEQdCBgAFqIgIgBEHAgIABaiIDKQMANwMAIAIgAykDCDcDCCACIAMpAxA3AxAgAiADKQMYNwMYIAIgAykDIDcDICACIAMpAyg3AyggAiADKQMwNwMwIAIgAykDODcDOCACIAMpA0A3A0AgAiADKQNINwNIIAIgAykDUDcDUCACIAMpA1g3A1ggAiADKQNgNwNgIAIgAykDaDcDaCACIAMpA3A3A3AgAiADKQN4NwN4IAYoAgAgDRAuIARB4IGAAWohESAEQfCBgAFqIRIgBEGAgoABaiETIARBkIKAAWohFCAEQaCCgAFqIRUgBEGwgoABaiEWIARBwIKAAWohF0EAIQADQEEAIQEDQCACIAYoAgAoAgAoAgwgAUEEdGoiBRANIBEgBRANIBIgBRANIBMgBRANIBQgBRANIBUgBRANIBYgBRANIBcgBRANIAFBAWoiAUEKRw0ACyAEIABqIgEgAikAADcAACABIAIpAAg3AAggASACKQAQNwAQIAEgAikAGDcAGCABIAIpACA3ACAgASACKQAoNwAoIAEgAikAMDcAMCABIAIpADg3ADggASACKQBANwBAIAEgAikASDcASCABIAIpAFA3AFAgASACKQBYNwBYIAEgAikAYDcAYCABIAIpAGg3AGggASACKQBwNwBwIAEgAikAeDcAeCAAQYABaiIAQYCAgAFJDQALIARB0IKAAWoiASAEQaCAgAFqIhgpAwAgDSkDAIUiGjcDACAEQeCCgAFqIgUgBEGwgIABaikDACAEQZCAgAFqKQMAhTcDACAEQdiCgAFqIgkgBEGogIABaikDACAEQYiAgAFqKQMAhTcDACAEQeiCgAFqIg4gBEG4gIABaikDACAEQZiAgAFqKQMAhTcDACAEQfCCgAFqIQogBEH4goABaiEPQQAhAANAIAogBCAap0Hw//8AcWogARAyIAQgASkDAKdB8P//AHFqIgcgBSkDACAKKQMAhTcDACAHIA4pAwAgDykDAIU3AwggBCAKKQMAIhqnQfD//wBxaiIHKQMAIh1C/////w+DIhsgGkL/////D4MiHH4iHkIgiCAbIBpCIIgiG358Ih9C/////w+DIB1CIIgiICAcfnwiHEIghiAeQv////8Pg4QgCSkDAHwhGiABIAEpAwAgICAbfnwgH0IgiHwgHEIgiHwiGyAdhTcDACAJIBogB0EIaiILKQMAhTcDACAHIBs3AwAgCyAaNwMAIAUgBCABKQMAp0Hw//8AcWogARAyIAQgASkDAKdB8P//AHFqIgcgCikDACAFKQMAhTcDACAHIA8pAwAgDikDAIU3AwggBCAFKQMAIhqnQfD//wBxaiIHKQMAIh1C/////w+DIhsgGkL/////D4MiHH4iHkIgiCAbIBpCIIgiG358Ih9C/////w+DIB1CIIgiICAcfnwiHEIghiAeQv////8Pg4QgCSkDAHwhGiABIAEpAwAgICAbfnwgH0IgiHwgHEIgiHwiGyAdhTcDACAJIBogB0EIaiILKQMAhTcDACAHIBs3AwAgCyAaNwMAIABBAWoiAEGAgBBHBEAgASkDACEaDAELCyACIAMpAwA3AwAgAiADKQMINwMIIAIgAykDEDcDECACIAMpAxg3AxggAiADKQMgNwMgIAIgAykDKDcDKCACIAMpAzA3AzAgAiADKQM4NwM4IAIgAykDQDcDQCACIAMpA0g3A0ggAiADKQNQNwNQIAIgAykDWDcDWCACIAMpA2A3A2AgAiADKQNoNwNoIAIgAykDcDcDcCACIAMpA3g3A3ggBigCACIBBEAgASgCACIABEAgACgCBCIFBEAgBRAPIAEo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nuH4mBFp2Y6Umx6H6c5VKN+MoYkNv+ZCaEGZLQ+wVLsWAQIECBAgQIAbNgABAgMEBQYHCAkKCwwNDg8OCgQICQ8NBgEMAAILBwUDCwgMAAUCDw0KDgMGBwEJBAcJAwENDAsOAgYFCgQADwgJAAUHAgQKDw4BCwwGCAMNAgwGCgALCAMEDQcFDw4BCQwFAQ8ODQQKAAcGAwkCCAsNCwcODAEDCQUADwQIBgIKBg8OCQsDAAgMAg0HAQQKBQoCCAQHBgEFDwsJDgMMDQAAAQIDBAUGBwgJCgsMDQ4PDgoECAkPDQYBDAACCwcFAwsIDAAFAg8NCg4DBgcBCQQHCQMBDQwLDgIGBQoEAA8IgABB6dAAC6IC/////////////////////////////////////////////////////////////////wABAgMEBQYHCAn/////////CgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiP///////8KCwwNDg8QERITFBUWFxgZGhscHR4fICEiI/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAQIEBwMGBQARAAoAERERAAAAAAUAAAAAAAAJAAAAAAsAQZPTAAshEQAPChEREQMKBwABEwkLCwAACQYLAAALAAYRAAAAERERAEHE0wALAQsAQc3TAAsYEQAKChEREQAKAAACAAkLAAAACQALAAALAEH+0wALAQwAQYrUAAsVDAAAAAAMAAAAAAkMAAAAAAAMAAAMAEG41AALAQ4AQcTUAAsVDQAAAAQNAAAAAAkOAAAAAAAOAAAOAEHy1AALARAAQf7UAAseDwAAAAAPAAAAAAkQAAAAAAAQAAAQAAASAAAAEhISAEG11QALDhIAAAASEhIAAAAAAAAJAEHm1QALAQsAQfLVAAsVCgAAAAAKAAAAAAkLAAAAAAALAAALAEGg1gALAQwAQazWAAvJDwwAAAAADAAAAAAJDAAAAAAADAAADAAALSsgICAwWDB4AChudWxsKQAtMFgrMFggMFgtMHgrMHggMHgAaW5mAElORgBOQU4AMDEyMzQ1Njc4OUFCQ0RFRi4AVCEiGQ0BAgMRSxwMEAQLHRIeJ2hub3BxYiAFBg8TFBUaCBYHKCQXGAkKDhsfJSODgn0mKis8PT4/Q0dKTVhZWltcXV5fYGFjZGVmZ2lqa2xyc3R5ent8AElsbGVnYWwgYnl0ZSBzZXF1ZW5jZQBEb21haW4gZXJyb3IAUmVzdWx0IG5vdCByZXByZXNlbnRhYmxlAE5vdCBhIHR0eQBQZXJtaXNzaW9uIGRlbmllZABPcGVyYXRpb24gbm90IHBlcm1pdHRlZABObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5AE5vIHN1Y2ggcHJvY2VzcwBGaWxlIGV4aXN0cwBWYWx1ZSB0b28gbGFyZ2UgZm9yIGRhdGEgdHlwZQBObyBzcGFjZSBsZWZ0IG9uIGRldmljZQBPdXQgb2YgbWVtb3J5AFJlc291cmNlIGJ1c3kASW50ZXJydXB0ZWQgc3lzdGVtIGNhbGwAUmVzb3VyY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUASW52YWxpZCBzZWVrAENyb3NzLWRldmljZSBsaW5rAFJlYWQtb25seSBmaWxlIHN5c3RlbQBEaXJlY3Rvcnkgbm90IGVtcHR5AENvbm5lY3Rpb24gcmVzZXQgYnkgcGVlcgBPcGVyYXRpb24gdGltZWQgb3V0AENvbm5lY3Rpb24gcmVmdXNlZABIb3N0IGlzIGRvd24ASG9zdCBpcyB1bnJlYWNoYWJsZQBBZGRyZXNzIGluIHVzZQBCcm9rZW4gcGlwZQBJL08gZXJyb3IATm8gc3VjaCBkZXZpY2Ugb3IgYWRkcmVzcwBCbG9jayBkZXZpY2UgcmVxdWlyZWQATm8gc3VjaCBkZXZpY2UATm90IGEgZGlyZWN0b3J5AElzIGEgZGlyZWN0b3J5AFRleHQgZmlsZSBidXN5AEV4ZWMgZm9ybWF0IGVycm9yAEludmFsaWQgYXJndW1lbnQAQXJndW1lbnQgbGlzdCB0b28gbG9uZwBTeW1ib2xpYyBsaW5rIGxvb3AARmlsZW5hbWUgdG9vIGxvbmcAVG9vIG1hbnkgb3BlbiBmaWxlcyBpbiBzeXN0ZW0ATm8gZmlsZSBkZXNjcmlwdG9ycyBhdmFpbGFibGUAQmFkIGZpbGUgZGVzY3JpcHRvcgBObyBjaGlsZCBwcm9jZXNzAEJhZCBhZGRyZXNzAEZpbGUgdG9vIGxhcmdlAFRvbyBtYW55IGxpbmtzAE5vIGxvY2tzIGF2YWlsYWJsZQBSZXNvdXJjZSBkZWFkbG9jayB3b3VsZCBvY2N1cgBTdGF0ZSBub3QgcmVjb3ZlcmFibGUAUHJldmlvdXMgb3duZXIgZGllZABPcGVyYXRpb24gY2FuY2VsZWQARnVuY3Rpb24gbm90IGltcGxlbWVudGVkAE5vIG1lc3NhZ2Ugb2YgZGVzaXJlZCB0eXBlAElkZW50aWZpZXIgcmVtb3ZlZABEZXZpY2Ugbm90IGEgc3RyZWFtAE5vIGRhdGEgYXZhaWxhYmxlAERldmljZSB0aW1lb3V0AE91dCBvZiBzdHJlYW1zIHJlc291cmNlcwBMaW5rIGhhcyBiZWVuIHNldmVyZWQAUHJvdG9jb2wgZXJyb3IAQmFkIG1lc3NhZ2UARmlsZSBkZXNjcmlwdG9yIGluIGJhZCBzdGF0ZQBOb3QgYSBzb2NrZXQARGVzdGluYXRpb24gYWRkcmVzcyByZXF1aXJlZABNZXNzYWdlIHRvbyBsYXJnZQBQcm90b2NvbCB3cm9uZyB0eXBlIGZvciBzb2NrZXQAUHJvdG9jb2wgbm90IGF2YWlsYWJsZQBQcm90b2NvbCBub3Qgc3VwcG9ydGVkAFNvY2tldCB0eXBlIG5vdCBzdXBwb3J0ZWQATm90IHN1cHBvcnRlZABQcm90b2NvbCBmYW1pbHkgbm90IHN1cHBvcnRlZABBZGRyZXNzIGZhbWlseSBub3Qgc3VwcG9ydGVkIGJ5IHByb3RvY29sAEFkZHJlc3Mgbm90IGF2YWlsYWJsZQBOZXR3b3JrIGlzIGRvd24ATmV0d29yayB1bnJlYWNoYWJsZQBDb25uZWN0aW9uIHJlc2V0IGJ5IG5ldHdvcmsAQ29ubmVjdGlvbiBhYm9ydGVkAE5vIGJ1ZmZlciBzcGFjZSBhdmFpbGFibGUAU29ja2V0IGlzIGNvbm5lY3RlZABTb2NrZXQgbm90IGNvbm5lY3RlZABDYW5ub3Qgc2VuZCBhZnRlciBzb2NrZXQgc2h1dGRvd24AT3BlcmF0aW9uIGFscmVhZHkgaW4gcHJvZ3Jlc3MAT3BlcmF0aW9uIGluIHByb2dyZXNzAFN0YWxlIGZpbGUgaGFuZGxlAFJlbW90ZSBJL08gZXJyb3IAUXVvdGEgZXhjZWVkZWQATm8gbWVkaXVtIGZvdW5kAFdyb25nIG1lZGl1bSB0eXBlAE5vIGVycm9yIGluZm9ybWF0aW9uAABpbmZpbml0eQBuYW4=";
    var asmjsCodeFile = "";
    if (typeof Module["locateFile"] === "function") {
        if (!isDataURI(wasmTextFile)) {
            wasmTextFile = Module["locateFile"](wasmTextFile)
        }
        if (!isDataURI(wasmBinaryFile)) {
            wasmBinaryFile = Module["locateFile"](wasmBinaryFile)
        }
        if (!isDataURI(asmjsCodeFile)) {
            asmjsCodeFile = Module["locateFile"](asmjsCodeFile)
        }
    }
    var wasmPageSize = 64 * 1024;
    var info = {
        "global": null,
        "env": null,
        "asm2wasm": {
            "f64-rem": (function(x, y) {
                return x % y
            }),
            "debugger": (function() {
                debugger
            })
        },
        "parent": Module
    };
    var exports = null;

    function mergeMemory(newBuffer) {
        var oldBuffer = Module["buffer"];
        if (newBuffer.byteLength < oldBuffer.byteLength) {
            Module["printErr"]("the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here")
        }
        var oldView = new Int8Array(oldBuffer);
        var newView = new Int8Array(newBuffer);
        newView.set(oldView);
        updateGlobalBuffer(newBuffer);
        updateGlobalBufferViews()
    }

    function fixImports(imports) {
        return imports
    }

    function getBinary() {
        try {
            if (Module["wasmBinary"]) {
                return new Uint8Array(Module["wasmBinary"])
            }
            var binary = tryParseAsDataURI(wasmBinaryFile);
            if (binary) {
                return binary
            }
            if (Module["readBinary"]) {
                return Module["readBinary"](wasmBinaryFile)
            } else {
                throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)"
            }
        } catch (err) {
            abort(err)
        }
    }

    function getBinaryPromise() {
        if (!Module["wasmBinary"] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
            return fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }).then((function(response) {
                if (!response["ok"]) {
                    throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
                }
                return response["arrayBuffer"]()
            })).catch((function() {
                return getBinary()
            }))
        }
        return new Promise((function(resolve, reject) {
            resolve(getBinary())
        }))
    }

    function doNativeWasm(global, env, providedBuffer) {
        if (typeof WebAssembly !== "object") {
            Module["printErr"]("no native wasm support detected");
            return false
        }
        if (!(Module["wasmMemory"] instanceof WebAssembly.Memory)) {
            Module["printErr"]("no native wasm Memory in use");
            return false
        }
        env["memory"] = Module["wasmMemory"];
        info["global"] = {
            "NaN": NaN,
            "Infinity": Infinity
        };
        info["global.Math"] = Math;
        info["env"] = env;

        function receiveInstance(instance, module) {
            exports = instance.exports;
            if (exports.memory) mergeMemory(exports.memory);
            Module["asm"] = exports;
            Module["usingWasm"] = true;
            removeRunDependency("wasm-instantiate")
        }
        addRunDependency("wasm-instantiate");
        if (Module["instantiateWasm"]) {
            try {
                return Module["instantiateWasm"](info, receiveInstance)
            } catch (e) {
                Module["printErr"]("Module.instantiateWasm callback failed with error: " + e);
                return false
            }
        }

        function receiveInstantiatedSource(output) {
            receiveInstance(output["instance"], output["module"])
        }

        function instantiateArrayBuffer(receiver) {
            getBinaryPromise().then((function(binary) {
                return WebAssembly.instantiate(binary, info)
            })).then(receiver).catch((function(reason) {
                Module["printErr"]("failed to asynchronously prepare wasm: " + reason);
                abort(reason)
            }))
        }
        if (!Module["wasmBinary"] && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
            WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }), info).then(receiveInstantiatedSource).catch((function(reason) {
                Module["printErr"]("wasm streaming compile failed: " + reason);
                Module["printErr"]("falling back to ArrayBuffer instantiation");
                instantiateArrayBuffer(receiveInstantiatedSource)
            }))
        } else {
            instantiateArrayBuffer(receiveInstantiatedSource)
        }
        return {}
    }
    Module["asmPreload"] = Module["asm"];
    var asmjsReallocBuffer = Module["reallocBuffer"];
    var wasmReallocBuffer = (function(size) {
        var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
        size = alignUp(size, PAGE_MULTIPLE);
        var old = Module["buffer"];
        var oldSize = old.byteLength;
        if (Module["usingWasm"]) {
            try {
                var result = Module["wasmMemory"].grow((size - oldSize) / wasmPageSize);
                if (result !== (-1 | 0)) {
                    return Module["buffer"] = Module["wasmMemory"].buffer
                } else {
                    return null
                }
            } catch (e) {
                return null
            }
        }
    });
    Module["reallocBuffer"] = (function(size) {
        if (finalMethod === "asmjs") {
            return asmjsReallocBuffer(size)
        } else {
            return wasmReallocBuffer(size)
        }
    });
    var finalMethod = "";
    Module["asm"] = (function(global, env, providedBuffer) {
        env = fixImports(env);
        if (!env["table"]) {
            var TABLE_SIZE = Module["wasmTableSize"];
            if (TABLE_SIZE === undefined) TABLE_SIZE = 1024;
            var MAX_TABLE_SIZE = Module["wasmMaxTableSize"];
            if (typeof WebAssembly === "object" && typeof WebAssembly.Table === "function") {
                if (MAX_TABLE_SIZE !== undefined) {
                    env["table"] = new WebAssembly.Table({
                        "initial": TABLE_SIZE,
                        "maximum": MAX_TABLE_SIZE,
                        "element": "anyfunc"
                    })
                } else {
                    env["table"] = new WebAssembly.Table({
                        "initial": TABLE_SIZE,
                        element: "anyfunc"
                    })
                }
            } else {
                env["table"] = new Array(TABLE_SIZE)
            }
            Module["wasmTable"] = env["table"]
        }
        if (!env["memoryBase"]) {
            env["memoryBase"] = Module["STATIC_BASE"]
        }
        if (!env["tableBase"]) {
            env["tableBase"] = 0
        }
        var exports;
        exports = doNativeWasm(global, env, providedBuffer);
        if (!exports) abort("no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods");
        return exports
    })
}
integrateWasmJS();
var ASM_CONSTS = [];
STATIC_BASE = GLOBAL_BASE;
STATICTOP = STATIC_BASE + 13632;
__ATINIT__.push();
var STATIC_BUMP = 13632;
Module["STATIC_BASE"] = STATIC_BASE;
Module["STATIC_BUMP"] = STATIC_BUMP;
STATICTOP += 16;
var PROCINFO = {
    ppid: 1,
    pid: 42,
    sid: 42,
    pgid: 42
};
var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86
};
var ERRNO_MESSAGES = {
    0: "Success",
    1: "Not super-user",
    2: "No such file or directory",
    3: "No such process",
    4: "Interrupted system call",
    5: "I/O error",
    6: "No such device or address",
    7: "Arg list too long",
    8: "Exec format error",
    9: "Bad file number",
    10: "No children",
    11: "No more processes",
    12: "Not enough core",
    13: "Permission denied",
    14: "Bad address",
    15: "Block device required",
    16: "Mount device busy",
    17: "File exists",
    18: "Cross-device link",
    19: "No such device",
    20: "Not a directory",
    21: "Is a directory",
    22: "Invalid argument",
    23: "Too many open files in system",
    24: "Too many open files",
    25: "Not a typewriter",
    26: "Text file busy",
    27: "File too large",
    28: "No space left on device",
    29: "Illegal seek",
    30: "Read only file system",
    31: "Too many links",
    32: "Broken pipe",
    33: "Math arg out of domain of func",
    34: "Math result not representable",
    35: "File locking deadlock error",
    36: "File or path name too long",
    37: "No record locks available",
    38: "Function not implemented",
    39: "Directory not empty",
    40: "Too many symbolic links",
    42: "No message of desired type",
    43: "Identifier removed",
    44: "Channel number out of range",
    45: "Level 2 not synchronized",
    46: "Level 3 halted",
    47: "Level 3 reset",
    48: "Link number out of range",
    49: "Protocol driver not attached",
    50: "No CSI structure available",
    51: "Level 2 halted",
    52: "Invalid exchange",
    53: "Invalid request descriptor",
    54: "Exchange full",
    55: "No anode",
    56: "Invalid request code",
    57: "Invalid slot",
    59: "Bad font file fmt",
    60: "Device not a stream",
    61: "No data (for no delay io)",
    62: "Timer expired",
    63: "Out of streams resources",
    64: "Machine is not on the network",
    65: "Package not installed",
    66: "The object is remote",
    67: "The link has been severed",
    68: "Advertise error",
    69: "Srmount error",
    70: "Communication error on send",
    71: "Protocol error",
    72: "Multihop attempted",
    73: "Cross mount point (not really error)",
    74: "Trying to read unreadable message",
    75: "Value too large for defined data type",
    76: "Given log. name not unique",
    77: "f.d. invalid for this operation",
    78: "Remote address changed",
    79: "Can   access a needed shared lib",
    80: "Accessing a corrupted shared lib",
    81: ".lib section in a.out corrupted",
    82: "Attempting to link in too many libs",
    83: "Attempting to exec a shared library",
    84: "Illegal byte sequence",
    86: "Streams pipe error",
    87: "Too many users",
    88: "Socket operation on non-socket",
    89: "Destination address required",
    90: "Message too long",
    91: "Protocol wrong type for socket",
    92: "Protocol not available",
    93: "Unknown protocol",
    94: "Socket type not supported",
    95: "Not supported",
    96: "Protocol family not supported",
    97: "Address family not supported by protocol family",
    98: "Address already in use",
    99: "Address not available",
    100: "Network interface is not configured",
    101: "Network is unreachable",
    102: "Connection reset by network",
    103: "Connection aborted",
    104: "Connection reset by peer",
    105: "No buffer space available",
    106: "Socket is already connected",
    107: "Socket is not connected",
    108: "Can't send after socket shutdown",
    109: "Too many references",
    110: "Connection timed out",
    111: "Connection refused",
    112: "Host is down",
    113: "Host is unreachable",
    114: "Socket already connected",
    115: "Connection already in progress",
    116: "Stale file handle",
    122: "Quota exceeded",
    123: "No medium (in tape drive)",
    125: "Operation canceled",
    130: "Previous owner died",
    131: "State not recoverable"
};

function ___setErrNo(value) {
    if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
    return value
}
var PATH = {
    splitPath: (function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1)
    }),
    normalizeArray: (function(parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up; up--) {
                parts.unshift("..")
            }
        }
        return parts
    }),
    normalize: (function(path) {
        var isAbsolute = path.charAt(0) === "/",
            trailingSlash = path.substr(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter((function(p) {
            return !!p
        })), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    }),
    dirname: (function(path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
            return "."
        }
        if (dir) {
            dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
    }),
    basename: (function(path) {
        if (path === "/") return "/";
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash === -1) return path;
        return path.substr(lastSlash + 1)
    }),
    extname: (function(path) {
        return PATH.splitPath(path)[3]
    }),
    join: (function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join("/"))
    }),
    join2: (function(l, r) {
        return PATH.normalize(l + "/" + r)
    }),
    resolve: (function() {
        var resolvedPath = "",
            resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : FS.cwd();
            if (typeof path !== "string") {
                throw new TypeError("Arguments to path.resolve must be strings")
            } else if (!path) {
                return ""
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = path.charAt(0) === "/"
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function(p) {
            return !!p
        })), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    }),
    relative: (function(from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);

        function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
                if (arr[start] !== "") break
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
                if (arr[end] !== "") break
            }
            if (start > end) return [];
            return arr.slice(start, end - start + 1)
        }
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
                samePartsLength = i;
                break
            }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/")
    })
};
var TTY = {
    ttys: [],
    init: (function() {}),
    shutdown: (function() {}),
    register: (function(dev, ops) {
        TTY.ttys[dev] = {
            input: [],
            output: [],
            ops: ops
        };
        FS.registerDevice(dev, TTY.stream_ops)
    }),
    stream_ops: {
        open: (function(stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            stream.tty = tty;
            stream.seekable = false
        }),
        close: (function(stream) {
            stream.tty.ops.flush(stream.tty)
        }),
        flush: (function(stream) {
            stream.tty.ops.flush(stream.tty)
        }),
        read: (function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.get_char) {
                throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
                var result;
                try {
                    result = stream.tty.ops.get_char(stream.tty)
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
                if (result === undefined && bytesRead === 0) {
                    throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
                }
                if (result === null || result === undefined) break;
                bytesRead++;
                buffer[offset + i] = result
            }
            if (bytesRead) {
                stream.node.timestamp = Date.now()
            }
            return bytesRead
        }),
        write: (function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
                throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
            }
            for (var i = 0; i < length; i++) {
                try {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
            }
            if (length) {
                stream.node.timestamp = Date.now()
            }
            return i
        })
    },
    default_tty_ops: {
        get_char: (function(tty) {
            if (!tty.input.length) {
                var result = null;
                if (ENVIRONMENT_IS_NODE) {
                    var BUFSIZE = 256;
                    var buf = new Buffer(BUFSIZE);
                    var bytesRead = 0;
                    var isPosixPlatform = process.platform != "win32";
                    var fd = process.stdin.fd;
                    if (isPosixPlatform) {
                        var usingDevice = false;
                        try {
                            fd = fs.openSync("/dev/stdin", "r");
                            usingDevice = true
                        } catch (e) {}
                    }
                    try {
                        bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null)
                    } catch (e) {
                        if (e.toString().indexOf("EOF") != -1) bytesRead = 0;
                        else throw e
                    }
                    if (usingDevice) {
                        fs.closeSync(fd)
                    }
                    if (bytesRead > 0) {
                        result = buf.slice(0, bytesRead).toString("utf-8")
                    } else {
                        result = null
                    }
                } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                    result = window.prompt("Input: ");
                    if (result !== null) {
                        result += "\n"
                    }
                } else if (typeof readline == "function") {
                    result = readline();
                    if (result !== null) {
                        result += "\n"
                    }
                }
                if (!result) {
                    return null
                }
                tty.input = intArrayFromString(result, true)
            }
            return tty.input.shift()
        }),
        put_char: (function(tty, val) {
            if (val === null || val === 10) {
                Module["print"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        }),
        flush: (function(tty) {
            if (tty.output && tty.output.length > 0) {
                Module["print"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        })
    },
    default_tty1_ops: {
        put_char: (function(tty, val) {
            if (val === null || val === 10) {
                Module["printErr"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        }),
        flush: (function(tty) {
            if (tty.output && tty.output.length > 0) {
                Module["printErr"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        })
    }
};
var MEMFS = {
    ops_table: null,
    mount: (function(mount) {
        return MEMFS.createNode(null, "/", 16384 | 511, 0)
    }),
    createNode: (function(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (!MEMFS.ops_table) {
            MEMFS.ops_table = {
                dir: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        lookup: MEMFS.node_ops.lookup,
                        mknod: MEMFS.node_ops.mknod,
                        rename: MEMFS.node_ops.rename,
                        unlink: MEMFS.node_ops.unlink,
                        rmdir: MEMFS.node_ops.rmdir,
                        readdir: MEMFS.node_ops.readdir,
                        symlink: MEMFS.node_ops.symlink
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek
                    }
                },
                file: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek,
                        read: MEMFS.stream_ops.read,
                        write: MEMFS.stream_ops.write,
                        allocate: MEMFS.stream_ops.allocate,
                        mmap: MEMFS.stream_ops.mmap,
                        msync: MEMFS.stream_ops.msync
                    }
                },
                link: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        readlink: MEMFS.node_ops.readlink
                    },
                    stream: {}
                },
                chrdev: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: FS.chrdev_stream_ops
                }
            }
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {}
        } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null
        } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now();
        if (parent) {
            parent.contents[name] = node
        }
        return node
    }),
    getFileDataAsRegularArray: (function(node) {
        if (node.contents && node.contents.subarray) {
            var arr = [];
            for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
            return arr
        }
        return node.contents
    }),
    getFileDataAsTypedArray: (function(node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    }),
    expandFileStorage: (function(node, newCapacity) {
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
            node.contents = MEMFS.getFileDataAsRegularArray(node);
            node.usedBytes = node.contents.length
        }
        if (!node.contents || node.contents.subarray) {
            var prevCapacity = node.contents ? node.contents.length : 0;
            if (prevCapacity >= newCapacity) return;
            var CAPACITY_DOUBLING_MAX = 1024 * 1024;
            newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
            if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
            var oldContents = node.contents;
            node.contents = new Uint8Array(newCapacity);
            if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
            return
        }
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0)
    }),
    resizeFileStorage: (function(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0;
            return
        }
        if (!node.contents || node.contents.subarray) {
            var oldContents = node.contents;
            node.contents = new Uint8Array(new ArrayBuffer(newSize));
            if (oldContents) {
                node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
            }
            node.usedBytes = newSize;
            return
        }
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else
            while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize
    }),
    node_ops: {
        getattr: (function(node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
                attr.size = 4096
            } else if (FS.isFile(node.mode)) {
                attr.size = node.usedBytes
            } else if (FS.isLink(node.mode)) {
                attr.size = node.link.length
            } else {
                attr.size = 0
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr
        }),
        setattr: (function(node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
            if (attr.size !== undefined) {
                MEMFS.resizeFileStorage(node, attr.size)
            }
        }),
        lookup: (function(parent, name) {
            throw FS.genericErrors[ERRNO_CODES.ENOENT]
        }),
        mknod: (function(parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev)
        }),
        rename: (function(old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
                var new_node;
                try {
                    new_node = FS.lookupNode(new_dir, new_name)
                } catch (e) {}
                if (new_node) {
                    for (var i in new_node.contents) {
                        throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
                    }
                }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            old_node.parent = new_dir
        }),
        unlink: (function(parent, name) {
            delete parent.contents[name]
        }),
        rmdir: (function(parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
            }
            delete parent.contents[name]
        }),
        readdir: (function(node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        }),
        symlink: (function(parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
            node.link = oldpath;
            return node
        }),
        readlink: (function(node) {
            if (!FS.isLink(node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return node.link
        })
    },
    stream_ops: {
        read: (function(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes) return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            assert(size >= 0);
            if (size > 8 && contents.subarray) {
                buffer.set(contents.subarray(position, position + size), offset)
            } else {
                for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
            }
            return size
        }),
        write: (function(stream, buffer, offset, length, position, canOwn) {
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
            else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        }),
        llseek: (function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        }),
        allocate: (function(stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
        }),
        mmap: (function(stream, buffer, offset, length, position, prot, flags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
                allocated = false;
                ptr = contents.byteOffset
            } else {
                if (position > 0 || position + length < stream.node.usedBytes) {
                    if (contents.subarray) {
                        contents = contents.subarray(position, position + length)
                    } else {
                        contents = Array.prototype.slice.call(contents, position, position + length)
                    }
                }
                allocated = true;
                ptr = _malloc(length);
                if (!ptr) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)
                }
                buffer.set(contents, ptr)
            }
            return {
                ptr: ptr,
                allocated: allocated
            }
        }),
        msync: (function(stream, buffer, offset, length, mmapFlags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            if (mmapFlags & 2) {
                return 0
            }
            var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0
        })
    }
};
var IDBFS = {
    dbs: {},
    indexedDB: (function() {
        if (typeof indexedDB !== "undefined") return indexedDB;
        var ret = null;
        if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, "IDBFS used, but indexedDB not supported");
        return ret
    }),
    DB_VERSION: 21,
    DB_STORE_NAME: "FILE_DATA",
    mount: (function(mount) {
        return MEMFS.mount.apply(null, arguments)
    }),
    syncfs: (function(mount, populate, callback) {
        IDBFS.getLocalSet(mount, (function(err, local) {
            if (err) return callback(err);
            IDBFS.getRemoteSet(mount, (function(err, remote) {
                if (err) return callback(err);
                var src = populate ? remote : local;
                var dst = populate ? local : remote;
                IDBFS.reconcile(src, dst, callback)
            }))
        }))
    }),
    getDB: (function(name, callback) {
        var db = IDBFS.dbs[name];
        if (db) {
            return callback(null, db)
        }
        var req;
        try {
            req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
        } catch (e) {
            return callback(e)
        }
        if (!req) {
            return callback("Unable to connect to IndexedDB")
        }
        req.onupgradeneeded = (function(e) {
            var db = e.target.result;
            var transaction = e.target.transaction;
            var fileStore;
            if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
                fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
            } else {
                fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
            }
            if (!fileStore.indexNames.contains("timestamp")) {
                fileStore.createIndex("timestamp", "timestamp", {
                    unique: false
                })
            }
        });
        req.onsuccess = (function() {
            db = req.result;
            IDBFS.dbs[name] = db;
            callback(null, db)
        });
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        })
    }),
    getLocalSet: (function(mount, callback) {
        var entries = {};

        function isRealDir(p) {
            return p !== "." && p !== ".."
        }

        function toAbsolute(root) {
            return (function(p) {
                return PATH.join2(root, p)
            })
        }
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
        while (check.length) {
            var path = check.pop();
            var stat;
            try {
                stat = FS.stat(path)
            } catch (e) {
                return callback(e)
            }
            if (FS.isDir(stat.mode)) {
                check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
            }
            entries[path] = {
                timestamp: stat.mtime
            }
        }
        return callback(null, {
            type: "local",
            entries: entries
        })
    }),
    getRemoteSet: (function(mount, callback) {
        var entries = {};
        IDBFS.getDB(mount.mountpoint, (function(err, db) {
            if (err) return callback(err);
            try {
                var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
                transaction.onerror = (function(e) {
                    callback(this.error);
                    e.preventDefault()
                });
                var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
                var index = store.index("timestamp");
                index.openKeyCursor().onsuccess = (function(event) {
                    var cursor = event.target.result;
                    if (!cursor) {
                        return callback(null, {
                            type: "remote",
                            db: db,
                            entries: entries
                        })
                    }
                    entries[cursor.primaryKey] = {
                        timestamp: cursor.key
                    };
                    cursor.continue()
                })
            } catch (e) {
                return callback(e)
            }
        }))
    }),
    loadLocalEntry: (function(path, callback) {
        var stat, node;
        try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path)
        } catch (e) {
            return callback(e)
        }
        if (FS.isDir(stat.mode)) {
            return callback(null, {
                timestamp: stat.mtime,
                mode: stat.mode
            })
        } else if (FS.isFile(stat.mode)) {
            node.contents = MEMFS.getFileDataAsTypedArray(node);
            return callback(null, {
                timestamp: stat.mtime,
                mode: stat.mode,
                contents: node.contents
            })
        } else {
            return callback(new Error("node type not supported"))
        }
    }),
    storeLocalEntry: (function(path, entry, callback) {
        try {
            if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode)
            } else if (FS.isFile(entry.mode)) {
                FS.writeFile(path, entry.contents, {
                    encoding: "binary",
                    canOwn: true
                })
            } else {
                return callback(new Error("node type not supported"))
            }
            FS.chmod(path, entry.mode);
            FS.utime(path, entry.timestamp, entry.timestamp)
        } catch (e) {
            return callback(e)
        }
        callback(null)
    }),
    removeLocalEntry: (function(path, callback) {
        try {
            var lookup = FS.lookupPath(path);
            var stat = FS.stat(path);
            if (FS.isDir(stat.mode)) {
                FS.rmdir(path)
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path)
            }
        } catch (e) {
            return callback(e)
        }
        callback(null)
    }),
    loadRemoteEntry: (function(store, path, callback) {
        var req = store.get(path);
        req.onsuccess = (function(event) {
            callback(null, event.target.result)
        });
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        })
    }),
    storeRemoteEntry: (function(store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = (function() {
            callback(null)
        });
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        })
    }),
    removeRemoteEntry: (function(store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = (function() {
            callback(null)
        });
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        })
    }),
    reconcile: (function(src, dst, callback) {
        var total = 0;
        var create = [];
        Object.keys(src.entries).forEach((function(key) {
            var e = src.entries[key];
            var e2 = dst.entries[key];
            if (!e2 || e.timestamp > e2.timestamp) {
                create.push(key);
                total++
            }
        }));
        var remove = [];
        Object.keys(dst.entries).forEach((function(key) {
            var e = dst.entries[key];
            var e2 = src.entries[key];
            if (!e2) {
                remove.push(key);
                total++
            }
        }));
        if (!total) {
            return callback(null)
        }
        var completed = 0;
        var db = src.type === "remote" ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

        function done(err) {
            if (err) {
                if (!done.errored) {
                    done.errored = true;
                    return callback(err)
                }
                return
            }
            if (++completed >= total) {
                return callback(null)
            }
        }
        transaction.onerror = (function(e) {
            done(this.error);
            e.preventDefault()
        });
        create.sort().forEach((function(path) {
            if (dst.type === "local") {
                IDBFS.loadRemoteEntry(store, path, (function(err, entry) {
                    if (err) return done(err);
                    IDBFS.storeLocalEntry(path, entry, done)
                }))
            } else {
                IDBFS.loadLocalEntry(path, (function(err, entry) {
                    if (err) return done(err);
                    IDBFS.storeRemoteEntry(store, path, entry, done)
                }))
            }
        }));
        remove.sort().reverse().forEach((function(path) {
            if (dst.type === "local") {
                IDBFS.removeLocalEntry(path, done)
            } else {
                IDBFS.removeRemoteEntry(store, path, done)
            }
        }))
    })
};
var NODEFS = {
    isWindows: false,
    staticInit: (function() {
        NODEFS.isWindows = !!process.platform.match(/^win/)
    }),
    mount: (function(mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
    }),
    createNode: (function(parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node
    }),
    getMode: (function(path) {
        var stat;
        try {
            stat = fs.lstatSync(path);
            if (NODEFS.isWindows) {
                stat.mode = stat.mode | (stat.mode & 146) >> 1
            }
        } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        return stat.mode
    }),
    realPath: (function(node) {
        var parts = [];
        while (node.parent !== node) {
            parts.push(node.name);
            node = node.parent
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts)
    }),
    flagsToPermissionStringMap: {
        0: "r",
        1: "r+",
        2: "r+",
        64: "r",
        65: "r+",
        66: "r+",
        129: "rx+",
        193: "rx+",
        514: "w+",
        577: "w",
        578: "w+",
        705: "wx",
        706: "wx+",
        1024: "a",
        1025: "a",
        1026: "a+",
        1089: "a",
        1090: "a+",
        1153: "ax",
        1154: "ax+",
        1217: "ax",
        1218: "ax+",
        4096: "rs",
        4098: "rs+"
    },
    flagsToPermissionString: (function(flags) {
        flags &= ~2097152;
        flags &= ~2048;
        flags &= ~32768;
        flags &= ~524288;
        if (flags in NODEFS.flagsToPermissionStringMap) {
            return NODEFS.flagsToPermissionStringMap[flags]
        } else {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
    }),
    node_ops: {
        getattr: (function(node) {
            var path = NODEFS.realPath(node);
            var stat;
            try {
                stat = fs.lstatSync(path)
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            if (NODEFS.isWindows && !stat.blksize) {
                stat.blksize = 4096
            }
            if (NODEFS.isWindows && !stat.blocks) {
                stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0
            }
            return {
                dev: stat.dev,
                ino: stat.ino,
                mode: stat.mode,
                nlink: stat.nlink,
                uid: stat.uid,
                gid: stat.gid,
                rdev: stat.rdev,
                size: stat.size,
                atime: stat.atime,
                mtime: stat.mtime,
                ctime: stat.ctime,
                blksize: stat.blksize,
                blocks: stat.blocks
            }
        }),
        setattr: (function(node, attr) {
            var path = NODEFS.realPath(node);
            try {
                if (attr.mode !== undefined) {
                    fs.chmodSync(path, attr.mode);
                    node.mode = attr.mode
                }
                if (attr.timestamp !== undefined) {
                    var date = new Date(attr.timestamp);
                    fs.utimesSync(path, date, date)
                }
                if (attr.size !== undefined) {
                    fs.truncateSync(path, attr.size)
                }
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        lookup: (function(parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            var mode = NODEFS.getMode(path);
            return NODEFS.createNode(parent, name, mode)
        }),
        mknod: (function(parent, name, mode, dev) {
            var node = NODEFS.createNode(parent, name, mode, dev);
            var path = NODEFS.realPath(node);
            try {
                if (FS.isDir(node.mode)) {
                    fs.mkdirSync(path, node.mode)
                } else {
                    fs.writeFileSync(path, "", {
                        mode: node.mode
                    })
                }
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            return node
        }),
        rename: (function(oldNode, newDir, newName) {
            var oldPath = NODEFS.realPath(oldNode);
            var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
            try {
                fs.renameSync(oldPath, newPath)
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        unlink: (function(parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            try {
                fs.unlinkSync(path)
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        rmdir: (function(parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            try {
                fs.rmdirSync(path)
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        readdir: (function(node) {
            var path = NODEFS.realPath(node);
            try {
                return fs.readdirSync(path)
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        symlink: (function(parent, newName, oldPath) {
            var newPath = PATH.join2(NODEFS.realPath(parent), newName);
            try {
                fs.symlinkSync(oldPath, newPath)
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        readlink: (function(node) {
            var path = NODEFS.realPath(node);
            try {
                path = fs.readlinkSync(path);
                path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
                return path
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        })
    },
    stream_ops: {
        open: (function(stream) {
            var path = NODEFS.realPath(stream.node);
            try {
                if (FS.isFile(stream.node.mode)) {
                    stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags))
                }
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        close: (function(stream) {
            try {
                if (FS.isFile(stream.node.mode) && stream.nfd) {
                    fs.closeSync(stream.nfd)
                }
            } catch (e) {
                if (!e.code) throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }),
        read: (function(stream, buffer, offset, length, position) {
            if (length === 0) return 0;
            var nbuffer = new Buffer(length);
            var res;
            try {
                res = fs.readSync(stream.nfd, nbuffer, 0, length, position)
            } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            if (res > 0) {
                for (var i = 0; i < res; i++) {
                    buffer[offset + i] = nbuffer[i]
                }
            }
            return res
        }),
        write: (function(stream, buffer, offset, length, position) {
            var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
            var res;
            try {
                res = fs.writeSync(stream.nfd, nbuffer, 0, length, position)
            } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            return res
        }),
        llseek: (function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    try {
                        var stat = fs.fstatSync(stream.nfd);
                        position += stat.size
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES[e.code])
                    }
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        })
    }
};
var WORKERFS = {
    DIR_MODE: 16895,
    FILE_MODE: 33279,
    reader: null,
    mount: (function(mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync;
        var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
        var createdParents = {};

        function ensureParent(path) {
            var parts = path.split("/");
            var parent = root;
            for (var i = 0; i < parts.length - 1; i++) {
                var curr = parts.slice(0, i + 1).join("/");
                if (!createdParents[curr]) {
                    createdParents[curr] = WORKERFS.createNode(parent, parts[i], WORKERFS.DIR_MODE, 0)
                }
                parent = createdParents[curr]
            }
            return parent
        }

        function base(path) {
            var parts = path.split("/");
            return parts[parts.length - 1]
        }
        Array.prototype.forEach.call(mount.opts["files"] || [], (function(file) {
            WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate)
        }));
        (mount.opts["blobs"] || []).forEach((function(obj) {
            WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"])
        }));
        (mount.opts["packages"] || []).forEach((function(pack) {
            pack["metadata"].files.forEach((function(file) {
                var name = file.filename.substr(1);
                WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack["blob"].slice(file.start, file.end))
            }))
        }));
        return root
    }),
    createNode: (function(parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
            node.size = contents.size;
            node.contents = contents
        } else {
            node.size = 4096;
            node.contents = {}
        }
        if (parent) {
            parent.contents[name] = node
        }
        return node
    }),
    node_ops: {
        getattr: (function(node) {
            return {
                dev: 1,
                ino: undefined,
                mode: node.mode,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: undefined,
                size: node.size,
                atime: new Date(node.timestamp),
                mtime: new Date(node.timestamp),
                ctime: new Date(node.timestamp),
                blksize: 4096,
                blocks: Math.ceil(node.size / 4096)
            }
        }),
        setattr: (function(node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
        }),
        lookup: (function(parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }),
        mknod: (function(parent, name, mode, dev) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }),
        rename: (function(oldNode, newDir, newName) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }),
        unlink: (function(parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }),
        rmdir: (function(parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }),
        readdir: (function(node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        }),
        symlink: (function(parent, newName, oldPath) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }),
        readlink: (function(node) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        })
    },
    stream_ops: {
        read: (function(stream, buffer, offset, length, position) {
            if (position >= stream.node.size) return 0;
            var chunk = stream.node.contents.slice(position, position + length);
            var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
            buffer.set(new Uint8Array(ab), offset);
            return chunk.size
        }),
        write: (function(stream, buffer, offset, length, position) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
        }),
        llseek: (function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.size
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        })
    }
};
STATICTOP += 16;
STATICTOP += 16;
STATICTOP += 16;
var FS = {
    root: null,
    mounts: [],
    devices: [null],
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {
        openFlags: {
            READ: 1,
            WRITE: 2
        }
    },
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    syncFSRequests: 0,
    handleFSError: (function(e) {
        if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
        return ___setErrNo(e.errno)
    }),
    lookupPath: (function(path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
        if (!path) return {
            path: "",
            node: null
        };
        var defaults = {
            follow_mount: true,
            recurse_count: 0
        };
        for (var key in defaults) {
            if (opts[key] === undefined) {
                opts[key] = defaults[key]
            }
        }
        if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
        }
        var parts = PATH.normalizeArray(path.split("/").filter((function(p) {
            return !!p
        })), false);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
                break
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
                if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root
                }
            }
            if (!islast || opts.follow) {
                var count = 0;
                while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, {
                        recurse_count: opts.recurse_count
                    });
                    current = lookup.node;
                    if (count++ > 40) {
                        throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
                    }
                }
            }
        }
        return {
            path: current_path,
            node: current
        }
    }),
    getPath: (function(node) {
        var path;
        while (true) {
            if (FS.isRoot(node)) {
                var mount = node.mount.mountpoint;
                if (!path) return mount;
                return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
            }
            path = path ? node.name + "/" + path : node.name;
            node = node.parent
        }
    }),
    hashName: (function(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i) | 0
        }
        return (parentid + hash >>> 0) % FS.nameTable.length
    }),
    hashAddNode: (function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node
    }),
    hashRemoveNode: (function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next
        } else {
            var current = FS.nameTable[hash];
            while (current) {
                if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break
                }
                current = current.name_next
            }
        }
    }),
    lookupNode: (function(parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
            throw new FS.ErrnoError(err, parent)
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
                return node
            }
        }
        return FS.lookup(parent, name)
    }),
    createNode: (function(parent, name, mode, rdev) {
        if (!FS.FSNode) {
            FS.FSNode = (function(parent, name, mode, rdev) {
                if (!parent) {
                    parent = this
                }
                this.parent = parent;
                this.mount = parent.mount;
                this.mounted = null;
                this.id = FS.nextInode++;
                this.name = name;
                this.mode = mode;
                this.node_ops = {};
                this.stream_ops = {};
                this.rdev = rdev
            });
            FS.FSNode.prototype = {};
            var readMode = 292 | 73;
            var writeMode = 146;
            Object.defineProperties(FS.FSNode.prototype, {
                read: {
                    get: (function() {
                        return (this.mode & readMode) === readMode
                    }),
                    set: (function(val) {
                        val ? this.mode |= readMode : this.mode &= ~readMode
                    })
                },
                write: {
                    get: (function() {
                        return (this.mode & writeMode) === writeMode
                    }),
                    set: (function(val) {
                        val ? this.mode |= writeMode : this.mode &= ~writeMode
                    })
                },
                isFolder: {
                    get: (function() {
                        return FS.isDir(this.mode)
                    })
                },
                isDevice: {
                    get: (function() {
                        return FS.isChrdev(this.mode)
                    })
                }
            })
        }
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node
    }),
    destroyNode: (function(node) {
        FS.hashRemoveNode(node)
    }),
    isRoot: (function(node) {
        return node === node.parent
    }),
    isMountpoint: (function(node) {
        return !!node.mounted
    }),
    isFile: (function(mode) {
        return (mode & 61440) === 32768
    }),
    isDir: (function(mode) {
        return (mode & 61440) === 16384
    }),
    isLink: (function(mode) {
        return (mode & 61440) === 40960
    }),
    isChrdev: (function(mode) {
        return (mode & 61440) === 8192
    }),
    isBlkdev: (function(mode) {
        return (mode & 61440) === 24576
    }),
    isFIFO: (function(mode) {
        return (mode & 61440) === 4096
    }),
    isSocket: (function(mode) {
        return (mode & 49152) === 49152
    }),
    flagModes: {
        "r": 0,
        "rs": 1052672,
        "r+": 2,
        "w": 577,
        "wx": 705,
        "xw": 705,
        "w+": 578,
        "wx+": 706,
        "xw+": 706,
        "a": 1089,
        "ax": 1217,
        "xa": 1217,
        "a+": 1090,
        "ax+": 1218,
        "xa+": 1218
    },
    modeStringToFlags: (function(str) {
        var flags = FS.flagModes[str];
        if (typeof flags === "undefined") {
            throw new Error("Unknown file open mode: " + str)
        }
        return flags
    }),
    flagsToPermissionString: (function(flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
            perms += "w"
        }
        return perms
    }),
    nodePermissions: (function(node, perms) {
        if (FS.ignorePermissions) {
            return 0
        }
        if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
            return ERRNO_CODES.EACCES
        } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
            return ERRNO_CODES.EACCES
        } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
            return ERRNO_CODES.EACCES
        }
        return 0
    }),
    mayLookup: (function(dir) {
        var err = FS.nodePermissions(dir, "x");
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0
    }),
    mayCreate: (function(dir, name) {
        try {
            var node = FS.lookupNode(dir, name);
            return ERRNO_CODES.EEXIST
        } catch (e) {}
        return FS.nodePermissions(dir, "wx")
    }),
    mayDelete: (function(dir, name, isdir) {
        var node;
        try {
            node = FS.lookupNode(dir, name)
        } catch (e) {
            return e.errno
        }
        var err = FS.nodePermissions(dir, "wx");
        if (err) {
            return err
        }
        if (isdir) {
            if (!FS.isDir(node.mode)) {
                return ERRNO_CODES.ENOTDIR
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                return ERRNO_CODES.EBUSY
            }
        } else {
            if (FS.isDir(node.mode)) {
                return ERRNO_CODES.EISDIR
            }
        }
        return 0
    }),
    mayOpen: (function(node, flags) {
        if (!node) {
            return ERRNO_CODES.ENOENT
        }
        if (FS.isLink(node.mode)) {
            return ERRNO_CODES.ELOOP
        } else if (FS.isDir(node.mode)) {
            if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                return ERRNO_CODES.EISDIR
            }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    }),
    MAX_OPEN_FDS: 4096,
    nextfd: (function(fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
            if (!FS.streams[fd]) {
                return fd
            }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE)
    }),
    getStream: (function(fd) {
        return FS.streams[fd]
    }),
    createStream: (function(stream, fd_start, fd_end) {
        if (!FS.FSStream) {
            FS.FSStream = (function() {});
            FS.FSStream.prototype = {};
            Object.defineProperties(FS.FSStream.prototype, {
                object: {
                    get: (function() {
                        return this.node
                    }),
                    set: (function(val) {
                        this.node = val
                    })
                },
                isRead: {
                    get: (function() {
                        return (this.flags & 2097155) !== 1
                    })
                },
                isWrite: {
                    get: (function() {
                        return (this.flags & 2097155) !== 0
                    })
                },
                isAppend: {
                    get: (function() {
                        return this.flags & 1024
                    })
                }
            })
        }
        var newStream = new FS.FSStream;
        for (var p in stream) {
            newStream[p] = stream[p]
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream
    }),
    closeStream: (function(fd) {
        FS.streams[fd] = null
    }),
    chrdev_stream_ops: {
        open: (function(stream) {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream)
            }
        }),
        llseek: (function() {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        })
    },
    major: (function(dev) {
        return dev >> 8
    }),
    minor: (function(dev) {
        return dev & 255
    }),
    makedev: (function(ma, mi) {
        return ma << 8 | mi
    }),
    registerDevice: (function(dev, ops) {
        FS.devices[dev] = {
            stream_ops: ops
        }
    }),
    getDevice: (function(dev) {
        return FS.devices[dev]
    }),
    getMounts: (function(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push.apply(check, m.mounts)
        }
        return mounts
    }),
    syncfs: (function(populate, callback) {
        if (typeof populate === "function") {
            callback = populate;
            populate = false
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
            console.log("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;

        function doCallback(err) {
            assert(FS.syncFSRequests > 0);
            FS.syncFSRequests--;
            return callback(err)
        }

        function done(err) {
            if (err) {
                if (!done.errored) {
                    done.errored = true;
                    return doCallback(err)
                }
                return
            }
            if (++completed >= mounts.length) {
                doCallback(null)
            }
        }
        mounts.forEach((function(mount) {
            if (!mount.type.syncfs) {
                return done(null)
            }
            mount.type.syncfs(mount, populate, done)
        }))
    }),
    mount: (function(type, opts, mountpoint) {
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {
                follow_mount: false
            });
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
            }
            if (!FS.isDir(node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
            }
        }
        var mount = {
            type: type,
            opts: opts,
            mountpoint: mountpoint,
            mounts: []
        };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
            FS.root = mountRoot
        } else if (node) {
            node.mounted = mount;
            if (node.mount) {
                node.mount.mounts.push(mount)
            }
        }
        return mountRoot
    }),
    unmount: (function(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, {
            follow_mount: false
        });
        if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach((function(hash) {
            var current = FS.nameTable[hash];
            while (current) {
                var next = current.name_next;
                if (mounts.indexOf(current.mount) !== -1) {
                    FS.destroyNode(current)
                }
                current = next
            }
        }));
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1)
    }),
    lookup: (function(parent, name) {
        return parent.node_ops.lookup(parent, name)
    }),
    mknod: (function(path, mode, dev) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
    }),
    create: (function(path, mode) {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0)
    }),
    mkdir: (function(path, mode) {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0)
    }),
    mkdirTree: (function(path, mode) {
        var dirs = path.split("/");
        var d = "";
        for (var i = 0; i < dirs.length; ++i) {
            if (!dirs[i]) continue;
            d += "/" + dirs[i];
            try {
                FS.mkdir(d, mode)
            } catch (e) {
                if (e.errno != ERRNO_CODES.EEXIST) throw e
            }
        }
    }),
    mkdev: (function(path, mode, dev) {
        if (typeof dev === "undefined") {
            dev = mode;
            mode = 438
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev)
    }),
    symlink: (function(oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        var lookup = FS.lookupPath(newpath, {
            parent: true
        });
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
    }),
    rename: (function(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        try {
            lookup = FS.lookupPath(old_path, {
                parent: true
            });
            old_dir = lookup.node;
            lookup = FS.lookupPath(new_path, {
                parent: true
            });
            new_dir = lookup.node
        } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(ERRNO_CODES.EXDEV)
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
        }
        var new_node;
        try {
            new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (old_node === new_node) {
            return
        }
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (new_dir !== old_dir) {
            err = FS.nodePermissions(old_dir, "w");
            if (err) {
                throw new FS.ErrnoError(err)
            }
        }
        try {
            if (FS.trackingDelegate["willMovePath"]) {
                FS.trackingDelegate["willMovePath"](old_path, new_path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
        FS.hashRemoveNode(old_node);
        try {
            old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
            throw e
        } finally {
            FS.hashAddNode(old_node)
        }
        try {
            if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)
        } catch (e) {
            console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
    }),
    rmdir: (function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    }),
    readdir: (function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        return node.node_ops.readdir(node)
    }),
    unlink: (function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    }),
    readlink: (function(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    }),
    stat: (function(path, dontFollow) {
        var lookup = FS.lookupPath(path, {
            follow: !dontFollow
        });
        var node = lookup.node;
        if (!node) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return node.node_ops.getattr(node)
    }),
    lstat: (function(path) {
        return FS.stat(path, true)
    }),
    chmod: (function(path, mode, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        node.node_ops.setattr(node, {
            mode: mode & 4095 | node.mode & ~4095,
            timestamp: Date.now()
        })
    }),
    lchmod: (function(path, mode) {
        FS.chmod(path, mode, true)
    }),
    fchmod: (function(fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        FS.chmod(stream.node, mode)
    }),
    chown: (function(path, uid, gid, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        node.node_ops.setattr(node, {
            timestamp: Date.now()
        })
    }),
    lchown: (function(path, uid, gid) {
        FS.chown(path, uid, gid, true)
    }),
    fchown: (function(fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        FS.chown(stream.node, uid, gid)
    }),
    truncate: (function(path, len) {
        if (len < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: true
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var err = FS.nodePermissions(node, "w");
        if (err) {
            throw new FS.ErrnoError(err)
        }
        node.node_ops.setattr(node, {
            size: len,
            timestamp: Date.now()
        })
    }),
    ftruncate: (function(fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        FS.truncate(stream.node, len)
    }),
    utime: (function(path, atime, mtime) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        node.node_ops.setattr(node, {
            timestamp: Math.max(atime, mtime)
        })
    }),
    open: (function(path, flags, mode, fd_start, fd_end) {
        if (path === "") {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === "undefined" ? 438 : mode;
        if (flags & 64) {
            mode = mode & 4095 | 32768
        } else {
            mode = 0
        }
        var node;
        if (typeof path === "object") {
            node = path
        } else {
            path = PATH.normalize(path);
            try {
                var lookup = FS.lookupPath(path, {
                    follow: !(flags & 131072)
                });
                node = lookup.node
            } catch (e) {}
        }
        var created = false;
        if (flags & 64) {
            if (node) {
                if (flags & 128) {
                    throw new FS.ErrnoError(ERRNO_CODES.EEXIST)
                }
            } else {
                node = FS.mknod(path, mode, 0);
                created = true
            }
        }
        if (!node) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (FS.isChrdev(node.mode)) {
            flags &= ~512
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        if (!created) {
            var err = FS.mayOpen(node, flags);
            if (err) {
                throw new FS.ErrnoError(err)
            }
        }
        if (flags & 512) {
            FS.truncate(node, 0)
        }
        flags &= ~(128 | 512);
        var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
        }, fd_start, fd_end);
        if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles) FS.readFiles = {};
            if (!(path in FS.readFiles)) {
                FS.readFiles[path] = 1;
                Module["printErr"]("read file: " + path)
            }
        }
        try {
            if (FS.trackingDelegate["onOpenFile"]) {
                var trackingFlags = 0;
                if ((flags & 2097155) !== 1) {
                    trackingFlags |= FS.tracking.openFlags.READ
                }
                if ((flags & 2097155) !== 0) {
                    trackingFlags |= FS.tracking.openFlags.WRITE
                }
                FS.trackingDelegate["onOpenFile"](path, trackingFlags)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
        }
        return stream
    }),
    close: (function(stream) {
        if (stream.getdents) stream.getdents = null;
        try {
            if (stream.stream_ops.close) {
                stream.stream_ops.close(stream)
            }
        } catch (e) {
            throw e
        } finally {
            FS.closeStream(stream.fd)
        }
    }),
    llseek: (function(stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position
    }),
    read: (function(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var seeking = true;
        if (typeof position === "undefined") {
            position = stream.position;
            seeking = false
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead
    }),
    write: (function(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if (stream.flags & 1024) {
            FS.llseek(stream, 0, 2)
        }
        var seeking = true;
        if (typeof position === "undefined") {
            position = stream.position;
            seeking = false
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
            if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)
        } catch (e) {
            console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message)
        }
        return bytesWritten
    }),
    allocate: (function(stream, offset, length) {
        if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
        }
        stream.stream_ops.allocate(stream, offset, length)
    }),
    mmap: (function(stream, buffer, offset, length, position, prot, flags) {
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(ERRNO_CODES.EACCES)
        }
        if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
    }),
    msync: (function(stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
            return 0
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    }),
    munmap: (function(stream) {
        return 0
    }),
    ioctl: (function(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
    }),
    readFile: (function(path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || "r";
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
            ret = buf
        }
        FS.close(stream);
        return ret
    }),
    writeFile: (function(path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || "w";
        opts.encoding = opts.encoding || "utf8";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === "utf8") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn)
        } else if (opts.encoding === "binary") {
            FS.write(stream, data, 0, data.length, 0, opts.canOwn)
        }
        FS.close(stream)
    }),
    cwd: (function() {
        return FS.currentPath
    }),
    chdir: (function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        if (lookup.node === null) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        var err = FS.nodePermissions(lookup.node, "x");
        if (err) {
            throw new FS.ErrnoError(err)
        }
        FS.currentPath = lookup.path
    }),
    createDefaultDirectories: (function() {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user")
    }),
    createDefaultDevices: (function() {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
            read: (function() {
                return 0
            }),
            write: (function(stream, buffer, offset, length, pos) {
                return length
            })
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var random_device;
        if (typeof crypto !== "undefined") {
            var randomBuffer = new Uint8Array(1);
            random_device = (function() {
                crypto.getRandomValues(randomBuffer);
                return randomBuffer[0]
            })
        } else if (ENVIRONMENT_IS_NODE) {
            random_device = (function() {
                return require("crypto")["randomBytes"](1)[0]
            })
        } else {
            random_device = (function() {
                return Math.random() * 256 | 0
            })
        }
        FS.createDevice("/dev", "random", random_device);
        FS.createDevice("/dev", "urandom", random_device);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp")
    }),
    createSpecialDirectories: (function() {
        FS.mkdir("/proc");
        FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({
            mount: (function() {
                var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
                node.node_ops = {
                    lookup: (function(parent, name) {
                        var fd = +name;
                        var stream = FS.getStream(fd);
                        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                        var ret = {
                            parent: null,
                            mount: {
                                mountpoint: "fake"
                            },
                            node_ops: {
                                readlink: (function() {
                                    return stream.path
                                })
                            }
                        };
                        ret.parent = ret;
                        return ret
                    })
                };
                return node
            })
        }, {}, "/proc/self/fd")
    }),
    createStandardStreams: (function() {
        if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
            FS.symlink("/dev/tty1", "/dev/stderr")
        }
        var stdin = FS.open("/dev/stdin", "r");
        assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
        var stdout = FS.open("/dev/stdout", "w");
        assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
        var stderr = FS.open("/dev/stderr", "w");
        assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
    }),
    ensureErrnoError: (function() {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
            this.node = node;
            this.setErrno = (function(errno) {
                this.errno = errno;
                for (var key in ERRNO_CODES) {
                    if (ERRNO_CODES[key] === errno) {
                        this.code = key;
                        break
                    }
                }
            });
            this.setErrno(errno);
            this.message = ERRNO_MESSAGES[errno];
            if (this.stack) Object.defineProperty(this, "stack", {
                value: (new Error).stack
            })
        };
        FS.ErrnoError.prototype = new Error;
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [ERRNO_CODES.ENOENT].forEach((function(code) {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>"
        }))
    }),
    staticInit: (function() {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = {
            "MEMFS": MEMFS,
            "IDBFS": IDBFS,
            "NODEFS": NODEFS,
            "WORKERFS": WORKERFS
        }
    }),
    init: (function(input, output, error) {
        assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module["stdin"] = input || Module["stdin"];
        Module["stdout"] = output || Module["stdout"];
        Module["stderr"] = error || Module["stderr"];
        FS.createStandardStreams()
    }),
    quit: (function() {
        FS.init.initialized = false;
        var fflush = Module["_fflush"];
        if (fflush) fflush(0);
        for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
                continue
            }
            FS.close(stream)
        }
    }),
    getMode: (function(canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode
    }),
    joinPath: (function(parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == "/") path = path.substr(1);
        return path
    }),
    absolutePath: (function(relative, base) {
        return PATH.resolve(base, relative)
    }),
    standardizePath: (function(path) {
        return PATH.normalize(path)
    }),
    findObject: (function(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
            return ret.object
        } else {
            ___setErrNo(ret.error);
            return null
        }
    }),
    analyzePath: (function(path, dontResolveLastLink) {
        try {
            var lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            path = lookup.path
        } catch (e) {}
        var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
        };
        try {
            var lookup = FS.lookupPath(path, {
                parent: true
            });
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/"
        } catch (e) {
            ret.error = e.errno
        }
        return ret
    }),
    createFolder: (function(parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode)
    }),
    createPath: (function(parent, path, canRead, canWrite) {
        parent = typeof parent === "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
            var part = parts.pop();
            if (!part) continue;
            var current = PATH.join2(parent, part);
            try {
                FS.mkdir(current)
            } catch (e) {}
            parent = current
        }
        return current
    }),
    createFile: (function(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode)
    }),
    createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
            if (typeof data === "string") {
                var arr = new Array(data.length);
                for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
                data = arr
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, "w");
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode)
        }
        return node
    }),
    createDevice: (function(parent, name, input, output) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
            open: (function(stream) {
                stream.seekable = false
            }),
            close: (function(stream) {
                if (output && output.buffer && output.buffer.length) {
                    output(10)
                }
            }),
            read: (function(stream, buffer, offset, length, pos) {
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = input()
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES.EIO)
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
                    }
                    if (result === null || result === undefined) break;
                    bytesRead++;
                    buffer[offset + i] = result
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now()
                }
                return bytesRead
            }),
            write: (function(stream, buffer, offset, length, pos) {
                for (var i = 0; i < length; i++) {
                    try {
                        output(buffer[offset + i])
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES.EIO)
                    }
                }
                if (length) {
                    stream.node.timestamp = Date.now()
                }
                return i
            })
        });
        return FS.mkdev(path, mode, dev)
    }),
    createLink: (function(parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path)
    }),
    forceLoadFile: (function(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
        } else if (Module["read"]) {
            try {
                obj.contents = intArrayFromString(Module["read"](obj.url), true);
                obj.usedBytes = obj.contents.length
            } catch (e) {
                success = false
            }
        } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success
    }),
    createLazyFile: (function(parent, name, url, canRead, canWrite) {
        function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
                return undefined
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset]
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            var xhr = new XMLHttpRequest;
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing) chunkSize = datalength;
            var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType("text/plain; charset=x-user-defined")
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                    return new Uint8Array(xhr.response || [])
                } else {
                    return intArrayFromString(xhr.responseText || "", true)
                }
            });
            var lazyArray = this;
            lazyArray.setDataGetter((function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] === "undefined") {
                    lazyArray.chunks[chunkNum] = doXHR(start, end)
                }
                if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum]
            }));
            if (usesGzip || !datalength) {
                chunkSize = datalength = 1;
                datalength = this.getter(0).length;
                chunkSize = datalength;
                console.log("LazyFiles on gzip forces download of the whole file when length is accessed")
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true
        };
        if (typeof XMLHttpRequest !== "undefined") {
            if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            Object.defineProperties(lazyArray, {
                length: {
                    get: (function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._length
                    })
                },
                chunkSize: {
                    get: (function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._chunkSize
                    })
                }
            });
            var properties = {
                isDevice: false,
                contents: lazyArray
            }
        } else {
            var properties = {
                isDevice: false,
                url: url
            }
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
            node.contents = properties.contents
        } else if (properties.url) {
            node.contents = null;
            node.url = properties.url
        }
        Object.defineProperties(node, {
            usedBytes: {
                get: (function() {
                    return this.contents.length
                })
            }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((function(key) {
            var fn = node.stream_ops[key];
            stream_ops[key] = function forceLoadLazyFile() {
                if (!FS.forceLoadFile(node)) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
                return fn.apply(null, arguments)
            }
        }));
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
            if (!FS.forceLoadFile(node)) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO)
            }
            var contents = stream.node.contents;
            if (position >= contents.length) return 0;
            var size = Math.min(contents.length - position, length);
            assert(size >= 0);
            if (contents.slice) {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i]
                }
            } else {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i)
                }
            }
            return size
        };
        node.stream_ops = stream_ops;
        return node
    }),
    createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency("cp " + fullname);

        function processData(byteArray) {
            function finish(byteArray) {
                if (preFinish) preFinish();
                if (!dontCreateFile) {
                    FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                }
                if (onload) onload();
                removeRunDependency(dep)
            }
            var handled = false;
            Module["preloadPlugins"].forEach((function(plugin) {
                if (handled) return;
                if (plugin["canHandle"](fullname)) {
                    plugin["handle"](byteArray, fullname, finish, (function() {
                        if (onerror) onerror();
                        removeRunDependency(dep)
                    }));
                    handled = true
                }
            }));
            if (!handled) finish(byteArray)
        }
        addRunDependency(dep);
        if (typeof url == "string") {
            Browser.asyncLoad(url, (function(byteArray) {
                processData(byteArray)
            }), onerror)
        } else {
            processData(url)
        }
    }),
    indexedDB: (function() {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    }),
    DB_NAME: (function() {
        return "EM_FS_" + window.location.pathname
    }),
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: (function(paths, onload, onerror) {
        onload = onload || (function() {});
        onerror = onerror || (function() {});
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
            console.log("creating db");
            var db = openRequest.result;
            db.createObjectStore(FS.DB_STORE_NAME)
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach((function(path) {
                var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                putRequest.onsuccess = function putRequest_onsuccess() {
                    ok++;
                    if (ok + fail == total) finish()
                };
                putRequest.onerror = function putRequest_onerror() {
                    fail++;
                    if (ok + fail == total) finish()
                }
            }));
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    }),
    loadFilesFromDB: (function(paths, onload, onerror) {
        onload = onload || (function() {});
        onerror = onerror || (function() {});
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = onerror;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            try {
                var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
            } catch (e) {
                onerror(e);
                return
            }
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach((function(path) {
                var getRequest = files.get(path);
                getRequest.onsuccess = function getRequest_onsuccess() {
                    if (FS.analyzePath(path).exists) {
                        FS.unlink(path)
                    }
                    FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                    ok++;
                    if (ok + fail == total) finish()
                };
                getRequest.onerror = function getRequest_onerror() {
                    fail++;
                    if (ok + fail == total) finish()
                }
            }));
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    })
};
var SYSCALLS = {
    DEFAULT_POLLMASK: 5,
    mappings: {},
    umask: 511,
    calculateAt: (function(dirfd, path) {
        if (path[0] !== "/") {
            var dir;
            if (dirfd === -100) {
                dir = FS.cwd()
            } else {
                var dirstream = FS.getStream(dirfd);
                if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                dir = dirstream.path
            }
            path = PATH.join2(dir, path)
        }
        return path
    }),
    doStat: (function(func, path, buf) {
        try {
            var stat = func(path)
        } catch (e) {
            if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                return -ERRNO_CODES.ENOTDIR
            }
            throw e
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = 0;
        HEAP32[buf + 8 >> 2] = stat.ino;
        HEAP32[buf + 12 >> 2] = stat.mode;
        HEAP32[buf + 16 >> 2] = stat.nlink;
        HEAP32[buf + 20 >> 2] = stat.uid;
        HEAP32[buf + 24 >> 2] = stat.gid;
        HEAP32[buf + 28 >> 2] = stat.rdev;
        HEAP32[buf + 32 >> 2] = 0;
        HEAP32[buf + 36 >> 2] = stat.size;
        HEAP32[buf + 40 >> 2] = 4096;
        HEAP32[buf + 44 >> 2] = stat.blocks;
        HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
        HEAP32[buf + 52 >> 2] = 0;
        HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
        HEAP32[buf + 60 >> 2] = 0;
        HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
        HEAP32[buf + 68 >> 2] = 0;
        HEAP32[buf + 72 >> 2] = stat.ino;
        return 0
    }),
    doMsync: (function(addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags)
    }),
    doMkdir: (function(path, mode) {
        path = PATH.normalize(path);
        if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
        FS.mkdir(path, mode, 0);
        return 0
    }),
    doMknod: (function(path, mode, dev) {
        switch (mode & 61440) {
            case 32768:
            case 8192:
            case 24576:
            case 4096:
            case 49152:
                break;
            default:
                return -ERRNO_CODES.EINVAL
        }
        FS.mknod(path, mode, dev);
        return 0
    }),
    doReadlink: (function(path, buf, bufsize) {
        if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf + len];
        stringToUTF8(ret, buf, bufsize + 1);
        HEAP8[buf + len] = endChar;
        return len
    }),
    doAccess: (function(path, amode) {
        if (amode & ~7) {
            return -ERRNO_CODES.EINVAL
        }
        var node;
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        node = lookup.node;
        var perms = "";
        if (amode & 4) perms += "r";
        if (amode & 2) perms += "w";
        if (amode & 1) perms += "x";
        if (perms && FS.nodePermissions(node, perms)) {
            return -ERRNO_CODES.EACCES
        }
        return 0
    }),
    doDup: (function(path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd
    }),
    doReadv: (function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.read(stream, HEAP8, ptr, len, offset);
            if (curr < 0) return -1;
            ret += curr;
            if (curr < len) break
        }
        return ret
    }),
    doWritev: (function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.write(stream, HEAP8, ptr, len, offset);
            if (curr < 0) return -1;
            ret += curr
        }
        return ret
    }),
    varargs: 0,
    get: (function(varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return ret
    }),
    getStr: (function() {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret
    }),
    getStreamFromFD: (function() {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream
    }),
    getSocketFromFD: (function() {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket
    }),
    getSocketAddress: (function(allowNull) {
        var addrp = SYSCALLS.get(),
            addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info
    }),
    get64: (function() {
        var low = SYSCALLS.get(),
            high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low
    }),
    getZero: (function() {
        assert(SYSCALLS.get() === 0)
    })
};

function ___syscall20(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        return PROCINFO.pid
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function _ftime(p) {
    var millis = Date.now();
    HEAP32[p >> 2] = millis / 1e3 | 0;
    HEAP16[p + 4 >> 1] = millis % 1e3;
    HEAP16[p + 6 >> 1] = 0;
    HEAP16[p + 8 >> 1] = 0;
    return 0
}
var ___tm_current = STATICTOP;
STATICTOP += 48;
var ___tm_timezone = allocate(intArrayFromString("GMT"), "i8", ALLOC_STATIC);

function _gmtime_r(time, tmPtr) {
    var date = new Date(HEAP32[time >> 2] * 1e3);
    HEAP32[tmPtr >> 2] = date.getUTCSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
    HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
    HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
    HEAP32[tmPtr + 36 >> 2] = 0;
    HEAP32[tmPtr + 32 >> 2] = 0;
    var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
    var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 40 >> 2] = ___tm_timezone;
    return tmPtr
}

function _gmtime(time) {
    return _gmtime_r(time, ___tm_current)
}

function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest
}
FS.staticInit();
__ATINIT__.unshift((function() {
    if (!Module["noFSInit"] && !FS.init.initialized) FS.init()
}));
__ATMAIN__.push((function() {
    FS.ignorePermissions = false
}));
__ATEXIT__.push((function() {
    FS.quit()
}));
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift((function() {
    TTY.init()
}));
__ATEXIT__.push((function() {
    TTY.shutdown()
}));
if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    var NODEJS_PATH = require("path");
    NODEFS.staticInit()
}
DYNAMICTOP_PTR = staticAlloc(4);
STACK_BASE = STACKTOP = alignMemory(STATICTOP);
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = alignMemory(STACK_MAX);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
staticSealed = true;
var ASSERTIONS = false;

function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array
}

function intArrayToString(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
        var chr = array[i];
        if (chr > 255) {
            if (ASSERTIONS) {
                assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.")
            }
            chr &= 255
        }
        ret.push(String.fromCharCode(chr))
    }
    return ret.join("")
}
var decodeBase64 = typeof atob === "function" ? atob : (function(input) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));
        chr1 = enc1 << 2 | enc2 >> 4;
        chr2 = (enc2 & 15) << 4 | enc3 >> 2;
        chr3 = (enc3 & 3) << 6 | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 !== 64) {
            output = output + String.fromCharCode(chr2)
        }
        if (enc4 !== 64) {
            output = output + String.fromCharCode(chr3)
        }
    } while (i < input.length);
    return output
});

function intArrayFromBase64(s) {
    if (typeof ENVIRONMENT_IS_NODE === "boolean" && ENVIRONMENT_IS_NODE) {
        var buf;
        try {
            buf = Buffer.from(s, "base64")
        } catch (_) {
            buf = new Buffer(s, "base64")
        }
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    }
    try {
        var decoded = decodeBase64(s);
        var bytes = new Uint8Array(decoded.length);
        for (var i = 0; i < decoded.length; ++i) {
            bytes[i] = decoded.charCodeAt(i)
        }
        return bytes
    } catch (_) {
        throw new Error("Converting base64 string to bytes failed.")
    }
}

function tryParseAsDataURI(filename) {
    if (!isDataURI(filename)) {
        return
    }
    return intArrayFromBase64(filename.slice(dataURIPrefix.length))
}
Module["wasmTableSize"] = 12;
Module["wasmMaxTableSize"] = 12;
Module.asmGlobalArg = {};
Module.asmLibraryArg = {
    "abort": abort,
    "enlargeMemory": enlargeMemory,
    "getTotalMemory": getTotalMemory,
    "abortOnCannotGrowMemory": abortOnCannotGrowMemory,
    "___setErrNo": ___setErrNo,
    "___syscall20": ___syscall20,
    "_emscripten_memcpy_big": _emscripten_memcpy_big,
    "_ftime": _ftime,
    "_gmtime": _gmtime,
    "DYNAMICTOP_PTR": DYNAMICTOP_PTR,
    "STACKTOP": STACKTOP
};
var asm = Module["asm"](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
Module["asm"] = asm;
var ___errno_location = Module["___errno_location"] = (function() {
    return Module["asm"]["___errno_location"].apply(null, arguments)
});
var _emscripten_get_global_libc = Module["_emscripten_get_global_libc"] = (function() {
    return Module["asm"]["_emscripten_get_global_libc"].apply(null, arguments)
});
var _hash_cn = Module["_hash_cn"] = (function() {
    return Module["asm"]["_hash_cn"].apply(null, arguments)
});
var _malloc = Module["_malloc"] = (function() {
    return Module["asm"]["_malloc"].apply(null, arguments)
});
var setThrew = Module["setThrew"] = (function() {
    return Module["asm"]["setThrew"].apply(null, arguments)
});
var stackAlloc = Module["stackAlloc"] = (function() {
    return Module["asm"]["stackAlloc"].apply(null, arguments)
});
var stackRestore = Module["stackRestore"] = (function() {
    return Module["asm"]["stackRestore"].apply(null, arguments)
});
var stackSave = Module["stackSave"] = (function() {
    return Module["asm"]["stackSave"].apply(null, arguments)
});
var dynCall_iiii = Module["dynCall_iiii"] = (function() {
    return Module["asm"]["dynCall_iiii"].apply(null, arguments)
});
var dynCall_viii = Module["dynCall_viii"] = (function() {
    return Module["asm"]["dynCall_viii"].apply(null, arguments)
});
Module["asm"] = asm;

function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
dependenciesFulfilled = function runCaller() {
    if (!Module["calledRun"]) run();
    if (!Module["calledRun"]) dependenciesFulfilled = runCaller
};

function run(args) {
    args = args || Module["arguments"];
    if (preloadStartTime === null) preloadStartTime = Date.now();
    if (runDependencies > 0) {
        return
    }
    preRun();
    if (runDependencies > 0) return;
    if (Module["calledRun"]) return;

    function doRun() {
        if (Module["calledRun"]) return;
        Module["calledRun"] = true;
        if (ABORT) return;
        ensureInitRuntime();
        preMain();
        if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout((function() {
            setTimeout((function() {
                Module["setStatus"]("")
            }), 1);
            doRun()
        }), 1)
    } else {
        doRun()
    }
}
Module["run"] = run;

function exit(status, implicit) {
    if (implicit && Module["noExitRuntime"] && status === 0) {
        return
    }
    if (Module["noExitRuntime"]) {} else {
        ABORT = true;
        EXITSTATUS = status;
        STACKTOP = initialStackTop;
        exitRuntime();
        if (Module["onExit"]) Module["onExit"](status)
    }
    if (ENVIRONMENT_IS_NODE) {
        process["exit"](status)
    }
    Module["quit"](status, new ExitStatus(status))
}
Module["exit"] = exit;
var abortDecorators = [];

function abort(what) {
    if (Module["onAbort"]) {
        Module["onAbort"](what)
    }
    if (what !== undefined) {
        Module.print(what);
        Module.printErr(what);
        what = JSON.stringify(what)
    } else {
        what = ""
    }
    ABORT = true;
    EXITSTATUS = 1;
    var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
    var output = "abort(" + what + ") at " + stackTrace() + extra;
    if (abortDecorators) {
        abortDecorators.forEach((function(decorator) {
            output = decorator(output, what)
        }))
    }
    throw output
}
Module["abort"] = abort;
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
Module["noExitRuntime"] = true;
run()
