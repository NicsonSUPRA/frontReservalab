"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"

interface Usuario {
    id: string
    nome: string
    login: string
    roles: string[]
}

const ROLES = [
    { value: "ADMIN", label: "Administrador" },
    { value: "PROF_COMP", label: "Professor de Computação" },
    { value: "PROF", label: "Professor" },
    { value: "FUNCIONARIO", label: "Funcionário" },
    { value: "ALUNO", label: "Aluno" },
]

const API_URL = process.env.NEXT_PUBLIC_API_URL // ✅ domínio centralizado

export default function PesquisarUsuarios() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [nome, setNome] = useState("")
    const [login, setLogin] = useState("")
    const [rolesSelecionadas, setRolesSelecionadas] = useState<string[]>([])
    const [notificacao, setNotificacao] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const router = useRouter()
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    useEffect(() => {
        if (!token) router.push("/login")
    }, [router, token])

    const toggleRole = (role: string) =>
        setRolesSelecionadas((prev) =>
            prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
        )

    const INPUT_CLASS =
        "w-full px-4 py-3 border rounded-lg bg-white text-gray-900 placeholder-gray-500 border-gray-200 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition text-sm sm:text-base"

    const handlePesquisar = async () => {
        if (!token) {
            setNotificacao("Você precisa estar autenticado.")
            return
        }
        setLoading(true)
        setNotificacao(null)

        try {
            const params = new URLSearchParams()
            if (nome) params.append("nome", nome)
            if (login) params.append("login", login)
            rolesSelecionadas.forEach((r) => params.append("roles", r))

            const res = await fetch(`${API_URL}/usuarios/pesquisar?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!res.ok) throw new Error("Erro ao buscar usuários")

            const data: Usuario[] = await res.json()
            setUsuarios(data)

            if (data.length === 0) setNotificacao("Nenhum usuário encontrado com esses filtros.")
        } catch (err) {
            console.error(err)
            setNotificacao("Falha ao buscar usuários. Verifique o servidor.")
        } finally {
            setLoading(false)
        }
    }

    const clearFilters = () => {
        setNome("")
        setLogin("")
        setRolesSelecionadas([])
        setUsuarios([])
        setNotificacao(null)
    }

    const initials = (name: string) =>
        (name || "")
            .split(" ")
            .map((part) => part[0] ?? "")
            .slice(0, 2)
            .join("")
            .toUpperCase()

    return (
        <div className="flex min-h-screen font-sans bg-gray-50">
            {/* Sidebar drawer */}
            <div
                className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
            >
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            </div>

            {/* Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-screen md:pl-64">
                <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 text-white py-5 px-4 sm:px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-md bg-white/20 hover:bg-white/30 transition"
                            aria-label="Abrir menu"
                        >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Pesquisar Usuários</h1>
                            <p className="text-sm text-indigo-100">Busque por nome, login ou grupo de usuários</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                        <div className="text-xs text-indigo-100">Dica:</div>
                        <div className="px-3 py-2 rounded-full bg-white/10 text-sm">Use filtros para refinar resultados</div>
                    </div>
                </div>

                <main className="flex-1 p-4 sm:p-6 md:p-8 w-full">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Search card */}
                        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-gray-100">
                            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </span>
                                        <input
                                            className={`${INPUT_CLASS} pl-10`}
                                            type="text"
                                            value={nome}
                                            onChange={(e) => setNome(e.target.value)}
                                            placeholder="Pesquisar por nome..."
                                        />
                                    </div>
                                </div>

                                <div className="w-full lg:w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Login</label>
                                    <input
                                        className={INPUT_CLASS}
                                        type="text"
                                        value={login}
                                        onChange={(e) => setLogin(e.target.value)}
                                        placeholder="Pesquisar por login..."
                                    />
                                </div>

                                <div className="flex gap-2 lg:gap-3">
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:shadow-sm transition"
                                    >
                                        Limpar
                                    </button>

                                    <button
                                        onClick={handlePesquisar}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold hover:from-indigo-700 hover:to-sky-600 transition shadow"
                                    >
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            Pesquisar
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Roles */}
                            <div className="mt-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grupos (selecione um ou mais)</label>
                                <div className="flex gap-2 flex-wrap">
                                    {ROLES.map((r) => {
                                        const active = rolesSelecionadas.includes(r.value)
                                        return (
                                            <button
                                                key={r.value}
                                                type="button"
                                                onClick={() => toggleRole(r.value)}
                                                className={`px-3 py-1.5 rounded-full text-sm transition-shadow transition-colors border ${active
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {r.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Results card */}
                        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800">Resultados</h2>
                                    <p className="text-sm text-gray-500">{usuarios.length} usuário(s)</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {loading && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                                            Carregando...
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setUsuarios([])
                                            setNotificacao(null)
                                        }}
                                        className="hidden sm:inline-block px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:shadow-sm"
                                    >
                                        Limpar resultados
                                    </button>
                                </div>
                            </div>

                            {notificacao && (
                                <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm">{notificacao}</div>
                            )}

                            {loading ? (
                                <div className="py-8 text-center text-gray-400">Aguarde...</div>
                            ) : usuarios.length === 0 ? (
                                <div className="py-10 text-center text-gray-400">
                                    <div className="mb-3 text-3xl">🔍</div>
                                    <div className="text-sm">Nenhum usuário encontrado.</div>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop table */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="min-w-full table-fixed border-collapse">
                                            <thead>
                                                <tr className="text-sm text-gray-600 border-b">
                                                    <th className="py-3 px-4 text-left">Usuário</th>
                                                    <th className="py-3 px-4 text-left">Login</th>
                                                    <th className="py-3 px-4 text-left">Grupos</th>
                                                    <th className="py-3 px-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usuarios.map((u, idx) => (
                                                    <tr
                                                        key={u.id}
                                                        className={`border-b hover:bg-gray-50 text-sm ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                                                    >
                                                        <td className="py-3 px-4 flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center text-indigo-700 font-semibold">
                                                                {initials(u.nome)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="truncate max-w-[300px] font-medium text-gray-900">{u.nome}</span>
                                                                <span className="text-xs text-gray-400">ID: {u.id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-700">{u.login}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex gap-2 flex-wrap">
                                                                {u.roles.map((r) => (
                                                                    <span key={r} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                                                        {r}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => router.push(`/usuarios/${u.id}`)}
                                                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs hover:from-emerald-600 hover:to-emerald-700 transition-shadow shadow-sm"
                                                                >
                                                                    Visualizar
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile cards */}
                                    <div className="lg:hidden space-y-3">
                                        {usuarios.map((u) => (
                                            <div key={u.id} className="border rounded-xl p-4 shadow-sm bg-white">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center text-indigo-700 font-semibold">
                                                        {initials(u.nome)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{u.nome}</div>
                                                        <div className="text-sm text-gray-500">{u.login}</div>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <button
                                                            onClick={() => router.push(`/usuarios/${u.id}`)}
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition"
                                                        >
                                                            Ver
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 flex-wrap">
                                                    {u.roles.map((r) => (
                                                        <span key={r} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                                            {r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
