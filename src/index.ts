export interface MemoryBufferHandlers {
  [key: string]: (buffer: MemoryBuffer, ...args: any[]) => any
}

export interface MemoryBufferDefineObject {
  [key: string]: MemoryBufferDefineType
}

export type MemoryBufferDefineType = string | number | [string, ...any[]] | MemoryBufferDefineObject | ((buffer: MemoryBuffer) => any);
export interface MemoryBuffer extends Record<string, any> {
  readonly offset: number
  readonly length: number
  readonly buffer: Uint8Array
  readonly bufferChunkSize: number

  [Symbol.iterator](): Iterator<number>

  skip(length: number, start?: number): this
  resume(start?: number): this
  clear(): this

  readNumber(length: number, signed?: boolean): number
  readString(length?: number): string
  readBytes(length: number): Uint8Array
  readObject<T extends Record<string, any> = MemoryBufferDefineObject>(define: T): any
  readInt(signed?: boolean): number
  readShort(signed?: boolean): number
  readByte(signed?: boolean): number
  readLong(signed?: boolean): number
  readFloat(signed?: boolean): number
  readDouble(signed?: boolean): number

  readArray(length: number, define: MemoryBufferDefineType): any[]

  writeNumber(value: number, length: number, signed?: boolean): this
  writeString(value: string, length?: number): this
  writeBytes(value: Uint8Array): this
  writeObject<T extends Record<string, any> = MemoryBufferDefineObject>(value: T, define: T): this
  writeInt(value: number, signed?: boolean): this
  writeShort(value: number, signed?: boolean): this
  writeByte(value: number, signed?: boolean): this
  writeLong(value: number, signed?: boolean): this
  writeFloat(value: number, signed?: boolean): this
  writeDouble(value: number, signed?: boolean): this

  writeArray(value: any[], length: number, define: MemoryBufferDefineType): this

  defineRead(defineRecord: MemoryBufferDefineType): () => any
  defineWrite(defineRecord: MemoryBufferDefineType): (value: any) => this
}

// 将字节数组转换为无符号的数字,正序读
function bytesToUNumber(bytes: Uint8Array) {
  return bytes.reduce((n, b, i) => n | b * (1 << (i * 8)), 0);
}

function numberToBytes(n: number, length: number) {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = n >> (i * 8) & 0xFF;
  }
  return bytes;
}

export function bytesToFloat(bytes: Uint8Array, signed = true) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  for (let i = 0; i < 4; i++) {
    view.setUint8(i, bytes[i] & 0xFF);
  }
  return view.getFloat32(0, signed);
}

function floatToBytes(n: number, signed = true): Uint8Array {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, n, signed);
  const bytes = new Uint8Array(buffer);
  return bytes;
}

function bytesToDouble(bytes: Uint8Array, signed = true) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[i] & 0xFF);
  }
  return view.getFloat64(0, signed);
}

function doubleToBytes(n: number, signed = true): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, n, signed);
  return new Uint8Array(buffer);
}

// 将字节数组转换为带符号的数字
function toSignedNumber(n: number) {
  return n > 0x7FFFFFFF ? n - 0x100000000 : n;
}

function toUnsignedNumber(n: number) {
  return n < 0 ? n + 0x100000000 : n;
}

// 将字节数组转换为字符串
function bytesToString(bytes: Uint8Array) {
  return String.fromCharCode(...bytes).replace(/\0+$/g, "");
}

// 将字符串转换为字节数组
function stringToBytes(str: string, length: number) {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    if (i >= str.length) {
      break;
    }
    bytes[i] = str.charCodeAt(i) || 0;
  }
  return bytes;
}

// 驼峰式命名
function toCamelCase(str: string) {
  return str.replace(/[_-][a-z]/g, (match) => {
    return match[1].toUpperCase();
  });
}

export interface MemoryBufferOptions {
  startOffset?: number
  signedNumber?: boolean
  bufferChunkSize?: number
  memoizeDefine?: ((...args: any[]) => any) | boolean
}

function sizeOf<T>(iterable: Iterable<T>) {
  let size = 0;
  for (const _ of iterable) {
    size++;
  }
  return size;
}

export function createMemoryBuffer(bytes: Iterable<number> = [], options: MemoryBufferOptions = {}): MemoryBuffer {
  let _buffer = new Uint8Array(bytes);

  const _bufferChunkSize = options.bufferChunkSize ?? 128;

  let _length = sizeOf(bytes);

  let _offset = options.startOffset ?? 0;

  const memoizeDefine = options.memoizeDefine ?? true;

  const memoize = function<P extends any[], R>(fn: (...args: any[]) => any) {
    if (!memoizeDefine) {
      return fn;
    }

    const cache = new Map();
    return function (this: any, ...args: P) {
      const key = typeof memoizeDefine === "function" ? memoizeDefine(...args) : args;
      if (cache.has(key)) {
        return cache.get(key) as R;
      }
      const value = fn.call(this, ...args);
      cache.set(key, value);
      return value;
    };
  };

  return {
    get offset() {
      return _offset;
    },
    get length() {
      return _length;
    },
    get bufferChunkSize() {
      return _bufferChunkSize;
    },
    get buffer() {
      return _buffer;
    },
    [Symbol.iterator]() {
      return _buffer[Symbol.iterator]();
    },
    skip(length: number, start = -1) {
      if (start >= 0) {
        _offset = start;
      }
      _offset += length;
      return this;
    },
    resume(start = -1) {
      _offset = start >= 0 ? start : 0;
      return this;
    },
    toUint8Array() {
      return _buffer;
    },
    readNumber(length: number, signed = options.signedNumber) {
      const bytes = this.readBytes(length);
      let value = bytesToUNumber(bytes);
      if (signed) {
        value = toSignedNumber(value);
      }
      return value;
    },
    readInt(signed) {
      return this.readNumber(4, signed);
    },
    readShort(signed) {
      return this.readNumber(2, signed);
    },
    readByte(signed) {
      return this.readNumber(1, signed);
    },
    readLong(signed) {
      return this.readNumber(8, signed);
    },
    readFloat(signed = options.signedNumber) {
      return bytesToFloat(this.readBytes(4), signed);
    },
    readDouble(signed = options.signedNumber) {
      return bytesToDouble(this.readBytes(8), signed);
    },
    readString(length?: number) {
      if (!length) {
        length = _buffer.findIndex((b, i) => i > _offset && b === 0);
      }
      if (length < 0) {
        length = _buffer.length - _offset;
      }
      const bytes = this.readBytes(length);
      return bytesToString(bytes);
    },
    readBytes(length: number) {
      const rs = _buffer.subarray(_offset, _offset + length);
      this.skip(length);
      return rs;
    },
    defineRead: memoize(function (this: MemoryBuffer, defineRecord: string | number | [string, ...any[]] | MemoryBufferDefineObject) {
      const isBytes = typeof defineRecord === "number";
      const isString = typeof defineRecord === "string";
      const isArgs = Array.isArray(defineRecord);
      const isObject = !isArgs && typeof defineRecord === "object" && defineRecord !== null;
      const handler = () => {
        if (isBytes) {
          return this.readBytes(defineRecord);
        } else if (isString) {
          const methodName = toCamelCase(`read_${defineRecord}`);
          return this[methodName as keyof MemoryBuffer]();
        } else if (isArgs) {
          const [type, ...args] = defineRecord;
          const methodName = toCamelCase(`read_${type}`);
          return this[methodName as keyof MemoryBuffer](...args);
        } else if (isObject) {
          return this.readObject(defineRecord);
        }
      };
      return handler;
    }),
    defineWrite: memoize(function (this: MemoryBuffer, defineRecord: string | number | [string, ...any[]] | MemoryBufferDefineObject) {
      const isBytes = typeof defineRecord === "number";
      const isString = typeof defineRecord === "string";
      const isArgs = Array.isArray(defineRecord);
      const isObject = !isArgs && typeof defineRecord === "object" && defineRecord !== null;
      const handler = (value: any) => {
        if (isBytes) {
          this.writeBytes(value);
        } else if (isString) {
          const methodName = toCamelCase(`write_${defineRecord}`);
          this[methodName as keyof MemoryBuffer](value);
        } else if (isArgs) {
          const [type, ...args] = defineRecord;
          const methodName = toCamelCase(`write_${type}`);
          this[methodName as keyof MemoryBuffer](value, ...args);
        } else if (isObject) {
          this.writeObject(value, defineRecord);
        }
        return this;
      };
      return handler;
    }),

    readObject<T extends object = MemoryBufferDefineObject>(this: MemoryBuffer, define: T) {
      const rs: Record<string, any> = {};
      for (const key in define) {
        const value = define[key] as MemoryBufferDefineType;
        rs[key] = this.defineRead(value)();
      }
      return rs as ReturnType<MemoryBuffer["readObject"]>;
    },
    readArray(this: MemoryBuffer, define: MemoryBufferDefineType, length: number) {
      const rs: any[] = [];
      const handler = this.defineRead(define);
      for (let i = 0; i < length; i++) {
        rs.push(handler());
      }
      return rs;
    },
    writeNumber(value: number, length: number, signed = options.signedNumber) {
      if (signed) {
        value = toUnsignedNumber(value);
      }
      const bytes = numberToBytes(value, length);
      return this.writeBytes(bytes);
    },
    writeInt(value: number, signed = options.signedNumber) {
      return this.writeNumber(value, 4, signed);
    },
    writeShort(value: number, signed = options.signedNumber) {
      return this.writeNumber(value, 2, signed);
    },
    writeByte(value: number, signed = options.signedNumber) {
      return this.writeNumber(value, 1, signed);
    },
    writeLong(value: number, signed = options.signedNumber) {
      return this.writeNumber(value, 8, signed);
    },
    writeFloat(value: number, signed = options.signedNumber) {
      const bytes = floatToBytes(value, signed);
      return this.writeBytes(bytes);
    },
    writeDouble(value: number, signed = options.signedNumber) {
      const bytes = doubleToBytes(value, signed);
      return this.writeBytes(bytes);
    },
    writeString(str: string, length?: number) {
      const bytes = stringToBytes(str, length ?? str.length);
      this.writeBytes(bytes);
      return this;
    },
    writeBytes(bytes: Iterable<number>) {
      const array = Array.isArray(bytes) ? bytes : [...bytes];
      const oldLength = _buffer.length;
      const newLength = _offset + array.length;

      if (newLength > oldLength) {
        const oldBuffer = _buffer;
        // 扩充buffer
        _buffer = new Uint8Array(Math.ceil(newLength / _bufferChunkSize) * _bufferChunkSize);
        _buffer.set(oldBuffer);
        _length = newLength;
      }
      _buffer.set(array, _offset);
      _offset = newLength;
      return this;
    },
    writeObject<T extends object = MemoryBufferDefineObject>(this: MemoryBuffer, obj: T, define: T) {
      for (const key in define) {
        const value = define[key] as MemoryBufferDefineType;
        this.defineWrite(value)(obj[key]);
      }
      return this;
    },
    writeArray(this: MemoryBuffer, arr: any[], define: MemoryBufferDefineType) {
      const handler = this.defineWrite(define);
      for (const item of arr) {
        handler(item);
      }
      return this;
    },
    clear() {
      _offset = 0;
      _buffer = new Uint8Array(0);
      return this;
    }

  };
}
