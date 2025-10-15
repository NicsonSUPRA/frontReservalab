"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"

interface Usuario {
    id: string
    nome: string
    login: string
    email?: string
    roles: string[]
}

const ROLES = [
    { value: "ADMIN", label: "Administrador", color: "bg-gradient-to-r from-red-500 to-pink-500" },
    { value: "PROF_COMP", label: "Professor de Computação", color: "bg-gradient-to-r from-blue-500 to-cyan-500" },
    { value: "PROF", label: "Professor", color: "bg-gradient-to-r from-green-500 to-emerald-500" },
    { value: "FUNCIONARIO", label: "Funcionário", color: "bg-gradient-to-r from-yellow-500 to-orange-500" },
    { value: "ALUNO", label: "Aluno", color: "bg-gradient-to-r from-purple-500 to-violet-500" },
]

type Notificacao = { type: "success" | "error" | "info"; message: string } | null

const API_URL = process.env.NEXT_PUBLIC_API_URL // ✅ domínio centralizado

export default function UsuarioPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [originalUsuario, setOriginalUsuario] = useState<Usuario | null>(null)
    const [roleSelecionada, setRoleSelecionada] = useState<string>("")
    const [senha, setSenha] = useState("")
    const [notificacao, setNotificacao] = useState<Notificacao>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editando, setEditando] = useState(false)

    const router = useRouter()
    const params = useParams()
    const id = (params as any)?.id as string | undefined

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    useEffect(() => {
        if (!token) router.push("/login")
    }, [router, token])

    useEffect(() => {
        if (!id || !token) return
        let mounted = true
        const fetchUsuario = async () => {
            setLoading(true)
            try {
                const res = await fetch(`${API_URL}/usuarios/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error("Erro ao buscar usuário")
                const data = await res.json()
                if (!mounted) return
                setUsuario(data)
                setOriginalUsuario(data)
                setRoleSelecionada(data.roles?.[0] || "")
            } catch (error) {
                console.error(error)
                setNotificacao({ type: "error", message: "Falha ao carregar usuário." })
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchUsuario()
        return () => {
            mounted = false
        }
    }, [id, token])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!usuario) return
        setUsuario({ ...usuario, [e.target.name]: e.target.value } as Usuario)
    }

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => setRoleSelecionada(e.target.value)
    const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => setSenha(e.target.value)

    const validate = () => {
        if (!usuario) return false
        if (!usuario.nome || !usuario.nome.trim()) {
            setNotificacao({ type: "error", message: "Nome é obrigatório." })
            return false
        }
        if (senha && senha.length > 0 && senha.length < 6) {
            setNotificacao({ type: "error", message: "A nova senha precisa ter ao menos 6 caracteres." })
            return false
        }
        return true
    }

    const handleAtualizar = async () => {
        if (!usuario || !token) return
        setNotificacao(null)
        if (!validate()) return

        setSaving(true)
        try {
            const body: { nome?: string; senha?: string; roles?: string[]; email?: string } = {}
            body.nome = usuario.nome
            body.email = usuario.email // ✅ inclui email no PUT
            if (senha) body.senha = senha
            body.roles = [roleSelecionada]

            const res = await fetch(`${API_URL}/usuarios?id=${usuario.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                setNotificacao({ type: "success", message: "Usuário atualizado com sucesso!" })
                setEditando(false)
                setSenha("")
                setOriginalUsuario({ ...usuario, roles: [roleSelecionada] })
            } else {
                const data = await res.json().catch(() => ({}))
                setNotificacao({ type: "error", message: data.mensagem || data.message || "Erro ao atualizar usuário." })
            }
        } catch (error) {
            console.error(error)
            setNotificacao({ type: "error", message: "Falha na conexão com o servidor." })
        } finally {
            setSaving(false)
        }
    }

    const handleCancelar = () => {
        if (originalUsuario) {
            setUsuario(originalUsuario)
            setRoleSelecionada(originalUsuario.roles?.[0] || "")
        }
        setSenha("")
        setEditando(false)
        setNotificacao(null)
    }

    const getRoleConfig = (role: string) => {
        return ROLES.find((r) => r.value === role) || ROLES[4]
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
                <div className="text-center p-8 bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl max-w-sm w-full mx-4 border border-white/20">
                    <div className="relative mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-violet-500 to-purple-600 animate-pulse"></div>
                        <div className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Carregando usuário</h2>
                    <p className="text-sm text-gray-600">Aguarde um momento...</p>
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-gradient-to-r from-violet-500 to-purple-600 h-1 rounded-full animate-pulse"
                            style={{ width: "60%" }}
                        ></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!usuario) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-4">
                <div className="w-full max-w-md bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Usuário não encontrado</h2>
                        <p className="text-gray-600 mb-4">Erro ao carregar os dados do usuário.</p>
                        <button
                            onClick={() => router.back()}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <header className="p-4 bg-white/70 backdrop-blur-lg md:hidden flex items-center shadow-lg sticky top-0 z-10 border-b border-white/20">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 p-2 rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="ml-3 font-bold text-lg text-gray-800">Sistema de Reservas</h1>
                </header>

                <main className="flex-1 p-4 lg:p-8 xl:p-12 overflow-x-hidden">
                    <div className="max-w-5xl mx-auto space-y-8">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-4 sm:p-6 bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                                <div className="relative flex-shrink-0">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-violet-200 shadow-lg rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white text-lg sm:text-2xl font-bold">
                                            {usuario.nome
                                                ?.split(" ")
                                                .map((p) => p[0])
                                                .slice(0, 2)
                                                .join("") || "UU"}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 break-words">
                                        {editando ? "Editar Usuário" : "Perfil do Usuário"}
                                    </h1>
                                    <p className="text-gray-600 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span>ID:</span>
                                        <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 break-all">
                                            {usuario.id}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end">
                                {usuario.roles?.map((role) => {
                                    const roleConfig = getRoleConfig(role)
                                    return (
                                        <span
                                            key={role}
                                            className={`${roleConfig.color} text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium shadow-lg rounded-full flex items-center gap-2 break-words`}
                                        >
                                            <svg
                                                className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                />
                                            </svg>
                                            <span className="truncate">{roleConfig.label}</span>
                                        </span>
                                    )
                                })}
                            </div>
                        </div>

                        {notificacao && (
                            <div
                                className={`p-4 rounded-lg border-l-4 shadow-lg ${notificacao.type === "success"
                                    ? "border-l-green-500 bg-green-50 text-green-800"
                                    : "border-l-red-500 bg-red-50 text-red-800"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {notificacao.type === "success" ? (
                                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                            />
                                        </svg>
                                    )}
                                    <span className="font-medium text-base">{notificacao.message}</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-white/70 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl overflow-hidden">
                            <div className="pb-6 bg-gradient-to-r from-violet-100 to-purple-100 border-b border-white/20 p-4 sm:p-6">
                                <h2 className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-800">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                        <svg
                                            className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                    </div>
                                    <span className="break-words">Informações do Usuário</span>
                                </h2>
                            </div>
                            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                                    <div className="space-y-3">
                                        <label htmlFor="nome" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4 text-violet-600 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                            </svg>
                                            <span className="break-words">Nome Completo</span>
                                        </label>
                                        <input
                                            id="nome"
                                            name="nome"
                                            value={usuario.nome}
                                            onChange={handleChange}
                                            disabled={!editando}
                                            className={`w-full h-12 px-4 text-base rounded-lg border transition-all duration-300 ${!editando
                                                ? "bg-gray-100 text-gray-500 border-gray-200"
                                                : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"
                                                }`}
                                            placeholder="Digite o nome completo"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label htmlFor="login" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4 text-gray-400 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                            </svg>
                                            Login
                                        </label>
                                        <input
                                            id="login"
                                            name="login"
                                            value={usuario.login}
                                            disabled
                                            className="w-full h-12 px-4 text-base rounded-lg bg-gray-100 text-gray-500 border border-gray-200"
                                        />
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                />
                                            </svg>
                                            <span className="break-words">O login não pode ser alterado</span>
                                        </p>
                                    </div>

                                    {/* E-mail (agora editável no modo de edição) */}
                                    <div className="space-y-3">
                                        <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4 text-gray-400 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 12H8m8 0a4 4 0 01-8 0m8 0a4 4 0 00-8 0"
                                                />
                                            </svg>
                                            E-mail
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={usuario.email || ""}
                                            onChange={handleChange}
                                            disabled={!editando}
                                            className={`w-full h-12 px-4 text-base rounded-lg transition-all duration-300 ${!editando
                                                ? "bg-gray-100 text-gray-500 border border-gray-200"
                                                : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"
                                                }`}
                                            placeholder="Digite o e-mail"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label htmlFor="senha" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4 text-violet-600 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                />
                                            </svg>
                                            <span className="break-words">Nova Senha</span>
                                        </label>
                                        <input
                                            id="senha"
                                            type="password"
                                            value={senha}
                                            onChange={handleSenhaChange}
                                            disabled={!editando}
                                            className={`w-full h-12 px-4 text-base rounded-lg border transition-all duration-300 ${!editando
                                                ? "bg-gray-100 text-gray-500 border-gray-200"
                                                : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"
                                                }`}
                                            placeholder="Digite a nova senha"
                                        />
                                        <p className="text-xs text-gray-500 break-words">
                                            {editando ? "Deixe em branco para manter a senha atual" : "Senha protegida"}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <label htmlFor="role" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4 text-violet-600 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                />
                                            </svg>
                                            <span className="break-words">Grupo de Acesso</span>
                                        </label>
                                        <select
                                            value={roleSelecionada}
                                            onChange={handleRoleChange}
                                            disabled={!editando}
                                            className={`w-full h-12 px-4 text-base rounded-lg border transition-all duration-300 ${!editando
                                                ? "bg-gray-100 text-gray-500 border-gray-200"
                                                : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"
                                                }`}
                                        >
                                            <option value="">Selecione um grupo</option>
                                            {ROLES.map((role) => (
                                                <option key={role.value} value={role.value}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-gray-200">
                                    {!editando ? (
                                        <button
                                            onClick={() => {
                                                setEditando(true)
                                                setNotificacao(null)
                                            }}
                                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3 h-12 px-6 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 rounded-lg w-full sm:w-auto"
                                        >
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                            </svg>
                                            <span className="truncate">Editar Informações</span>
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleAtualizar}
                                                disabled={saving}
                                                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3 flex-1 h-12 px-6 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none rounded-lg disabled:opacity-50"
                                            >
                                                {saving ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white flex-shrink-0"></div>
                                                        <span className="truncate">Salvando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg
                                                            className="w-5 h-5 flex-shrink-0"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                                                            />
                                                        </svg>
                                                        <span className="truncate">Salvar Alterações</span>
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={handleCancelar}
                                                disabled={saving}
                                                className="border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-3 flex-1 h-12 px-6 text-base font-semibold transition-all duration-300 hover:shadow-md rounded-lg disabled:opacity-50"
                                            >
                                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                <span className="truncate">Cancelar</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl">
                            <div className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-white/20 p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-3 text-gray-800">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                                        <svg
                                            className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                    </div>
                                    <span className="break-words">Pré-visualização do Perfil</span>
                                </h3>
                            </div>
                            <div className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-gradient-to-r from-gray-50 via-purple-50 to-violet-50 rounded-xl border border-gray-200">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 border-violet-200 shadow-lg rounded-full bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-sm sm:text-lg">
                                            {usuario.nome
                                                ?.split(" ")
                                                .map((p) => p[0])
                                                .slice(0, 2)
                                                .join("") || "UU"}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg sm:text-xl text-gray-800 mb-1 break-words">
                                            {usuario.nome || "Nome não definido"}
                                        </h4>
                                        <p className="text-sm sm:text-base text-gray-600 mb-3 break-all">@{usuario.login}</p>
                                        <p className="text-sm sm:text-base text-gray-600 mb-3 break-all">{usuario.email || ""}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {usuario.roles?.map((role) => {
                                                const roleConfig = getRoleConfig(role)
                                                return (
                                                    <span
                                                        key={role}
                                                        className="bg-gray-200 text-gray-700 text-xs sm:text-sm px-2 sm:px-3 py-1 font-medium rounded-full break-words"
                                                    >
                                                        {roleConfig.label}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
