import { createMemoryBuffer } from "../src/index";
import { describe, expect, it } from "vitest";

describe("data", async () => {
	it("mock-data", async () => {
		const buffer = createMemoryBuffer([
			0x02, 0x00, 0x00, 0x00,
			0x01, 0x00, 0x00, 0x00,
			0x03, 0x00, 0x00, 0x00,
		]);


		expect(buffer.readInt()).toBe(2);
		expect(buffer.readInt()).toBe(1);
		expect(buffer.readInt()).toBe(3);
		buffer.resume();
		expect(buffer.readLong()).toBe(3);

		buffer.resume();
		const obj = buffer.readObject({
			a: "int",
			b: "int",
		});
		expect(obj.a).toBe(2);
		expect(obj.b).toBe(1);

	});
});
