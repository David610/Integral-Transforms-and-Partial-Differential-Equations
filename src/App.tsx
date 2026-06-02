import { useState } from 'react';
import { ClipboardList, Files, Home, Receipt, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dashboard } from '@/pages/Dashboard';
import { Stammdaten } from '@/pages/Stammdaten';
import { Kosten } from '@/pages/Kosten';
import { Abrechnung } from '@/pages/Abrechnung';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

type Route = 'dashboard' | 'stammdaten' | 'kosten' | 'abrechnung';

const NAV: { id: Route; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'stammdaten', label: 'Stammdaten', icon: ClipboardList },
  { id: 'kosten', label: 'Kosten', icon: Receipt },
  { id: 'abrechnung', label: 'Abrechnung', icon: Files },
];

export function App() {
  const [route, setRoute] = useState<Route>('dashboard');
  const reset = useAppStore((s) => s.reset);

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <div className="container py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr]">
          <aside>
            <nav className="sticky top-6 space-y-1" aria-label="Navigation">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = item.id === route;
                return (
                  <button
                    key={item.id}
                    onClick={() => setRoute(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      active
                        ? 'bg-primary text-primary-foreground shadow-subtle'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs text-muted-foreground"
                  onClick={() => {
                    if (confirm('Beispieldaten wiederherstellen?')) reset();
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Seed laden
                </Button>
              </div>
            </nav>
          </aside>
          <main>
            {route === 'dashboard' && <Dashboard />}
            {route === 'stammdaten' && <Stammdaten />}
            {route === 'kosten' && <Kosten />}
            {route === 'abrechnung' && <Abrechnung />}
          </main>
        </div>
      </div>
      <footer className="border-t bg-background">
        <div className="container py-4 text-center text-xs text-muted-foreground">
          NK-Express — Betriebskostenabrechnung für Property &amp; Asset Management ·
          alle Berechnungen erfolgen lokal im Browser
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">NK</span>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none tracking-tight">
              NK-Express
            </h1>
            <p className="text-xs text-muted-foreground">Betriebskostenabrechnung</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Property &amp; Asset Management Demo
        </div>
      </div>
    </header>
  );
}
