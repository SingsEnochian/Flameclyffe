export function curvedPathBetween(source, target, options = {}) {
  const bend = options.bend ?? 70;
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const controlX = midX + normalX * bend;
  const controlY = midY + normalY * bend;

  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

export function alternatingBend(index, magnitude = 70) {
  return index % 2 === 0 ? magnitude : -magnitude;
}
