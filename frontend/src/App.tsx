import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { Clients } from './pages/Clients';
import { GroupsPage } from './pages/GroupsPage';
import { Mapping } from './pages/Mapping';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ImportsNew } from './pages/ImportsNew';
import { ImportsHistory } from './pages/ImportsHistory';
import { ImportBatchDetails } from './pages/ImportBatchDetails';

// Error Boundary pour capturer les erreurs React
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ErrorBoundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          background: '#fee', 
          border: '1px solid #f00',
          margin: '20px'
        }}>
          <h2>🚨 Erreur de rendu détectée</h2>
          <details>
            <summary>Détails de l'erreur</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cir-red"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/mapping" element={<Mapping />} />
          <Route path="/imports/new" element={<ImportsNew />} />
          <Route path="/imports/history" element={<ImportsHistory />} />
          <Route path="/imports/history/:id" element={<ImportBatchDetails />} />
          <Route path="/prices" element={<PlaceholderPage />} />
          <Route path="/prices/new" element={<PlaceholderPage />} />
          <Route path="/analytics" element={<PlaceholderPage />} />
          <Route path="/reports" element={<PlaceholderPage />} />
          <Route path="/settings" element={<PlaceholderPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <AppContent />
          <Toaster />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
