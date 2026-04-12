import React from 'react';
import { UserPlus, Mail, Lock, Shield, Stethoscope, ArrowLeft } from 'lucide-react';

const TelaCadastro = ({
  email, setEmail, password, setPassword, 
  newName, setNewName, newRole, setNewRole, 
  newConselho, setNewConselho, masterCodeInput, setMasterCodeInput, 
  handleRegister, setIsRegistering, authError, isLoading
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <button onClick={() => setIsRegistering(false)} className="text-slate-400 hover:text-emerald-600 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800">Credenciamento</h2>
            <p className="text-xs text-slate-500">Cadastro de novo profissional</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="p-6 space-y-4">
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
              {authError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
            <input 
              type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
              <select 
                value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700"
              >
                <option value="Médico">Médico</option>
                <option value="Enfermeiro">Enfermeiro</option>
                <option value="Administrador">Administrador</option>
                <option value="Recepção">Recepção</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Conselho (ex: CRM 123)</label>
              <input 
                type="text" required value={newConselho} onChange={(e) => setNewConselho(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Criar Senha</label>
            <input 
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
              <Shield size={14} /> Código Mestre (Segurança)
            </label>
            <input 
              type="password" required value={masterCodeInput} onChange={(e) => setMasterCodeInput(e.target.value)}
              placeholder="Digite o código da clínica..."
              className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isLoading ? <Activity className="animate-spin" size={20} /> : <><UserPlus size={20} /> Finalizar Cadastro</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TelaCadastro;