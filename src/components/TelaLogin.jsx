import React from 'react';
import { Activity, Mail, Lock } from 'lucide-react';

const TelaLogin = ({ 
  email, setEmail, password, setPassword, 
  handleLogin, handleResetPassword, setIsRegistering, 
  authError, isLoading 
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-emerald-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Sys4U</h1>
          <p className="text-emerald-100 font-medium mt-1">Ecossistema de Saúde v2.0</p>
        </div>

        <form onSubmit={handleLogin} className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Acesso ao Sistema</h2>
          
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
              {authError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">E-mail Profissional</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input 
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="dr.luciano@sys4u.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input 
                  type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="text-right mt-1">
                <button type="button" onClick={handleResetPassword} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  Esqueci minha senha
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full mt-8 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isLoading ? <Activity className="animate-spin" size={20} /> : "Entrar no Plantão"}
          </button>

          <div className="mt-8 text-center pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Novo na rede? {' '}
              <button 
                type="button" 
                onClick={() => setIsRegistering(true)} 
                className="font-bold text-emerald-600 hover:text-emerald-700"
              >
                Cadastrar profissional
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TelaLogin;