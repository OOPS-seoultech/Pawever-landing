import { it, expect } from "vitest";
import { adminDownloadName } from "./adminDownloads";
it("uses Korean download date, visible identity and preserves the complete extension", () => {
  const now = new Date("2026-11-07T15:30:00Z");
  const identity = { petName: "나비", guardianName: "이종무" };
  expect(adminDownloadName(identity, "original.3mf", now)).toBe(
    "1108_나비_이종무.3mf"
  );
  expect(adminDownloadName(identity, "original.GCODE.3MF", now)).toBe(
    "1108_나비_이종무.gcode.3mf"
  );
  expect(adminDownloadName(identity, "views.zip", now)).toBe(
    "1108_나비_이종무.zip"
  );
  expect(adminDownloadName({ petName: "나비" }, "front.PNG", now)).toBe(
    "1108_나비.png"
  );
  expect(
    adminDownloadName(
      { petName: "나/비", guardianName: "이:종무" },
      "front.png",
      now
    )
  ).toBe("1108_나_비_이_종무.png");
});
