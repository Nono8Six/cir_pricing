import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ExcelUploadZone } from '../mapping/ExcelUploadZone';
import { ParseResultSummary } from '../mapping/ParseResultSummary';
import { parseCirClassificationExcelFile } from '../../lib/excelParser';
import { cirClassificationApi } from '../../lib/supabaseClient';
import { ParseResult, CirParseResult } from '../../lib/schemas';
import { toast } from 'sonner';

export const CirClassificationUploadTab: React.FC = () => {
  const [uploadPhase, setUploadPhase] = useState<'upload' | 'analyze' | 'apply'>('upload');
  const [parseResult, setParseResult] = useState<CirParseResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const handleParseComplete = (result: any, file: File) => {
    setParseResult(result as CirParseResult);
    setUploadedFile(file);
    setUploadPhase('analyze');
  };

  const handleParseError = (error: string) => {
    toast.error(error);
  };

  const handleRetryUpload = () => {
    setUploadPhase('upload');
    setParseResult(null);
    setUploadedFile(null);
  };

  const handleApplyChanges = async () => {
    if (!parseResult?.data) return;

    setApplyLoading(true);

    try {
      // Préparer les données pour l'insertion
      const classificationsToInsert = parseResult.data.map(classification => ({
        fsmega_code: classification.fsmega_code,
        fsmega_designation: classification.fsmega_designation,
        fsfam_code: classification.fsfam_code,
        fsfam_designation: classification.fsfam_designation,
        fssfa_code: classification.fssfa_code,
        fssfa_designation: classification.fssfa_designation,
        combined_code: classification.combined_code,
        combined_designation: classification.combined_designation
      }));

      const result = await cirClassificationApi.batchUpsertClassifications(classificationsToInsert);

      toast.success(`${result.length} classifications importées avec succès`);
      
      // Réinitialiser le workflow
      setUploadPhase('upload');
      setParseResult(null);
      setUploadedFile(null);
      
    } catch (error: any) {
      console.error('Erreur import classifications:', error);
      toast.error(error.message || 'Erreur lors de l\'import des classifications');
    } finally {
      setApplyLoading(false);
    }
  };

  const renderUploadPhase = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Import de Classifications CIR
        </h2>
        <p className="text-gray-600">
          Importez vos classifications depuis un fichier Excel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Format attendu</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Colonnes requises :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Code FSMEGA</strong> - Code de la méga famille</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Désignation FSMEGA</strong> - Nom de la méga famille</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Code FSFAM</strong> - Code de la famille</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Désignation FSFAM</strong> - Nom de la famille</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Code FSSFA</strong> - Code de la sous-famille</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Désignation FSSFA</strong> - Nom de la sous-famille</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Code 1&2&3</strong> - Code combiné</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Désignation 1&2&3</strong> - Désignation complète</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExcelUploadZone
        onParseComplete={handleParseComplete}
        onParseError={handleParseError}
        parserType="cir-classification"
      />
    </div>
  );

  const renderAnalyzePhase = () => (
    <div className="space-y-6">
      {parseResult && uploadedFile && (
        <ParseResultSummary
          result={parseResult}
          filename={uploadedFile.name}
          onContinue={handleApplyChanges}
          onRetry={handleRetryUpload}
        />
      )}

      {/* Aperçu des données */}
      {parseResult && parseResult.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5" />
              <span>Aperçu des données ({parseResult.data.length} classifications)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">FSMEGA</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Désignation FSMEGA</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">FSFAM</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Désignation FSFAM</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">FSSFA</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Code combiné</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parseResult.data.slice(0, 5).map((classification: any, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{classification.fsmega_code}</td>
                      <td className="px-3 py-2 max-w-xs truncate">{classification.fsmega_designation}</td>
                      <td className="px-3 py-2 font-mono">{classification.fsfam_code}</td>
                      <td className="px-3 py-2 max-w-xs truncate">{classification.fsfam_designation}</td>
                      <td className="px-3 py-2 font-mono">{classification.fssfa_code}</td>
                      <td className="px-3 py-2 font-mono">{classification.combined_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.data.length > 5 && (
                <div className="text-center py-3 text-sm text-gray-500">
                  ... et {parseResult.data.length - 5} autres classifications
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleRetryUpload}
          disabled={applyLoading}
        >
          Changer de fichier
        </Button>

        <Button
          onClick={handleApplyChanges}
          loading={applyLoading}
          className="min-w-[160px]"
          disabled={!parseResult?.data || parseResult.data.length === 0}
        >
          Importer les classifications
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header avec indicateur de progression */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-green-500 rounded-xl shadow-lg">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Import Classifications CIR
            </h2>
            <p className="text-sm text-gray-600">
              Importation des hiérarchies de familles de produits
            </p>
          </div>
        </div>

        {/* Indicateur de progression */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${
            uploadPhase === 'upload' ? 'text-blue-600' : 'text-green-600'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              uploadPhase === 'upload' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {uploadPhase !== 'upload' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">1</span>
              )}
            </div>
            <span className="text-sm font-medium">Sélection fichier</span>
          </div>

          <div className={`w-8 h-0.5 ${
            uploadPhase !== 'upload' ? 'bg-green-300' : 'bg-gray-300'
          }`} />

          <div className={`flex items-center space-x-2 ${
            uploadPhase === 'analyze' ? 'text-blue-600' : 
            uploadPhase === 'apply' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              uploadPhase === 'analyze' ? 'bg-blue-100' : 
              uploadPhase === 'apply' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {uploadPhase === 'apply' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">2</span>
              )}
            </div>
            <span className="text-sm font-medium">Analyse & Import</span>
          </div>
        </div>
      </div>

      {/* Contenu selon la phase */}
      <motion.div
        key={uploadPhase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {uploadPhase === 'upload' ? renderUploadPhase() : renderAnalyzePhase()}
      </motion.div>
    </div>
  );
};