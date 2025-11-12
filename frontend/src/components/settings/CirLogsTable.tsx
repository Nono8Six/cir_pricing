import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface LogEntry {
  type: string;
  description: string;
  date: string;
  user?: string | null;
}

interface CirLogsTableProps {
  logs: LogEntry[];
  loading?: boolean;
}

export const CirLogsTable: React.FC<CirLogsTableProps> = ({ logs, loading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs récents</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-gray-500">Chargement des journaux...</p>}
        {!loading && logs.length === 0 && (
          <p className="text-sm text-gray-500">Aucun journal disponible.</p>
        )}
        {!loading && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Utilisateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, index) => (
                  <tr key={`${log.date}-${index}`}>
                    <td className="px-4 py-2 text-gray-900">{log.date}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-900">{log.description}</td>
                    <td className="px-4 py-2 text-gray-500">{log.user ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

