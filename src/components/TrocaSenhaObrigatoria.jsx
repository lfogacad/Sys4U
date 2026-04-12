import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; // Ajuste o caminho se necessário
import { ShieldAlert, Loader2, Lock } from 'lucide-react';

const TrocaSenhaObrigatoria = ({ user, userProfile, setUserProfile }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleForceChangePassword = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmNewPassword) return alert("As senhas não coincidem.");
    if (newPassword.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");
      
    try {
      setIsLoading(true);
      
      // 1. Atualiza a senha na "Portaria" (Firebase Auth)
      await updatePassword(user, newPassword);
      
      // 2. Tira o aviso de Primeiro Acesso do "Arquivo" (Firestore)
      await setDoc(
        doc(db, "usuarios", user.uid),
        { isFirstLogin: false },
        { merge: true }
      );
      
      alert("Senha atualizada com sucesso!");
      
      // 3. A MÁGICA: Atualiza o perfil no App.jsx em tempo real para desbloquear o sistema
      setUserProfile((prev) => ({ ...prev, isFirstLogin: false }));

    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      alert("Erro ao atualizar. Se você fez login há muito tempo, saia e entre novamente por segurança.");
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-amber-500 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Ação Necessária</h2>
          <p className="text-amber-100 font-medium mt-1">Este é o seu primeiro acesso.</p>
        </div>

        <form onSubmit={handleForceChangePassword} className="p-8">
          <p className="text-sm text-slate-500 mb-6 text-center leading-relaxed">
            Por motivos de segurança exigidos pelo conselho, você precisa substituir a senha padrão por uma senha pessoal intransferível antes de acessar os prontuários.
          </p>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nova Senha Pessoal</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" required minLength={6}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" required minLength={6}
                  value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Gravar Senha e Acessar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TrocaSenhaObrigatoria;