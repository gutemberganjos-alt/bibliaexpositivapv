import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { AdminProvider } from './contexts/AdminContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import RequireSubscription from './components/RequireSubscription';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';

// Carregadas de imediato: é o que um visitante novo vê primeiro. Tudo o mais
// entra sob demanda — antes, quem abria a landing baixava o app inteiro
// (gerador, Bíblia, biblioteca, checkout e painel admin) antes da primeira palavra.
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Account = lazy(() => import('./pages/Account'));
const Bible = lazy(() => import('./pages/Bible'));
const Estudos = lazy(() => import('./pages/Estudos'));
const Exegese = lazy(() => import('./pages/Exegese'));
const Interpretacao = lazy(() => import('./pages/Interpretacao'));
const Library = lazy(() => import('./pages/Library'));
const Membership = lazy(() => import('./pages/Membership'));
const StudyProfile = lazy(() => import('./pages/StudyProfile'));
const Termos = lazy(() => import('./pages/Termos'));
const Privacidade = lazy(() => import('./pages/Privacidade'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AdminUsuarios = lazy(() => import('./pages/admin/Usuarios'));

/** Placeholder enquanto o pedaço da rota chega. Discreto, na cor da marca. */
function CarregandoRota() {
  return (
    <div className="h-[60vh] w-full flex items-center justify-center">
      <p className="text-[var(--cor-dourado)] font-['Manrope'] tracking-widest animate-pulse">
        Carregando...
      </p>
    </div>
  );
}

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

/**
 * Escopa o AdminProvider só ao app autenticado. Antes ele envolvia a árvore
 * inteira (inclusive Landing/Termos/Privacidade/Login) — checagem de admin não
 * tem nenhuma serventia ali, só custo de bundle/render extra em páginas
 * públicas que importam para o Core Web Vitals (SEO, conversão).
 */
function AdminScope() {
  return (
    <AdminProvider>
      <Outlet />
    </AdminProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <SubscriptionProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<CarregandoRota />}>
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

            {/* App autenticado: caminhos absolutos, não aninhados sob "/".
                AdminScope entra aqui dentro (não lá em cima, na árvore inteira)
                — checagem de admin só interessa depois do login. */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminScope />}>
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
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
      </SubscriptionProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
