"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import Header from "../../components/Header"

// Função para decodificar JWT
function parseJwt(token: string | null) {
    if (!token) return null
    try {
        const base64 = token.split('.')[1]
        return JSON.parse(atob(base64))
    } catch {
        return null
    }
}

interface Usuario {
    nome: string
    login: string
    email?: string
    grupo?: string[]      // mantemos a propriedade caso a API retorne, mas não a exibimos
}

type Notificacao = { type: "success" | "error" | "info"; message: string } | null

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function UsuarioPerfilPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [original, setOriginal] = useState<Usuario | null>(null)
    const [notificacao, setNotificacao] = useState<Notificacao>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editando, setEditando] = useState(false)
    const [roles, setRoles] = useState<string[]>([])

    const router = useRouter()
    const params = useParams()
    const loginParam = (params as any)?.login as string | undefined

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    useEffect(() => {
        if (!token) router.push("/login")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, token])

    // Decodifica roles
    useEffect(() => {
        const decoded = parseJwt(token)
        if (decoded?.roles && Array.isArray(decoded.roles)) setRoles(decoded.roles)
    }, [token])

    const podeEditar = roles.includes("ADMIN")

    useEffect(() => {
        if (!loginParam || !token) return
        let mounted = true

        const fetchUsuario = async () => {
            setLoading(true)
            try {
                const res = await fetch(`${API_URL}/usuarios/login/${loginParam}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error("Erro ao buscar usuário")
                const data = await res.json()
                if (!mounted) return
                // garantir formato esperado (grupo como array) — não exibimos, apenas preservamos
                if (data && data.grupo && !Array.isArray(data.grupo)) {
                    data.grupo = [String(data.grupo)]
                }
                setUsuario(data)
                setOriginal(data)
            } catch (err) {
                console.error(err)
                setNotificacao({ type: "error", message: "Falha ao carregar usuário." })
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchUsuario()
        return () => { mounted = false }
    }, [loginParam, token])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!usuario) return
        const { name, value } = e.target
        setUsuario({ ...usuario, [name]: value } as Usuario)
    }

    const validate = () => {
        if (!usuario) return false
        if (!usuario.nome || !usuario.nome.trim()) {
            setNotificacao({ type: "error", message: "Nome é obrigatório." })
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
            const res = await fetch(`${API_URL}/usuarios/${loginParam}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(usuario),
            })

            if (res.ok) {
                setNotificacao({ type: "success", message: "Usuário atualizado com sucesso!" })
                setEditando(false)
                setOriginal({ ...usuario })
            } else {
                const data = await res.json().catch(() => ({}))
                setNotificacao({ type: "error", message: data.mensagem || "Erro ao atualizar usuário." })
            }
        } catch (err) {
            console.error(err)
            setNotificacao({ type: "error", message: "Falha na conexão com o servidor." })
        } finally {
            setSaving(false)
        }
    }

    const handleCancelar = () => {
        if (original) setUsuario(original)
        setEditando(false)
        setNotificacao(null)
    }

    const handleVoltar = () => {
        router.back()
    }

    // classes reutilizáveis com responsividade melhor
    const INPUT_CLASS =
        "w-full h-12 px-4 text-sm md:text-base rounded-lg border transition-all duration-300 focus:outline-none bg-white border-gray-200"

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-4">
                <div className="text-center p-6 bg-white/80 backdrop-blur rounded-2xl shadow-xl max-w-xs w-full mx-2 border border-white/20">
                    <div className="relative mb-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-r from-violet-500 to-purple-600 animate-pulse"></div>
                        <div className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 mb-1">Carregando perfil</h2>
                    <p className="text-xs text-gray-600">Aguarde um momento...</p>
                </div>
            </div>
        )
    }

    if (!usuario) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-4">
                <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/20 p-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Usuário não encontrado</h2>
                        <p className="text-gray-600 mb-4">Erro ao carregar os dados do usuário.</p>
                        <button onClick={() => router.back()} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Voltar</button>
                    </div>
                </div>
            </div>
        )
    }

    const initials = usuario.nome?.split(" ").map(p => p[0]).slice(0, 2).join("") || "US"

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen">
                <Header titulo={editando ? "Editar Usuário" : "Perfil do Usuário"} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto space-y-6">
                        {/* topo do perfil: banner + avatar + ações (melhor responsivo) */}
                        <div className="relative rounded-2xl overflow-hidden bg-white/10">
                            {/* banner responsivo */}
                            <div className="h-28 sm:h-36 bg-gradient-to-r from-violet-400 to-purple-600" />

                            <div className="p-4 sm:p-6 -mt-6 sm:-mt-12">
                                <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="relative flex-shrink-0">
                                            {/* AVATAR ATUALIZADO: tamanhos responsivos */}
                                            <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full shadow-xl bg-white flex items-center justify-center border-2 border-white/80">
                                                <span className="text-violet-700 text-xl sm:text-3xl md:text-4xl font-bold leading-none">{initials}</span>
                                            </div>
                                        </div>

                                        <div className="min-w-0">
                                            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 mb-0 truncate">{usuario.nome}</h1>
                                            <p className="text-gray-600 flex items-center gap-2 mt-1">
                                                <span className="font-mono text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 truncate max-w-[14rem] block">{usuario.login}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={handleVoltar}
                                            className="w-full sm:w-auto h-10 md:h-12 px-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
                                        >
                                            Voltar
                                        </button>


                                    </div>
                                </div>
                            </div>
                        </div>

                        {notificacao && (
                            <div className={`p-3 rounded-lg border-l-4 shadow ${notificacao.type === "success"
                                ? "border-l-green-500 bg-green-50 text-green-800"
                                : "border-l-red-500 bg-red-50 text-red-800"
                                }`}>
                                <span className="font-medium text-sm">{notificacao.message}</span>
                            </div>
                        )}

                        {/* conteúdo principal: infos e detalhes (coluna direita fica abaixo no mobile) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* painel esquerdo: informações (ocupa 2 colunas em desktop) */}
                            <div className="lg:col-span-2 bg-white/80 backdrop-blur-lg border border-white/20 shadow rounded-2xl overflow-hidden">
                                <div className="pb-4 bg-gradient-to-r from-violet-100 to-purple-100 border-b border-white/20 p-4 sm:p-6">
                                    <h2 className="text-xl font-bold text-gray-800">Informações do Usuário</h2>
                                    <p className="text-sm text-gray-600 mt-1">Visão geral dos dados do usuário</p>
                                </div>

                                <div className="p-4 sm:p-6 md:p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="nome" className="text-sm font-semibold text-gray-700">Nome Completo</label>
                                            <input
                                                id="nome"
                                                name="nome"
                                                value={usuario.nome}
                                                onChange={handleChange}
                                                disabled={!editando || !podeEditar}
                                                className={`${INPUT_CLASS} ${!editando || !podeEditar ? "bg-gray-100 text-gray-500" : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"}`}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="email" className="text-sm font-semibold text-gray-700">E-mail</label>
                                            <input
                                                id="email"
                                                name="email"
                                                value={usuario.email || ""}
                                                onChange={handleChange}
                                                disabled={!editando || !podeEditar}
                                                className={`${INPUT_CLASS} ${!editando || !podeEditar ? "bg-gray-100 text-gray-500" : "bg-white border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 shadow-sm"}`}
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label htmlFor="login" className="text-sm font-semibold text-gray-700">Login</label>
                                            <input
                                                id="login"
                                                name="login"
                                                value={usuario.login}
                                                disabled
                                                className={`${INPUT_CLASS} bg-gray-100 text-gray-500 cursor-not-allowed`}
                                            />
                                        </div>
                                    </div>


                                </div>
                            </div>

                            {/* painel direito: metadata / ações rápidas (fica abaixo no mobile) */}
                            <aside className="bg-white/80 backdrop-blur-lg border border-white/20 shadow rounded-2xl p-4 sm:p-6 flex flex-col gap-3">
                                <h3 className="text-lg font-semibold text-gray-800">Ações</h3>

                                <div className="space-y-2"><span className="text-sm text-gray-600">Somente visualização</span></div>

                                <div className="pt-2 border-t border-gray-100">
                                    <h4 className="text-sm text-gray-600">Informações</h4>
                                    {usuario.email ? (
                                        <p className="text-sm text-gray-800 mt-2"><span className="font-semibold mr-2">E-mail:</span>{usuario.email}</p>
                                    ) : (
                                        <p className="text-sm text-gray-500 mt-2">Nenhum e-mail cadastrado</p>
                                    )}
                                </div>
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
