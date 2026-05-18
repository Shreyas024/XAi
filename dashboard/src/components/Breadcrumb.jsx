import { Link } from 'react-router-dom';

export function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-muted mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-border">›</span>}
          {item.to ? (
            <Link to={item.to} className="hover:text-text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
