import './index.css';
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./config/firebase";
import { UserPlus, Hash, Mail, Lock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

// Imports dos Componentes
import HeaderGlobal from "./components/HeaderGlobal";
import ServiceHub from "./components/ServiceHub";
import TelaLogin from "./components/TelaLogin";
import TelaCadastro from "./components/TelaCadastro";
import ModuloAdmin from "./components/ModuloAdmin";
import ModuloUTI from "./components/ModuloUTI"; 
import TrocaSenhaObrigatoria from "./components/TrocaSenhaObrigatoria";
import SeletorUnidade from "./components/SeletorUnidade";
import ModuloRecepcao from "./components/ModuloRecepcao";
import GestorDashboard from './components/GestorDashboard';

// Componente de Segurança (Disjuntor)
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border-t-4 border-red-500 max-w-md">
            <h1 className="text-xl font-bold mb-2">Erro Crítico</h1>
            <pre className="text-[10px] bg-red-50 p-3 rounded-lg text-red-600 mb-4 overflow-auto">{this.state.error?.message}</pre>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Recarregar Sistema</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppRouter = () => {
  const location = useLocation(); // Agora funciona porque o BrowserRouter está no Wrapper
  
  // 1. Estados Globais
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [unidadeAtiva, setUnidadeAtiva] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Estados de Formulário (Login/Cadastro)
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newConselho, setNewConselho] = useState("");
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const docRef = doc(db, "usuarios", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            if (data.vinculos && data.vinculos.length === 1) {
              setUnidadeAtiva(data.vinculos[0]);
            }
          } else {
            console.error("Perfil não encontrado no Firestore.");
            await signOut(auth);
          }
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setUnidadeAtiva(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError("Email ou senha incorretos.");
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // O Código Mestre já não é necessário, a nossa segurança agora é o Conselho!
    if (!newConselho) return setAuthError("O número do Conselho é obrigatório.");
    
    setIsLoading(true);
    setAuthError(""); // Limpa erros antigos

    try {
      // 1. VERIFICAÇÃO DE SEGURANÇA: O profissional existe na base do Gestor?
      const q = query(
        collection(db, "profissionais"), 
        where("numeroConselho", "==", newConselho)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setIsLoading(false);
        return setAuthError("Profissional não autorizado. Peça à Coordenação para registar o seu CRM/COREN primeiro.");
      }

      // Se passou, extraímos os dados oficiais que o Gestor (você) cadastrou!
      const dadosOficiais = snapshot.docs[0].data();

      // 2. CRIA O ACESSO (E-mail e Senha) no Firebase Auth
      const credencial = await createUserWithEmailAndPassword(auth, email, password);

      // 3. GRAVA O UTILIZADOR NA COLEÇÃO DE ACESSOS (Usando os dados oficiais!)
      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nome: dadosOficiais.nome, // Usa o nome oficial que o gestor escreveu
        perfil: dadosOficiais.categoria, // Ex: Médico, Enfermeiro
        conselho: dadosOficiais.conselho,
        numeroConselho: dadosOficiais.numeroConselho,
        vinculo: dadosOficiais.vinculo || "PJ",
        email: email, 
        dataCriacao: new Date().toISOString(), 
        isFirstLogin: true,
        status: "Ativo"
      });

      // Desloga imediatamente para que ele tenha de entrar com as credenciais novas
      await signOut(auth);
      setIsRegistering(false);
      alert(`✅ Conta ativada com sucesso, ${dadosOficiais.nome}! Faça login para continuar.`);
      
    } catch (err) {
      console.error("Erro detalhado do Firebase:", err); 
      
      if (err.code === 'auth/email-already-in-use') {
        setAuthError("Este e-mail já possui cadastro. Peça para redefinir a senha ou use outro e-mail.");
      } else if (err.code === 'auth/weak-password') {
        setAuthError("A senha escolhida é muito fraca. Utilize pelo menos 6 caracteres.");
      } else if (err.code === 'auth/invalid-email') {
        setAuthError("O formato do e-mail é inválido. Verifique se não há espaços ou erros de digitação.");
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError("Sem conexão com a internet. Verifique a sua rede e tente novamente.");
      } else {
        setAuthError(`Falha no cadastro: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) return setAuthError("Preencha o email para redefinir.");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email de redefinição enviado!");
    } catch (err) {
      setAuthError("Erro ao recuperar senha.");
    }
  };

  const handleLogout = async () => { 
    await signOut(auth); 
    window.location.href = "/"; 
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-emerald-600 animate-pulse">Sincronizando Ecossistema...</div>;
  }

  if (!user) {
    return isRegistering ? (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md animate-fadeIn">
          <div className="text-center mb-8">
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Primeiro Acesso</h2>
            <p className="text-slate-500 text-sm">Ative a sua conta utilizando o seu CRM/COREN</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {/* NÚMERO DO CONSELHO - A ÚNICA CHAVE NECESSÁRIA */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Número do Registro (CRM/COREN)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="number" 
                  required
                  value={newConselho}
                  onChange={(e) => setNewConselho(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700"
                  placeholder="Ex: 3129"
                />
              </div>
            </div>

            {/* E-MAIL E SENHA PARA O FUTURO LOGIN */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Criar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold flex items-center gap-2 animate-shake">
                <AlertCircle size={16} /> {authError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
              {isLoading ? 'A validar registro...' : 'Ativar Minha Conta'}
            </button>

            <button 
              type="button" 
              onClick={() => setIsRegistering(false)} 
              className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Voltar para o Login
            </button>
          </form>
        </div>
      </div>
    ) : (
      <TelaLogin
        email={email} setEmail={setEmail} password={password} setPassword={setPassword}
        handleLogin={handleLogin} handleResetPassword={handleResetPassword} setIsRegistering={setIsRegistering} authError={authError} isLoading={isLoading}
      />
    );
  }

  // --- CRACHÁ MASTER (Administrador e Desenvolvedor têm acesso ao mapa geral) ---
  const isSuperUser = userProfile?.perfil === "Administrador" || userProfile?.perfil === "Desenvolvedor";

  if (userProfile?.isFirstLogin) {
    return <TrocaSenhaObrigatoria user={user} userProfile={userProfile} setUserProfile={setUserProfile} />;
  }

  // O SuperUser ignora o bloqueio de falta de vínculos para poder configurar o sistema
  if (!unidadeAtiva && !isSuperUser) {
    if (!userProfile.vinculos || userProfile.vinculos.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Acesso em Análise</h2>
            <p className="text-slate-500 mb-6 font-medium">Seu cadastro foi realizado, mas você ainda não foi vinculado a nenhuma unidade de saúde. Aguarde a liberação da diretoria.</p>
            <button onClick={handleLogout} className="bg-slate-800 text-white font-bold py-3 px-8 rounded-xl">Sair</button>
          </div>
        </div>
      );
    }
    return <SeletorUnidade userProfile={userProfile} onSelectUnit={setUnidadeAtiva} />;
  }

  // --- LÓGICA DE LIMPEZA DO CABEÇALHO ---
  const isUTIPage = location.pathname.startsWith('/uti');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* O HeaderGlobal só aparece se NÃO for a página da UTI */}
      {!isUTIPage && (
        <HeaderGlobal user={userProfile} unidade={unidadeAtiva} onSignOut={handleLogout} />
      )}
      
      {/* Removemos o p-6 (espaçamento) quando estiver na UTI para ganhar tela cheia */}
      <main className={`${isUTIPage ? 'p-0' : 'p-6'}`}>
        <Routes>
          {/* 1. O HUB AGORA É LIVRE: Todo mundo entra aqui, e o próprio Hub filtra os botões */}
          <Route path="/hub" element={<ServiceHub userProfile={userProfile} />} />
          
          {/* 2. Módulos Específicos */}
          <Route path="/uti/*" element={<ModuloUTI user={user} userProfile={userProfile} unidadeAtiva={unidadeAtiva} handleLogout={handleLogout} />} />
          <Route path="/recepcao" element={<ModuloRecepcao userProfile={userProfile} unidadeAtiva={unidadeAtiva} />} />
          
          {/* 3. Painel Admin restrito aos gestores/desenvolvedor */}
          <Route path="/admin" element={<GestorDashboard userProfile={userProfile} />} />
          
          {/* 4. DESTINO PADRÃO: Bateu na porta do hospital? Vai direto pro Hub! */}
          <Route path="/" element={<Navigate to="/hub" />} />
        </Routes>
      </main>
    </div>
  );
};

// --- WRAPPER FINAL COM BROWSERROUTER NO TOPO ---
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ErrorBoundary>
  );
}