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
        "w-full px-3 py-2 sm:px-4 sm:py-2.5 border rounded-lg bg-white text-gray-900 placeholder-gray-400 border-gray-200 shadow-sm " +
        "focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition text-sm sm:text-base"

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

            const res = await fetch(`http://localhost:8080/usuarios/pesquisar?${params.toString()}`, {
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
            {/* Sidebar */}
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            {/* Conteúdo principal */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white py-4 px-4 sm:px-6 flex items-center justify-between shadow-md">
                    {/* Botão mobile para abrir sidebar */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-md bg-white/20 hover:bg-white/30 transition"
                    >
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="flex-1 text-center lg:text-left">
                        <h1 className="text-lg sm:text-2xl font-bold">Pesquisar Usuários</h1>
                        <p className="text-xs sm:text-sm text-indigo-100">
                            Busque por nome, login ou grupo de usuários
                        </p>
                    </div>
                </div>

                {/* Main */}
                <main className="flex-1 p-4 sm:p-6 md:p-8 w-full">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Filtros */}
                        <div className="bg-white shadow-md rounded-xl p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Nome</label>
                                    <input
                                        className={INPUT_CLASS}
                                        type="text"
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Pesquisar por nome..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Login</label>
                                    <input
                                        className={INPUT_CLASS}
                                        type="text"
                                        value={login}
                                        onChange={(e) => setLogin(e.target.value)}
                                        placeholder="Pesquisar por login..."
                                    />
                                </div>

                                <div className="flex items-end gap-2">
                                    <button
                                        onClick={clearFilters}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                                    >
                                        Limpar
                                    </button>
                                    <button
                                        onClick={handlePesquisar}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                                    >
                                        Pesquisar
                                    </button>
                                </div>
                            </div>

                            {/* Grupos */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    Grupos (selecione um ou mais)
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {ROLES.map((r) => {
                                        const active = rolesSelecionadas.includes(r.value)
                                        return (
                                            <button
                                                key={r.value}
                                                type="button"
                                                onClick={() => toggleRole(r.value)}
                                                className={`px-3 py-1.5 rounded-full border text-sm transition ${active
                                                        ? "bg-indigo-600 text-white border-indigo-600"
                                                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                                                    }`}
                                            >
                                                {r.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Resultados */}
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-base sm:text-lg font-semibold text-gray-800">Resultados</h2>
                                <span className="text-sm text-gray-500">{usuarios.length} usuário(s)</span>
                            </div>

                            {notificacao && (
                                <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm">{notificacao}</div>
                            )}

                            {loading ? (
                                <div className="py-8 text-center text-gray-500">Carregando...</div>
                            ) : usuarios.length === 0 ? (
                                <div className="py-8 text-center text-gray-400">
                                    <div className="mb-2 text-2xl">🔍</div>
                                    Nenhum usuário encontrado.
                                </div>
                            ) : (
                                <>
                                    {/* Tabela - Desktop */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="text-sm text-gray-500 border-b">
                                                    <th className="py-3 px-4 text-left">Usuário</th>
                                                    <th className="py-3 px-4 text-left">Login</th>
                                                    <th className="py-3 px-4 text-left">Grupos</th>
                                                    <th className="py-3 px-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usuarios.map((u) => (
                                                    <tr key={u.id} className="border-b hover:bg-gray-50 text-sm">
                                                        <td className="py-3 px-4 flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                                                                {initials(u.nome)}
                                                            </div>
                                                            <span className="truncate max-w-[200px]">{u.nome}</span>
                                                        </td>
                                                        <td className="py-3 px-4">{u.login}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex gap-1 flex-wrap">
                                                                {u.roles.map((r) => (
                                                                    <span
                                                                        key={r}
                                                                        className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                                                                    >
                                                                        {r}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button
                                                                onClick={() => router.push(`/usuarios/${u.id}`)}
                                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs"
                                                            >
                                                                Visualizar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Cards - Mobile */}
                                    <div className="lg:hidden space-y-3">
                                        {usuarios.map((u) => (
                                            <div key={u.id} className="border rounded-lg p-4 shadow-sm">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                                                        {initials(u.nome)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-800">{u.nome}</div>
                                                        <div className="text-sm text-gray-500">{u.login}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => router.push(`/usuarios/${u.id}`)}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs"
                                                    >
                                                        Ver
                                                    </button>
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
