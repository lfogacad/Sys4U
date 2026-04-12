import './index.css';
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./config/firebase";

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
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Médico");
  const [newConselho, setNewConselho] = useState("");
  const [masterCodeInput, setMasterCodeInput] = useState("");
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
    if (masterCodeInput !== "123456") return setAuthError("Código Mestre Inválido");
    if (!newConselho) return setAuthError("Número do Conselho obrigatório.");
    setIsLoading(true);
    try {
      const c = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "usuarios", c.user.uid), {
        nome: newName, perfil: newRole, conselho: "CRM", numeroConselho: newConselho,
        email: email, dataCriacao: new Date().toISOString(), vinculos: [], isFirstLogin: true,
      });
      await signOut(auth);
      setIsRegistering(false);
      alert("Cadastrado com sucesso! Faça login.");
    } catch (err) {
      setAuthError("Erro ao cadastrar: " + err.message);
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
      <TelaCadastro
        email={email} setEmail={setEmail} password={password} setPassword={setPassword}
        newName={newName} setNewName={setNewName} newRole={newRole} setNewRole={setNewRole}
        newConselho={newConselho} setNewConselho={setNewConselho} masterCodeInput={masterCodeInput} setMasterCodeInput={setMasterCodeInput}
        handleRegister={handleRegister} setIsRegistering={setIsRegistering} authError={authError} isLoading={isLoading}
      />
    ) : (
      <TelaLogin
        email={email} setEmail={setEmail} password={password} setPassword={setPassword}
        handleLogin={handleLogin} handleResetPassword={handleResetPassword} setIsRegistering={setIsRegistering} authError={authError} isLoading={isLoading}
      />
    );
  }

  if (userProfile?.isFirstLogin) {
    return <TrocaSenhaObrigatoria user={user} userProfile={userProfile} setUserProfile={setUserProfile} />;
  }

  if (!unidadeAtiva && userProfile?.perfil !== "Administrador") {
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
          <Route path="/hub" element={userProfile?.perfil === "Administrador" ? <ServiceHub userProfile={userProfile} /> : <Navigate to="/" />} />
          <Route path="/uti/*" element={<ModuloUTI user={user} userProfile={userProfile} unidadeAtiva={unidadeAtiva} handleLogout={handleLogout} />} />
          <Route path="/admin" element={userProfile?.perfil === "Administrador" ? <ModuloAdmin userProfile={userProfile} /> : <Navigate to="/" />} />
          <Route path="/recepcao" element={<ModuloRecepcao userProfile={userProfile} unidadeAtiva={unidadeAtiva} />} />
          <Route path="/" element={<Navigate to={userProfile?.perfil === "Administrador" ? "/hub" : "/uti"} />} />
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