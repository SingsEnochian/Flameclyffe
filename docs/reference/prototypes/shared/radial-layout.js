export function radialLayout(items, options = {}) {
  const center = options.center ?? { x: 500, y: 390 };
  const radius = options.radius ?? 260;
  const startAngle = options.startAngle ?? -90;
  const count = Math.max(items.length, 1);

  return items.map((item, index) => {
    const angleDeg = startAngle + (360 / count) * index;
    const angleRad = angleDeg * Math.PI / 180;
    return {
      ...item,
      x: center.x + Math.cos(angleRad) * radius,
      y: center.y + Math.sin(angleRad) * radius,
      angle: angleDeg,
    };
  });
}
