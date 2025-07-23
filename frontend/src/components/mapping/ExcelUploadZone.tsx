import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '../../lib/excelParser';
import { ParseResult } from '../../lib/schemas';

interface ExcelUploadZoneProps {
  onParseComplete: (result: ParseResult, file: File) => void;
  onParseError: (error: string) => void;
}

export function ExcelUploadZone({ 
  onParseComplete, 
  onParseError
}: ExcelUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFile(file);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFile(file);
    }
  }, []);

  const handleFile = async (file: File) => {
    // Validation du fichier
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      onParseError('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB
      onParseError('Le fichier est trop volumineux (maximum 100MB)');
      return;
    }

    setIsLoading(true);

    try {
      const result = await parseExcelFile(file, {
        skipEmptyRows: true,
        maxErrors: 10000
      });
      onParseComplete(result, file);
    } catch (error) {
      onParseError(error instanceof Error ? error.message : 'Erreur lors du parsing du fichier');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Analyse du fichier en cours...</p>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-blue-100 rounded-full">
          <Upload className="h-8 w-8 text-blue-600" />
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Importer un fichier Excel
          </h3>
          <p className="text-gray-600 mb-4">
            Glissez-déposez votre fichier ou cliquez pour sélectionner
          </p>
        </div>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          id="excel-upload"
        />
        
        <label
          htmlFor="excel-upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Sélectionner un fichier
        </label>

        <div className="text-xs text-gray-500 space-y-1">
          <p>Formats supportés: .xlsx, .xls</p>
          <p>Taille maximum: 100MB</p>
          <p>Jusqu'à 100k lignes</p>
        </div>

        <div className="flex items-start space-x-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Format attendu:</p>
            <p>Le fichier doit contenir les colonnes: Segment, Marque, Cat_fab, etc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}