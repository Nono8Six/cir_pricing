import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { DiffSummary } from '../../lib/api/cirAdmin';

interface ImportResultModalProps {
  isOpen: boolean;
  datasetLabel: string;
  filename: string;
  templateName?: string;
  totalLines: number;
  skippedLines: number;
  diffSummary: DiffSummary;
  info?: string[];
  onClose: () => void;
  onViewBatch?: () => void;
}

const StatCard: React.FC<{ label: string; value: number; accent?: string }> = ({
  label,
  value,
  accent = 'text-gray-900'
}) => (
  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
  </div>
);

export const ImportResultModal: React.FC<ImportResultModalProps> = ({
  isOpen,
  datasetLabel,
  filename,
  templateName,
  totalLines,
  skippedLines,
  diffSummary,
  info = [],
  onClose,
  onViewBatch
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold uppercase text-emerald-600">Import réussi</p>
              <h2 className="text-2xl font-bold text-gray-900">Résumé {datasetLabel}</h2>
              <p className="text-sm text-gray-500">
                {filename} {templateName ? `• Template "${templateName}"` : ''} • {totalLines} lignes
                analysées
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Ajouts" value={diffSummary.added} accent="text-emerald-600" />
            <StatCard label="Mises à jour" value={diffSummary.updated} accent="text-amber-600" />
            <StatCard label="Supprimés" value={diffSummary.removed} accent="text-rose-600" />
            <StatCard label="Identiques" value={diffSummary.unchanged} />
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p>
              <span className="font-semibold text-gray-700">{totalLines - skippedLines}</span> lignes
              importées • <span className="font-semibold text-gray-700">{skippedLines}</span> lignes
              ignorées (vides / invalides)
            </p>
          </div>

          {info.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Informations ({info.length})
              </p>
              <ul className="max-h-48 overflow-y-auto space-y-1 text-sm text-gray-600 pr-2">
                {info.map((entry, index) => (
                  <li key={`${entry}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
                    <span>{entry}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose} className="sm:w-auto">
              Fermer
            </Button>
            <Button onClick={onViewBatch} className="sm:w-auto">
              Voir le batch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
