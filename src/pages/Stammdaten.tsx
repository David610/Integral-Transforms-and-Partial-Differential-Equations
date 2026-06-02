import { StammdatenForm } from '@/components/StammdatenForm';

export function Stammdaten() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stammdaten</h1>
        <p className="text-sm text-muted-foreground">
          Gebäude und Mieteinheiten verwalten.
        </p>
      </div>
      <StammdatenForm />
    </div>
  );
}
