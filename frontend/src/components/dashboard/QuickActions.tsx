import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Calculator, 
  Plus, 
  Users, 
  DollarSign, 
  FileText, 
  BarChart3 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'Calculateur',
      description: 'Calculer prix et marges',
      icon: Calculator,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      path: '/calculator'
    },
    {
      title: 'Nouveau Prix',
      description: 'Enregistrer un prix',
      icon: Plus,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      path: '/prices/new'
    },
    {
      title: 'Clients',
      description: 'Gérer les clients',
      icon: Users,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      path: '/clients'
    },
    {
      title: 'Prix',
      description: 'Base de données prix',
      icon: DollarSign,
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
      path: '/prices'
    },
    {
      title: 'Rapports',
      description: 'Générer rapports',
      icon: FileText,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      path: '/reports'
    },
    {
      title: 'Analyses',
      description: 'Statistiques détaillées',
      icon: BarChart3,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
      path: '/analytics'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Actions Rapides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={action.path}
                  className="block"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`${action.color} ${action.hoverColor} text-white p-4 rounded-lg text-center transition-all duration-200 shadow-sm hover:shadow-md`}
                  >
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                    <h3 className="text-sm sm:text-base font-semibold mb-1">
                      {action.title}
                    </h3>
                    <p className="text-xs opacity-90 hidden sm:block">
                      {action.description}
                    </p>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};