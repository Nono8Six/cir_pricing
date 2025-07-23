import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { parseExcelFile, HeaderDetectionResult } from '../../lib/excelParser';
import { ParseResult } from '../../lib/schemas';

interface ExcelUploadZoneProps {
  onParseComplete: (result: ParseResult, file: File) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

export const ExcelUploadZone: React.FC<ExcelUploadZoneProps> = ({
  onParseComplete,
  onError,
  loading = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validation du type de fichier
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      onError('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    // Validation de la taille (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      onError('Le fichier est trop volumineux (maximum 50MB)');
      return;
    }

    setParsing(true);
    setParseProgress(0);

    try {
      // Simuler le progrès (en attendant l'implémentation des Web Workers)
      const progressInterval = setInterval(() => {
        setParseProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await parseExcelFile(file, {
        skipEmptyRows: true,
        maxErrors: 1000
      });

      clearInterval(progressInterval);
      setParseProgress(100);

      // Petit délai pour montrer 100%
      setTimeout(() => {
        onParseComplete(result, file);
        setParsing(false);
        setParseProgress(0);
      }, 500);

    } catch (error) {
      setParsing(false);
      setParseProgress(0);
      onError(error instanceof Error ? error.message : 'Erreur lors du parsing du fichier');
    }
  }, [onParseComplete, onError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  if (parsing) {
    return (
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
        <CardContent className="p-8">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <FileSpreadsheet className="w-12 h-12 text-blue-600" />
            </motion.div>
            
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Analyse du fichier Excel en cours...
            </h3>
            
            <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${parseProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            <p className="text-sm text-blue-700">
              {parseProgress < 30 && "Lecture du fichier..."}
              {parseProgress >= 30 && parseProgress < 60 && "Détection des colonnes..."}
              {parseProgress >= 60 && parseProgress < 90 && "Validation des données..."}
              {parseProgress >= 90 && "Finalisation..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-dashed transition-all duration-200 ${
      dragActive 
        ? 'border-cir-red bg-red-50 scale-105' 
        : 'border-gray-300 hover:border-gray-400'
    }`}>
      <CardContent className="p-8">
        <div
          className="text-center"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <motion.div
            animate={dragActive ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${
              dragActive ? 'text-cir-red' : 'text-gray-400'
            }`} />
          </motion.div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {dragActive ? 'Déposez votre fichier ici' : 'Importer un fichier Excel'}
          </h3>

          <p className="text-sm text-gray-600 mb-6">
            Glissez-déposez votre fichier ou cliquez pour sélectionner
          </p>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleChange}
                disabled={loading || parsing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Button
                disabled={loading || parsing}
                className="relative z-10 pointer-events-none"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Sélectionner un fichier
              </Button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>• Formats supportés: .xlsx, .xls</p>
              <p>• Taille maximum: 50MB</p>
              <p>• Détection automatique des colonnes</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};