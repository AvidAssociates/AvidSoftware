"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "TV Board" },
  { href: "/entry", label: "Add Entry" },
  { href: "/log", label: "Log" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav className="border-b border-slate-800 bg-slate-900 px-4 py-3 flex items-center gap-6">
      <span className="font-bold tracking-wide text-slate-100">
        Avid Associates
      </span>
      <div className="flex gap-4 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-2 py-1 rounded ${
              pathname === link.href
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
