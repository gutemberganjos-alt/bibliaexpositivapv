import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import RequireSubscription from './components/RequireSubscription';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import Bible from './pages/Bible';
import Estudos from './pages/Estudos';
import Exegese from './pages/Exegese';
import Interpretacao from './pages/Interpretacao';
import Library from './pages/Library';
import Membership from './pages/Membership';
import StudyProfile from './pages/StudyProfile';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

const APP_HOME = '/inicio';

/**
 * Páginas públicas (login/cadastro) NUNCA podem ficar em branco esperando a auth:
 * se o Supabase estiver lento/fora do ar, o formulário ainda deve aparecer.
 * Só redirecionamos quando temos certeza de que há usuário logado.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to={APP_HOME} replace />;
  return <>{children}</>;
}

/**
 * Rota "/": landing pública. Renderiza SEMPRE, mesmo enquanto a auth carrega —
 * é a página de vendas e não pode depender do Supabase para aparecer.
 */
function HomeRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={APP_HOME} replace />;
  return <Landing />;
}

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <SubscriptionProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Página pública (Landing), indexável — visitante não logado vê o site institucional. */}
            <Route path="/" element={<HomeRoute />} />

            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/recuperar-senha" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

            {/* App autenticado: caminhos absolutos, não aninhados sob "/". */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path={APP_HOME} element={<Dashboard />} />
                <Route path="/biblia" element={<Bible />} />
                <Route path="/biblioteca" element={<Library />} />
                <Route path="/assinatura" element={<Membership />} />
                <Route path="/perfil" element={<StudyProfile />} />
                {/* Rotas de geração exigem assinatura ativa (VITE_ENFORCE_SUBSCRIPTION) */}
                <Route element={<RequireSubscription />}>
                  <Route path="/estudos" element={<Estudos />} />
                  <Route path="/exegese" element={<Exegese />} />
                  <Route path="/interpretacao" element={<Interpretacao />} />
                </Route>
                <Route path="/minha-conta" element={<Account />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
      </SubscriptionProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
