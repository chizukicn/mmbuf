import { describe, expect, it } from "vitest";
import { createMemoryBuffer } from "../src/index";

describe("test", async () => {
  it("run-test", async () => {
    const buffer = createMemoryBuffer([], {
    });

    buffer.writeString("hello world");

    buffer.resume();

    const str = buffer.readString();

    expect(str).toBe("hello world");

    buffer.clear();
    buffer.writeInt(1);
    buffer.writeInt(2);
    buffer.writeInt(3);
    buffer.writeLong(4);
    buffer.resume();

    expect(buffer.readInt()).toBe(1);
    expect(buffer.readInt()).toBe(2);
    expect(buffer.readInt()).toBe(3);
    expect(buffer.readLong()).toBe(4);

    buffer.resume();

    const obj = buffer.readObject({
      a: "int",
      b: "int",
      c: {
        d: "int",
        e: "int"
      }
    });

    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(obj.c.d).toBe(3);
    expect(obj.c.e).toBe(4);
  });

  it("test float", async () => {
    const buffer = createMemoryBuffer([], {
      signedNumber: false
    });

    const rawFloat = 1.22;

    buffer.writeFloat(rawFloat);
    buffer.writeDouble(Math.PI);
    buffer.resume();

    // IEEE 754处理精度
    const f = Math.round(buffer.readFloat() * 100) / 100;

    expect(f).toBe(rawFloat);
    expect(buffer.readDouble()).toBe(Math.PI);
  });
});
