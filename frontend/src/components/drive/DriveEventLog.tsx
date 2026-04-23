import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type DriveEventLogProps = {
  title: string;
  emptyLabel: string;
  entries: string[];
};

export function DriveEventLog({ title, emptyLabel, entries }: DriveEventLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
          {entries.length === 0 ? <p>{emptyLabel}</p> : null}
          {entries.map((entry) => (
            <p key={entry} className="font-mono text-text-primary">
              {entry}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
