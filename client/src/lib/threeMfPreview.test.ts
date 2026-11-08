import { expect, it } from "vitest";
import { zipSync, strToU8 } from "three/addons/libs/fflate.module.js";
import {
  inspectThreeMf,
  previewByteLimit,
  readPreviewFile,
} from "./threeMfPreview";
it("bounds preview file size, expanded ZIP size and requires model geometry", async () => {
  expect(() => inspectThreeMf(new ArrayBuffer(previewByteLimit + 1))).toThrow(
    "20MB"
  );
  expect(() =>
    inspectThreeMf(
      zipSync({ "Metadata/plate.gcode": strToU8("G28") }).buffer as ArrayBuffer
    )
  ).toThrow("3D 형상");
  const zip = zipSync({ "3D/a.model": strToU8("<model/>") });
  const view = new DataView(zip.buffer);
  for (let i = 0; i < zip.length - 4; i++)
    if (view.getUint32(i, true) === 0x02014b50)
      view.setUint32(i + 24, 65 * 1024 * 1024, true);
  expect(() => inspectThreeMf(zip.buffer as ArrayBuffer)).toThrow(
    "압축 해제 용량"
  );
  await expect(
    readPreviewFile(
      new Response("small", {
        headers: { "content-length": String(previewByteLimit + 1) },
      })
    )
  ).rejects.toThrow("20MB");
  await expect(
    readPreviewFile(new Response("no", { status: 403 }))
  ).rejects.toThrow("다시 시도");
  expect(
    new TextDecoder().decode(await readPreviewFile(new Response("model")))
  ).toBe("model");
});
