export function StatusPill({ value }: { value: string }) {
  const key = value.toLowerCase().replace(/\s+/g, "-");
  return <span className={`status-pill status-${key}`}>{value || "Unmarked"}</span>;
}
