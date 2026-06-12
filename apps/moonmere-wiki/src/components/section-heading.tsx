import type { ReactNode } from "react";

export function SectionHeading({
  title,
  eyebrow,
  action
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="eyebrow dark">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
