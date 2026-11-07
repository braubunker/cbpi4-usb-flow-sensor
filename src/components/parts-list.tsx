import { PARTS } from "@/lib/parts";
import { Badge } from "@/components/ui/badge";

export function PartsList() {
  return (
    <div className="flex flex-col gap-3">
      {PARTS.map((part) => (
        <article key={part.name} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-lg">{part.name}</h3>
            <Badge variant={part.required ? "default" : "secondary"}>
              {part.required ? "nötig" : "optional"}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium">{part.role}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{part.note}</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {part.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {link.shop}
                </a>
              </li>
            ))}
          </ul>
        </article>
      ))}
      <p className="text-sm leading-6 text-muted-foreground">
        Preise und Lager ändern sich. Die Links sind Einstiege, keine festen Angebote. Vor dem Löten den Aufdruck
        auf dem eigenen Nano prüfen, manche Klone drehen die Beschriftung auf die Unterseite.
      </p>
    </div>
  );
}
