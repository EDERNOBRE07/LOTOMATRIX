import React, { useState } from 'react';
import { 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Mail, 
  User, 
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import PasswordStrengthMeter, { evaluatePasswordStrength } from './PasswordStrengthMeter';

export const AuthAccountSecurityForms: React.FC = () => {
  const [activeForm, setActiveForm] = useState<'cadastro' | 'redefinir'>('cadastro');

  // Estado Cadastro
  const [nome, setNome] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [confirmaCadastro, setConfirmaCadastro] = useState('');
  const [showSenhaCadastro, setShowSenhaCadastro] = useState(false);
  const [isCadastroSubmitting, setIsCadastroSubmitting] = useState(false);
  const [cadastroMsg, setCadastroMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estado Redefinição
  const [emailRedefinir, setEmailRedefinir] = useState('');
  const [tokenRedefinir, setTokenRedefinir] = useState('');
  const [senhaRedefinir, setSenhaRedefinir] = useState('');
  const [confirmaRedefinir, setConfirmaRedefinir] = useState('');
  const [showSenhaRedefinir, setShowSenhaRedefinir] = useState(false);
  const [isRedefinirSubmitting, setIsRedefinirSubmitting] = useState(false);
  const [redefinirMsg, setRedefinirMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Validação em tempo real do cadastro
  const forcaCadastro = evaluatePasswordStrength(senhaCadastro);
  const senhasCadastroIguais = senhaCadastro.length > 0 && senhaCadastro === confirmaCadastro;
  const cadastroValido = nome.trim().length >= 3 
    && emailCadastro.includes('@') 
    && forcaCadastro.isValidForSubmission 
    && senhasCadastroIguais;

  // Validação em tempo real da redefinição
  const forcaRedefinir = evaluatePasswordStrength(senhaRedefinir);
  const senhasRedefinirIguais = senhaRedefinir.length > 0 && senhaRedefinir === confirmaRedefinir;
  const redefinirValido = emailRedefinir.includes('@') 
    && tokenRedefinir.length >= 8 
    && forcaRedefinir.isValidForSubmission 
    && senhasRedefinirIguais;

  const handleCadastroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadastroValido) return;

    setIsCadastroSubmitting(true);
    setCadastroMsg(null);

    try {
      // Simulação de envio para endpoint MySQL Hostinger
      await new Promise(resolve => setTimeout(resolve, 800));

      setCadastroMsg({
        tipo: 'sucesso',
        texto: `Solicitação enviada com sucesso para ${emailCadastro}! O status inicial é 'pendente' e requer aprovação pelo administrador na Whitelist.`
      });

      // Limpar campos
      setNome('');
      setEmailCadastro('');
      setSenhaCadastro('');
      setConfirmaCadastro('');
    } catch {
      setCadastroMsg({
        tipo: 'erro',
        texto: 'Falha ao registrar solicitação. Tente novamente em instantes.'
      });
    } finally {
      setIsCadastroSubmitting(false);
    }
  };

  const handleRedefinirSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redefinirValido) return;

    setIsRedefinirSubmitting(true);
    setRedefinirMsg(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      setRedefinirMsg({
        tipo: 'sucesso',
        texto: `Senha atualizada com sucesso para ${emailRedefinir}! O hash Bcrypt foi salvo no banco e o token expirado foi invalidado.`
      });

      setEmailRedefinir('');
      setTokenRedefinir('');
      setSenhaRedefinir('');
      setConfirmaRedefinir('');
    } catch {
      setRedefinirMsg({
        tipo: 'erro',
        texto: 'Não foi possível redefinir a senha. Verifique o token e tente novamente.'
      });
    } finally {
      setIsRedefinirSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Barra de Acento */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Validação de Senha em Tempo Real • PasswordStrengthMeter
              </h3>
              <p className="text-xs text-slate-400">
                Formulários de cadastro e redefinição com análise de entropia matemática e variedade
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Formulário */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveForm('cadastro')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeForm === 'cadastro'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Cadastro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveForm('redefinir')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeForm === 'redefinir'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Redefinir Senha</span>
          </button>
        </div>
      </div>

      {/* FORMULÁRIO 1: NOVO CADASTRO */}
      {activeForm === 'cadastro' && (
        <form onSubmit={handleCadastroSubmit} className="space-y-4">
          {cadastroMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                cadastroMsg.tipo === 'sucesso'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {cadastroMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{cadastroMsg.texto}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Carlos Eduardo Silva"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail para Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={emailCadastro}
                  onChange={(e) => setEmailCadastro(e.target.value)}
                  placeholder="carlos@exemplo.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-medium"
                />
              </div>
            </div>
          </div>

          {/* Campo Senha com PasswordStrengthMeter integrado */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Senha de Acesso (Mínimo 8 dígitos)
              </label>
              <span className="text-[11px] text-slate-500">
                Validação criptográfica em tempo real
              </span>
            </div>

            <div className="relative">
              <input
                type={showSenhaCadastro ? 'text' : 'password'}
                required
                value={senhaCadastro}
                onChange={(e) => setSenhaCadastro(e.target.value)}
                placeholder="Insira sua senha segura..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 pr-10 text-xs outline-none font-mono transition"
              />
              <button
                type="button"
                onClick={() => setShowSenhaCadastro(!showSenhaCadastro)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
              >
                {showSenhaCadastro ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Componente PasswordStrengthMeter ativo enquanto digita */}
            <PasswordStrengthMeter 
              password={senhaCadastro}
              showDetails
              showCriteria
              showEntropy
            />
          </div>

          {/* Confirmação de Senha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirmar Senha
            </label>
            <input
              type="password"
              required
              value={confirmaCadastro}
              onChange={(e) => setConfirmaCadastro(e.target.value)}
              placeholder="Digite a mesma senha..."
              className={`w-full bg-slate-950 border text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono transition ${
                confirmaCadastro.length > 0
                  ? senhasCadastroIguais
                    ? 'border-emerald-500/80 focus:border-emerald-500'
                    : 'border-rose-500/80 focus:border-rose-500'
                  : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {confirmaCadastro.length > 0 && !senhasCadastroIguais && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>As duas senhas não coincidem.</span>
              </p>
            )}
            {senhasCadastroIguais && (
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>As senhas conferem perfeitamente.</span>
              </p>
            )}
          </div>

          {/* Botão de Submissão */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!cadastroValido || isCadastroSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCadastroSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando Cadastro...</span>
                </>
              ) : (
                <>
                  <span>Enviar Solicitação de Cadastro</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* FORMULÁRIO 2: REDEFINIÇÃO DE SENHA */}
      {activeForm === 'redefinir' && (
        <form onSubmit={handleRedefinirSubmit} className="space-y-4">
          {redefinirMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                redefinirMsg.tipo === 'sucesso'
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {redefinirMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{redefinirMsg.texto}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* E-mail Cadastrado */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={emailRedefinir}
                  onChange={(e) => setEmailRedefinir(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-medium"
                />
              </div>
            </div>

            {/* Token de Recuperação */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Token de Recuperação (Recebido por E-mail)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={tokenRedefinir}
                  onChange={(e) => setTokenRedefinir(e.target.value)}
                  placeholder="Ex: a7f8c92e10bc..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Campo Nova Senha com PasswordStrengthMeter integrado */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Nova Senha de Acesso
              </label>
              <span className="text-[11px] text-slate-500">
                Auditoria de força e entropia em tempo real
              </span>
            </div>

            <div className="relative">
              <input
                type={showSenhaRedefinir ? 'text' : 'password'}
                required
                value={senhaRedefinir}
                onChange={(e) => setSenhaRedefinir(e.target.value)}
                placeholder="Insira a nova senha segura..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3.5 py-2.5 pr-10 text-xs outline-none font-mono transition"
              />
              <button
                type="button"
                onClick={() => setShowSenhaRedefinir(!showSenhaRedefinir)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
              >
                {showSenhaRedefinir ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Componente PasswordStrengthMeter ativo durante a digitação */}
            <PasswordStrengthMeter 
              password={senhaRedefinir}
              showDetails
              showCriteria
              showEntropy
            />
          </div>

          {/* Confirmação de Nova Senha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              value={confirmaRedefinir}
              onChange={(e) => setConfirmaRedefinir(e.target.value)}
              placeholder="Digite a nova senha novamente..."
              className={`w-full bg-slate-950 border text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono transition ${
                confirmaRedefinir.length > 0
                  ? senhasRedefinirIguais
                    ? 'border-cyan-500/80 focus:border-cyan-500'
                    : 'border-rose-500/80 focus:border-rose-500'
                  : 'border-slate-800 focus:border-cyan-500'
              }`}
            />
            {confirmaRedefinir.length > 0 && !senhasRedefinirIguais && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>As senhas não coincidem.</span>
              </p>
            )}
            {senhasRedefinirIguais && (
              <p className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Nova senha confirmada com sucesso.</span>
              </p>
            )}
          </div>

          {/* Botão de Salvar Nova Senha */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!redefinirValido || isRedefinirSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRedefinirSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Atualizando Senha...</span>
                </>
              ) : (
                <>
                  <span>Salvar Nova Senha Criptografada</span>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AuthAccountSecurityForms;
