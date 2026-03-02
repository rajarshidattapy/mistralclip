import { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function Track({ title, children }: Props) {
  return (
    <div className="stack">
      <p className="mono">{title}</p>
      <div className="timeline-lane">{children}</div>
    </div>
  );
}

