export function adminDownloadName(
  identity: { petName: string; guardianName?: string | null },
  originalName: string,
  now = new Date()
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const date = ["month", "day"]
    .map(type => parts.find(part => part.type === type)!.value)
    .join("");
  const clean = (name: string) =>
    name
      .normalize("NFC")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/[. ]+$/g, "");
  const names = [
    date,
    clean(identity.petName) || "반려동물",
    identity.guardianName ? clean(identity.guardianName) : "",
  ].filter(Boolean);
  const extension = /\.gcode\.3mf$/i.test(originalName)
    ? "gcode.3mf"
    : originalName.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
  return names.join("_") + (extension ? `.${extension}` : "");
}
export function saveAdminFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
