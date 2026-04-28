import { Link } from "@/i18n/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface Props {
  title: string;
  items: NavItem[];
}

export default function RelatedNav({ title, items }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--navy-deep)" }}>
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="text-sm px-4 py-1.5 rounded-full transition-colors hover:opacity-80"
            style={{
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
