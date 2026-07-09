import React from 'react';
import { Activity, Mail, Lock } from 'lucide-react';

const TechBackground = ({ variant = 'light' }) => {
  const isDark = variant === 'dark';
  const strokeColor = isDark ? '#FFFFFF' : '#3B82F6';
  const nodeColor = isDark ? '#FFFFFF' : '#3B82F6';
  const baseOpacity = isDark ? 0.08 : 0.06;
  const suffix = isDark ? 'dark' : 'light';

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id={`techGrid-${suffix}`} width="140" height="140" patternUnits="userSpaceOnUse">
          <g stroke={strokeColor} strokeWidth="0.6" fill="none">
            <line x1="20" y1="20" x2="70" y2="40" />
            <line x1="70" y1="40" x2="120" y2="20" />
            <line x1="20" y1="20" x2="40" y2="80" />
            <line x1="70" y1="40" x2="40" y2="80" />
            <line x1="40" y1="80" x2="100" y2="90" />
            <line x1="100" y1="90" x2="130" y2="100" />
            <line x1="40" y1="80" x2="20" y2="120" />
            <line x1="100" y1="90" x2="90" y2="120" />
            <line x1="20" y1="120" x2="90" y2="120" />
            <line x1="90" y1="120" x2="130" y2="100" />
          </g>
          <g fill={nodeColor}>
            <circle cx="45" cy="30" r="1.3" />
            <circle cx="95" cy="30" r="1.3" />
            <circle cx="30" cy="50" r="1.3" />
            <circle cx="55" cy="60" r="1.3" />
            <circle cx="70" cy="85" r="1.3" />
            <circle cx="115" cy="95" r="1.3" />
            <circle cx="30" cy="100" r="1.3" />
            <circle cx="95" cy="105" r="1.3" />
            <circle cx="55" cy="120" r="1.3" />
            <circle cx="110" cy="110" r="1.3" />
          </g>
          <g fill={nodeColor}>
            <circle cx="20" cy="20" r="4" />
            <circle cx="70" cy="40" r="5" />
            <circle cx="120" cy="20" r="3" />
            <circle cx="40" cy="80" r="4" />
            <circle cx="100" cy="90" r="5" />
            <circle cx="20" cy="120" r="3" />
            <circle cx="90" cy="120" r="4" />
            <circle cx="130" cy="100" r="3" />
          </g>
        </pattern>
        <pattern id={`circuitTraces-${suffix}`} width="220" height="220" patternUnits="userSpaceOnUse">
          <g stroke={strokeColor} strokeWidth="0.7" fill="none">
            <path d="M 10 10 L 10 50 L 60 50 L 60 90 L 110 90" />
            <path d="M 110 10 L 160 10 L 160 60 L 210 60" />
            <path d="M 10 110 L 50 110 L 50 160 L 100 160 L 100 210" />
            <path d="M 160 110 L 160 150 L 210 150" />
            <path d="M 120 130 L 180 130 L 180 180 L 140 180" />
            <path d="M 30 180 L 80 180 L 80 210" />
          </g>
          <g fill={nodeColor}>
            <circle cx="10" cy="10" r="2" />
            <circle cx="60" cy="50" r="2" />
            <circle cx="110" cy="90" r="2" />
            <circle cx="160" cy="10" r="2" />
            <circle cx="210" cy="60" r="2" />
            <circle cx="50" cy="110" r="2" />
            <circle cx="100" cy="160" r="2" />
            <circle cx="100" cy="210" r="2" />
            <circle cx="160" cy="150" r="2" />
            <circle cx="210" cy="150" r="2" />
            <circle cx="180" cy="130" r="2" />
            <circle cx="140" cy="180" r="2" />
            <circle cx="80" cy="180" r="2" />
            <circle cx="80" cy="210" r="2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#techGrid-${suffix})`} opacity={baseOpacity} />
      <rect width="100%" height="100%" fill={`url(#circuitTraces-${suffix})`} opacity={baseOpacity} />
    </svg>
  );
};

const Sys4ULogo = ({ variant = 'mobile' }) => {
  if (variant === 'desktop') {
    return (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center">
          <Activity className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Sys4U</h1>
          <p className="text-sm text-teal-100">Ecossistema de Saúde v2.0</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg">
        <Activity className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 text-center mt-4">Sys4U</h1>
      <p className="text-sm text-slate-500 text-center mt-1">Ecossistema de Saúde v2.0</p>
    </div>
  );
};

const TelaLogin = ({
  email,
  setEmail,
  password,
  setPassword,
  handleLogin,
  handleResetPassword,
  setIsRegistering,
  authError,
  isLoading
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(e);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* MOBILE LAYOUT */}
      <div className="lg:hidden min-h-screen relative flex items-center justify-center bg-gradient-to-b from-slate-50 to-sky-50 px-4 py-8">
        <TechBackground variant="light" />
        <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <Sys4ULogo variant="mobile" />

          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-800 text-center">Acesso ao Sistema</h2>
            <p className="text-sm text-slate-500 text-center mt-1">
              Entre com suas credenciais para iniciar o plantão.
            </p>
          </div>

          {authError && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email-mobile" className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail Profissional
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email-mobile"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dr.luciano@sys4u.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-mobile" className="block text-sm font-medium text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password-mobile"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 outline-none"
                />
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-all duration-200"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-teal-400 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Entrando...
                </>
              ) : (
                'Entrar no Plantão'
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 mt-8 pt-6">
            <p className="text-sm text-slate-500 text-center mb-3">Novo na rede?</p>
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className="w-full border border-teal-600 text-teal-700 font-semibold py-2.5 rounded-xl hover:bg-teal-50 transition-all duration-200"
            >
              Cadastrar profissional
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex min-h-screen flex-row">
        {/* LEFT PANEL */}
        <div className="lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-teal-700 to-blue-900">
          <TechBackground variant="dark" />
          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white h-screen">
            <Sys4ULogo variant="desktop" />

            <div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                Gestão inteligente para terapia intensiva
              </h2>
              <p className="text-lg text-teal-100 mt-4">
                Conectando equipes, dados e decisões em tempo real para salvar vidas na UTI.
              </p>
            </div>

            <p className="text-sm text-teal-100/60">© 2026 Sys4U — Todos os direitos reservados.</p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:w-[45%] bg-white flex items-center justify-center">
          <div className="max-w-md w-full px-8 xl:px-12">
            <h2 className="text-2xl font-bold text-slate-800">Acesso ao Sistema</h2>
            <p className="text-sm text-slate-500 mt-1">
              Entre com suas credenciais para iniciar o plantão.
            </p>

            {authError && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email-desktop" className="block text-sm font-medium text-slate-700 mb-1.5">
                  E-mail Profissional
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dr.luciano@sys4u.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password-desktop" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password-desktop"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 outline-none"
                  />
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-all duration-200"
                >
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-teal-400 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  'Entrar no Plantão'
                )}
              </button>
            </form>

            <div className="border-t border-slate-100 mt-8 pt-6">
              <p className="text-sm text-slate-500 text-center mb-3">Novo na rede?</p>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="w-full border border-teal-600 text-teal-700 font-semibold py-2.5 rounded-lg hover:bg-teal-50 transition-all duration-200"
              >
                Cadastrar profissional
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelaLogin;