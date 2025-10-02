import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Upload, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FileImportWizard } from '../components/imports/FileImportWizard';

export const ImportsNew: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Import Center</h1>
          <p className="text-sm sm:text-base text-gray-600">Assistant d'import unifié pour Mappings et Classifications</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-700">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Assistant d'import unifié</span>
        </div>
        <Link to="/imports/history" className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900">
          <History className="w-4 h-4 mr-1" /> Historique des imports
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assistant d'import</CardTitle>
        </CardHeader>
        <CardContent>
          <FileImportWizard />
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportsNew;
