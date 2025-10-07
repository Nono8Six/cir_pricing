import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Props {
  validation?: { errors: number; warnings: number } | undefined;
  onSetValidation: (v: { errors: number; warnings: number }) => void;
  errorsCsv?: string | null; // CSV data URL
  examples?: { total: number; sample: any[] } | undefined;
}

export const ValidationReport: React.FC<Props> = ({ validation, onSetValidation, errorsCsv, examples }) => {
  // Placeholder: provide a fake quick-validate to let the flow proceed
  useEffect(() => {
    if (!validation) {
      onSetValidation({ errors: 0, warnings: 0 });
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation (squelette)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Erreurs: <span className="font-medium">{validation?.errors ?? 0}</span> — Avertissements: <span className="font-medium">{validation?.warnings ?? 0}</span>
          </div>
          {errorsCsv ? (
            <a
              href={errorsCsv}
              download="import-errors.csv"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Télécharger erreurs CSV
            </a>
          ) : (
            <Button variant="outline" disabled>
              Télécharger erreurs CSV
            </Button>
          )}
        </div>
        {examples && (
          <div className="mt-4 text-xs text-gray-600">
            <div className="mb-1">Aperçu de {Math.min(5, examples.sample.length)} lignes sur {examples.total}:</div>
            <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(examples.sample, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValidationReport;
