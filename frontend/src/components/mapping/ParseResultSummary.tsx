import React from 'react';
import { motion } from 'framer-motion';
import { CircleCheck as CheckCircle, Info, FileSpreadsheet, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ParseResult, CirParseResult } from '../../lib/schemas';

interface ParseResultSummaryProps {
  result: ParseResult | CirParseResult;
  filename: string;
  onContinue: () => void;
  onRetry: () => void;
}

export const ParseResultSummary: React.FC<ParseResultSummaryProps> = ({
  result,
  filename,
  onContinue,
  onRetry
}) => {
  const { data, totalLines, validLines, skippedLines, info } = result;

  const successRate = Math.round((validLines / totalLines) * 100);
  const canContinue = validLines > 0;

  return (
    <div className="space-y-6">
      {/* Header avec nom du fichier */}
      <div className="flex items-center space-x-3">
        <FileSpreadsheet className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Analyse du fichier : {filename}
          </h3>
          <p className="text-sm text-gray-600">
            Données extraites et prêtes pour l'import
          </p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total lignes</p>
                <p className="text-xl font-bold text-gray-900">{totalLines}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Lignes traitées</p>
                <p className="text-xl font-bold text-green-600">{validLines}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Info className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Lignes ignorées</p>
                <p className="text-xl font-bold text-gray-600">{skippedLines}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Taux de réussite</p>
                <p className="text-xl font-bold text-blue-600">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statut global */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-semibold text-green-800">
                  Fichier prêt pour l'import
                </h4>
                <p className="text-sm text-green-600">
                  {validLines} mappings seront traités
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600">Données extraites</p>
              <p className="text-lg font-bold text-gray-900">
                {data.length} mappings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations de traitement */}
      {info.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <Info className="w-5 h-5" />
              <span>Informations de traitement ({info.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {info.slice(0, 10).map((infoItem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-3 rounded-lg border bg-blue-50 text-blue-800"
                >
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{infoItem}</p>
                  </div>
                </motion.div>
              ))}
              {info.length > 10 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  ... et {info.length - 10} autres informations
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
          onClick={onRetry}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Changer de fichier</span>
        </Button>

        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="flex items-center space-x-2 min-w-[160px]"
        >
          <span>Voir les modifications</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};