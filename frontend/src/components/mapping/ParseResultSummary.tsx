import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info,
  FileSpreadsheet,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ParseResult } from '../../lib/schemas';

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
  const { data, errors, warnings, info, totalLines, validLines, skippedLines } = result;

  const hasBlockingErrors = errors.some(error => error.level === 'BLOCKING');
  const canContinue = validLines > 0 && !hasBlockingErrors;

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'BLOCKING':
        return 'text-red-600 bg-red-50';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50';
      case 'INFO':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'BLOCKING':
        return <XCircle className="w-4 h-4" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4" />;
      case 'INFO':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

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
            Résultats du parsing et validation des données
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
                <p className="text-sm text-gray-600">Lignes valides</p>
                <p className="text-xl font-bold text-green-600">{validLines}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Lignes ignorées</p>
                <p className="text-xl font-bold text-red-600">{skippedLines}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avertissements</p>
                <p className="text-xl font-bold text-yellow-600">{warnings.length}</p>
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
              {canContinue ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-800">
                      Fichier prêt pour l'import
                    </h4>
                    <p className="text-sm text-green-600">
                      {validLines} mappings seront traités
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-red-800">
                      Erreurs bloquantes détectées
                    </h4>
                    <p className="text-sm text-red-600">
                      Veuillez corriger le fichier avant de continuer
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600">Taux de réussite</p>
              <p className="text-lg font-bold text-gray-900">
                {Math.round((validLines / totalLines) * 100)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erreurs bloquantes */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <XCircle className="w-5 h-5" />
              <span>Erreurs ({errors.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.slice(0, 20).map((error, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-3 rounded-lg border ${getStatusColor(error.level)}`}
                >
                  <div className="flex items-start space-x-2">
                    {getStatusIcon(error.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 text-sm mb-2">
                        <span className="font-bold text-gray-900">Ligne {error.line}</span>
                        <span className="text-gray-500">•</span>
                        <span className="font-bold text-blue-700">{error.field}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {error.level}
                        </span>
                      </div>
                      
                      {/* Valeur actuelle vs attendue */}
                      <div className="bg-gray-50 p-2 rounded text-xs mb-2 font-mono">
                        <div className="grid grid-cols-1 gap-1">
                          <div>
                            <span className="text-red-600 font-semibold">Valeur trouvée:</span>{' '}
                            <span className="bg-red-100 px-1 rounded">
                              {error.value === null || error.value === undefined || error.value === '' 
                                ? '(vide)' 
                                : JSON.stringify(error.value)
                              }
                            </span>
                          </div>
                          {error.expected && (
                            <div>
                              <span className="text-green-600 font-semibold">Valeur attendue:</span>{' '}
                              <span className="bg-green-100 px-1 rounded">{error.expected}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Message d'erreur */}
                      <p className="text-sm text-gray-700 mb-2 font-medium">{error.message}</p>
                      
                      {/* Suggestion d'amélioration */}
                      {error.suggestion && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-2 mt-2">
                          <p className="text-xs font-medium text-blue-800">
                            💡 <strong>Suggestion:</strong> {error.suggestion}
                          </p>
                        </div>
                      )}
                      
                      {/* Contexte de la colonne si disponible */}
                      {error.column && error.column !== error.field && (
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Colonne Excel:</strong> {error.column}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {errors.length > 20 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  ... et {errors.length - 20} autres erreurs
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avertissements */}
      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              <span>Avertissements ({warnings.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {warnings.slice(0, 10).map((warning, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-3 rounded-lg border ${getStatusColor(warning.level)}`}
                >
                  <div className="flex items-start space-x-2">
                    {getStatusIcon(warning.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 text-sm mb-1">
                        <span className="font-bold text-gray-900">Ligne {warning.line}</span>
                        <span className="text-gray-500">•</span>
                        <span className="font-bold text-orange-700">{warning.field}</span>
                      </div>
                      <p className="text-sm text-gray-700">{warning.message}</p>
                      {warning.value !== undefined && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          <strong>Valeur:</strong> {warning.value === null || warning.value === '' ? '(vide)' : String(warning.value)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {warnings.length > 10 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  ... et {warnings.length - 10} autres avertissements
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations */}
      {info.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <Info className="w-5 h-5" />
              <span>Informations ({info.length})</span>
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
                  className={`p-3 rounded-lg border ${getStatusColor(infoItem.level)}`}
                >
                  <div className="flex items-start space-x-2">
                    {getStatusIcon(infoItem.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 text-sm mb-1">
                        <span className="font-bold text-gray-900">Ligne {infoItem.line}</span>
                        <span className="text-gray-500">•</span>
                        <span className="font-bold text-blue-700">{infoItem.field}</span>
                      </div>
                      <p className="text-sm text-gray-700">{infoItem.message}</p>
                      {infoItem.expected && (
                        <p className="text-xs text-blue-600 mt-1 font-mono">
                          <strong>Valeur appliquée:</strong> {infoItem.expected}
                        </p>
                      )}
                    </div>
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
          <span>Réessayer</span>
        </Button>

        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="flex items-center space-x-2 min-w-[160px]"
        >
          <span>Continuer vers l'aperçu</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};