import type { WorkflowOrder } from "./adminContracts";
export function currentMultiviews(row: WorkflowOrder) {
  const replaced = new Set(
    row.artifacts.map(file => file.replacesArtifactId).filter(Boolean)
  );
  const position = (file: WorkflowOrder["artifacts"][number]) => {
    let original = file;
    for (
      let i = 0;
      i < row.artifacts.length && original.replacesArtifactId;
      i++
    ) {
      const previous = row.artifacts.find(
        item => item.id === original.replacesArtifactId
      );
      if (!previous) break;
      original = previous;
    }
    return row.artifacts.indexOf(original);
  };
  return row.artifacts
    .filter(
      file =>
        file.kind === "MULTIVIEW" &&
        !replaced.has(file.id) &&
        (row.modelingTaskId != null
          ? file.taskId === row.modelingTaskId
          : file.modelingAttempt === row.taskAttempt)
    )
    .sort((a, b) => position(a) - position(b));
}
