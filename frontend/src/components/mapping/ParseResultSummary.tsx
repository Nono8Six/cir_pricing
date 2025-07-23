import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  FileSpreadsheet,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ParseResult, ValidationError } from '../../lib/schemas';

interface ParseResultSummaryProps {
  result: ParseResult;
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
  const hasBlockingErrors = result.errors.some(e => e.level === 'BLOCKING');
  const canContinue = result.validLines > 0 && !hasBlockingErrors;

  const getHealthColor = () => {
    if (hasBlockingErrors) return 'text-red-600';
    if (result.warnings.length > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  const getHealthIcon = () => {
    if (hasBlockingErrors) return XCircle;
    if (result.warnings.length > 0) return AlertTriangle;
    return CheckCircle;
  };

  const HealthIcon = getHealthIcon();

  return (
    <div className="space-y-6">
      {/* En-tête avec statut global */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Analyse terminée</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{filename}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <HealthIcon className={`w-6 h-6 ${getHealthColor()}`} />
              <span className={`font-semibold ${getHealthColor()}`}>
                {hasBlockingErrors ? 'Erreurs critiques' : 
                 result.warnings.length > 0 ? 'Avertissements' : 'Succès'}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{result.totalLines}</p>
              <p className="text-xs text-gray-600">Lignes totales</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{result.validLines}</p>
              <p className="text-xs text-gray-600">Lignes valides</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{result.warnings.length}</p>
              <p className="text-xs text-gray-600">Avertissements</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">
                {result.errors.filter(e => e.level === 'BLOCKING').length}
              </p>
              <p className="text-xs text-gray-600">Erreurs critiques</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Détail des erreurs si présentes */}
      {(result.errors.length > 0 || result.warnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Détail des problèmes détectés</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {/* Erreurs bloquantes */}
              {result.errors.filter(e => e.level === 'BLOCKING').map((error, index) => (
                <ErrorItem key={`error-${index}`} error={error} />
              ))}
              
              {/* Avertissements (limités aux 10 premiers) */}
              {result.warnings.slice(0, 10).map((warning, index) => (
                <ErrorItem key={`warning-${index}`} error={warning} />
              ))}
              
              {result.warnings.length > 10 && (
                <p className="text-sm text-gray-500 italic">
                  ... et {result.warnings.length - 10} autres avertissements
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onRetry}
        >
          Essayer un autre fichier
        </Button>

        <div className="flex items-center space-x-3">
          {!canContinue && (
            <p className="text-sm text-red-600">
              Corrigez les erreurs critiques avant de continuer
            </p>
          )}
          <Button
            onClick={onContinue}
            disabled={!canContinue}
            className="min-w-[120px]"
          >
            {canContinue ? 'Continuer' : 'Impossible de continuer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ErrorItemProps {
  error: ValidationError;
}

const ErrorItem: React.FC<ErrorItemProps> = ({ error }) => {
  const getIcon = () => {
    switch (error.level) {
      case 'BLOCKING': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'INFO': return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (error.level) {
      case 'BLOCKING': return 'bg-red-50 border-red-200';
      case 'WARNING': return 'bg-orange-50 border-orange-200';
      case 'INFO': return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getBgColor()}`}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium">Ligne {error.line}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">{error.column}</span>
          </div>
          <p className="text-sm text-gray-700">{error.message}</p>
          {error.suggestion && (
            <p className="text-xs text-gray-600 mt-1">
              💡 {error.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};