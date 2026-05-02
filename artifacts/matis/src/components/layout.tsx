import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Server, ShieldAlert, Bug, BarChart2, TerminalSquare } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const nav = [
    { href: "/", label: "Dashboard", icon: BarChart2 },
    { href: "/pipelines", label: "Pipelines", icon: Activity },
    { href: "/agents", label: "Agents", icon: Server },
    { href: "/failures", label: "Failures", icon: ShieldAlert },
    { href: "/bugs", label: "Bugs", icon: Bug },
    { href: "/evals", label: "Evals", icon: Activity },
    { href: "/logs", label: "Logs", icon: TerminalSquare },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-mono text-sm">
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <TerminalSquare className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg uppercase tracking-wider text-primary">MATIS</span>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  location === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
