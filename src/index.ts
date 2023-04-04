



export type MemoryBufferHandlers = {
	[key: string]: (buffer: MemoryBuffer, ...args: any[]) => any
}

export interface MemoryBuffer extends Record<string, any> { 
	readonly offset: number;
	readonly length: number;
	[Symbol.iterator](): Iterator<number>;

	skip(length: number, start?: number): this;
	resume(start?: number): this;

	readNumber(length: number): number;
	readUNumber(length: number): number;
	readString(length: number): string;
	readBytes(length: number): Uint8Array;
	readObject<T extends Record<string,any> = MemoryBufferDefine>(define: T):  any
	readInt(): number;
	readUInt(): number;
	readShort(): number;
	readUShort(): number;
	readByte(): number;
	readUByte(): number;
	readLong(): number;
	readULong(): number;

}

// 将字节数组转换为无符号的数字
function bytesToUNumber(bytes: Uint8Array) {
	return bytes.reduce((n, b) => (n << 8) | b, 0);
}


// 将字节数组转换为带符号的数字
function bytesToNumber(bytes: Uint8Array) {
	const n = bytesToUNumber(bytes);
	const sign = 1 << (bytes.length * 8 - 1);
	return (n ^ sign) - sign;
}

// 将字节数组转换为字符串
function bytesToString(bytes: Uint8Array) {
	return String.fromCharCode(...bytes).replace(/\0+$/g, '');
}


// 驼峰式命名
function toCamelCase(str: string) {
	return str.replace(/[_-][a-z]/g, (match) => {
		return match[1].toUpperCase();
	});
}

export type MemoryBufferDefine = {
	[key: string]: number | string | MemoryBufferDefine | [string, ...any[]] | ((buffer: MemoryBuffer) => any)
}

export function createMemoryBuffer(bytes: Iterable<number>): MemoryBuffer {

	const buffer = new Uint8Array(bytes);

	let _offset = 0;

	return {
		get offset() {
			return _offset;
		},
		get length() {
			return buffer.length;
		},
		[Symbol.iterator]() {
			return buffer[Symbol.iterator]();
		},
		skip(length: number, start: number = -1) {
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
		readNumber(length: number) {
			const rs = bytesToNumber(buffer.subarray(_offset, _offset + length));
			this.skip(length);
			return rs;
		},
		readUNumber(length: number) {
			const rs = bytesToUNumber(buffer.subarray(_offset, _offset + length));
			this.skip(length);
			return rs;
		},
		readInt() {
			return this.readNumber(4);
		},
		readUInt() {
			return this.readUNumber(4);
		},
		readShort() {
			return this.readNumber(2);
		},
		readUShort() {
			return this.readUNumber(2);
		},
		readByte() {
			return this.readNumber(1);
		},
		readUByte() {
			return this.readUNumber(1);
		},
		readLong() {
			return this.readNumber(8);
		},
		readULong() {
			return this.readUNumber(8);
		},
		readString(length: number) {
			const rs = bytesToString(buffer.subarray(_offset, _offset + length));
			this.skip(length);
			return rs;
		},
		readBytes(length: number) {
			const rs = buffer.subarray(_offset, _offset + length);
			this.skip(length);
			return rs;
		},
		readObject<T extends object = MemoryBufferDefine>(this: MemoryBuffer, define: T) {
			const rs: Record<string, any> = {};
			for (let key in define) {
				const value = define[key];
				if (typeof value === 'number') {
					rs[key] = this.readBytes(value);
				} else if (typeof value === "string") {
					const methodName = toCamelCase(`read_${value}`);
					rs[key] = this[methodName as keyof MemoryBuffer]();
				} else if (Array.isArray(value)) {
					const [type, ...args] = value;
					const methodName = toCamelCase(`read_${type}`);
					rs[key] = this[methodName as keyof MemoryBuffer](...args);
				} else if (typeof value === 'object') {
					rs[key] = this.readObject(value as MemoryBufferDefine);
				} else if (typeof value === 'function') {
					rs[key] = value(this);
				}
			}
			return rs as ReturnType<MemoryBuffer['readObject']>;
		}
	}

}