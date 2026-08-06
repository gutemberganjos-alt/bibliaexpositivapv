import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { AdminProvider } from './contexts/AdminContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import RequireSubscription from './components/RequireSubscription';
import AdminRoute from './components/AdminRoute';
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
import Termos from './pages/Termos';
import Privacidade from './pages/Privacidade';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin
import AdminUsuarios from './pages/admin/Usuarios';

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
      <AdminProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Página pública (Landing), indexável — visitante não logado vê o site institucional. */}
            <Route path="/" element={<HomeRoute />} />

            {/* Documentos legais: públicos e SEM exigir login — o cliente precisa
                poder ler antes de assinar, e o processador de pagamentos exige. */}
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />

            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/recuperar-senha" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

            {/* Link do e-mail de recuperação: NÃO pode ficar dentro de PublicRoute.
                O Supabase cria uma sessão temporária ao abrir o link, e PublicRoute
                mandaria essa sessão direto para /inicio antes do usuário trocar a senha. */}
            <Route path="/resetar-senha" element={<ResetPassword />} />

            {/* App autenticado: caminhos absolutos, não aninhados sob "/". */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path={APP_HOME} element={<Dashboard />} />
                <Route path="/biblia" element={<Bible />} />
                <Route path="/biblioteca" element={<Library />} />
                <Route path="/assinatura" element={<Membership />} />
                {/* Retorno do checkout do Asaas: ele recusa URLs com "?", entao
                    o status vem no caminho (/assinatura/sucesso, /cancelado, /expirado). */}
                <Route path="/assinatura/:retorno" element={<Membership />} />
                <Route path="/perfil" element={<StudyProfile />} />
                {/* Rotas de geração exigem assinatura ativa (VITE_ENFORCE_SUBSCRIPTION) */}
                <Route element={<RequireSubscription />}>
                  <Route path="/estudos" element={<Estudos />} />
                  <Route path="/exegese" element={<Exegese />} />
                  <Route path="/interpretacao" element={<Interpretacao />} />
                </Route>
                <Route path="/minha-conta" element={<Account />} />

                {/* Painel administrativo — checagem dupla: RLS no banco (garantia real)
                    + AdminRoute no cliente (evita mostrar a tela à toa). */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
      </AdminProvider>
      </SubscriptionProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
