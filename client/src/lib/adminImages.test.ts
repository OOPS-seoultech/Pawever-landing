import { expect, it } from "vitest";
import { currentMultiviews } from "./adminImages";
import type { WorkflowOrder } from "./adminContracts";
it("shows only latest replacement of each image from the same pet's modeling attempt", () => {
  const row = {
    modelingTaskId: 11,
    taskAttempt: 2,
    artifacts: [
      { id: "old-front", taskId: 11, kind: "MULTIVIEW" },
      { id: "left", taskId: 11, kind: "MULTIVIEW" },
      {
        id: "new-front",
        taskId: 11,
        kind: "MULTIVIEW",
        replacesArtifactId: "old-front",
      },
      {
        id: "final-front",
        taskId: 11,
        kind: "MULTIVIEW",
        replacesArtifactId: "new-front",
      },
      { id: "other-pet", taskId: 12, kind: "MULTIVIEW" },
      { id: "previous-attempt", taskId: 10, kind: "MULTIVIEW" },
      { id: "model", taskId: 11, kind: "MODEL_SOURCE" },
    ],
  } as WorkflowOrder;
  expect(currentMultiviews(row).map(file => file.id)).toEqual([
    "final-front",
    "left",
  ]);
  expect(row.artifacts).toHaveLength(7);
});
it("uses attempt metadata when a modeling task id is not returned", () => {
  const row = {
    taskAttempt: 2,
    artifacts: [
      { id: "new", kind: "MULTIVIEW", modelingAttempt: 2 },
      { id: "old", kind: "MULTIVIEW", modelingAttempt: 1 },
    ],
  } as WorkflowOrder;
  expect(currentMultiviews(row).map(file => file.id)).toEqual(["new"]);
});
