"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface HeaderProps {
    titulo: string;
    sidebarOpen?: boolean;
    setSidebarOpen?: (open: boolean) => void;
}

function parseJwt(token: string | null) {
    if (!token) return null;
    try {
        const base64 = token.split(".")[1];
        // normalize base64
        const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
        // some tokens may be URI encoded in payload; try decode safely
        try {
            // eslint-disable-next-line no-undef
            return JSON.parse(decodeURIComponent(escape(json)));
        } catch {
            return JSON.parse(json);
        }
    } catch {
        return null;
    }
}

function getInitials(nameOrLogin?: string | null) {
    if (!nameOrLogin) return "?";
    const parts = nameOrLogin.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return nameOrLogin.slice(0, 1).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

export default function Header({ titulo, sidebarOpen, setSidebarOpen }: HeaderProps) {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // token/login/displayName states
    const [login, setLogin] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(false);

    // detect mobile (width < 640)
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(typeof window !== "undefined" ? window.innerWidth < 640 : false);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // base url from env (client-safe NEXT_PUBLIC var)
    const BASE_URL = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";

    // read token and login from localStorage on mount
    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const decoded = parseJwt(token);
        const sub = decoded?.sub ?? null;
        setLogin(sub);
        // initially show the login while we fetch the full user
        setDisplayName(sub);
    }, []);

    // fetch user by login to get full name (uses the endpoint /usuarios/login/{login})
    useEffect(() => {
        if (!login) return;
        let mounted = true;
        const controller = new AbortController();
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        async function fetchUser() {
            try {
                setLoadingUser(true);
                const url = BASE_URL ? `${BASE_URL.replace(/\/$/, "")}/usuarios/login/${encodeURIComponent(login as string)}` : `/usuarios/login/${encodeURIComponent(login as string)}`;
                const res = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    signal: controller.signal,
                });
                if (!mounted) return;
                if (!res.ok) {
                    setLoadingUser(false);
                    return;
                }
                const user = await res.json();
                if (!mounted) return;
                const name = user?.nome ?? user?.name ?? user?.login ?? login;
                setDisplayName(name);
            } catch (err) {
                // ignore / keep login as fallback
            } finally {
                if (mounted) setLoadingUser(false);
            }
        }

        fetchUser();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [login, BASE_URL]);

    // computed label with mobile truncation (limit name to 12 chars + "..." on mobile)
    const computeDisplayLabel = (name: string | null, loginFallback: string | null) => {
        const raw = name ?? loginFallback ?? "Convidado";
        if (isMobile) {
            const max = 12;
            if (raw.length > max) return raw.slice(0, max) + "...";
        }
        return raw;
    };

    const displayLabel = computeDisplayLabel(displayName, login);

    // close menu on outside click or Escape
    useEffect(() => {
        function handleDocClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setMenuOpen(false);
                setShowLogoutDialog(false);
            }
        }
        document.addEventListener("click", handleDocClick);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("click", handleDocClick);
            document.removeEventListener("keydown", handleEsc);
        };
    }, []);

    const goToProfile = () => {
        setMenuOpen(false);
        const target = login ? `/perfil/${encodeURIComponent(login as string)}` : "/perfil";
        router.push(target);
    };

    const handleOpenLogout = () => {
        setMenuOpen(false);
        setShowLogoutDialog(true);
    };

    const doLogout = () => {
        // limpa token/login e redireciona pra tela de login
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("login");
        }
        setShowLogoutDialog(false);
        setMenuOpen(false);
        router.push("/login");
    };

    const cancelLogout = () => {
        setShowLogoutDialog(false);
    };

    return (
        <>
            <header className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 text-white py-4 px-4 sm:px-6 flex items-center justify-between shadow-lg sticky top-0 z-10">
                <div className="flex items-center">
                    {setSidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="text-white hover:bg-white/20 p-2 rounded-xl transition-colors md:hidden"
                            aria-label="Abrir menu lateral"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
                    <h1 className="ml-3 font-semibold text-lg sm:text-xl">{titulo}</h1>
                </div>

                {/* usuário / avatar */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((s) => !s)}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
                        title={displayName ?? login ?? "Usuário"}
                    >
                        {/* avatar circle */}
                        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-violet-700 font-semibold select-none">
                            <span className="text-sm">{getInitials(displayName ?? login)}</span>
                        </div>

                        {/* display name (fetched) / login (fallback) */}
                        <div className="flex flex-col text-left leading-tight min-w-0">
                            <span className="text-sm font-medium truncate">{displayLabel}</span>
                            {loadingUser ? (
                                <span className="text-xs opacity-80 flex items-center gap-2">
                                    <svg className="animate-spin h-3 w-3 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                    </svg>
                                    <span>Carregando</span>
                                </span>
                            ) : (
                                // show the login under the full name if available and different
                                login && displayName && displayName !== login ? <span className="text-xs opacity-80 truncate">{login}</span> : null
                            )}
                        </div>

                        {/* chevron */}
                        <svg
                            className={`w-4 h-4 text-white transition-transform ${menuOpen ? "rotate-180" : "rotate-0"}`}
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden
                        >
                            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {/* dropdown */}
                    {menuOpen && (
                        <div
                            role="menu"
                            aria-label="Menu do usuário"
                            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg text-gray-800 overflow-hidden z-20"
                        >
                            <button
                                onClick={goToProfile}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                                role="menuitem"
                            >
                                Ver perfil
                            </button>

                            <button
                                onClick={handleOpenLogout}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-red-600"
                                role="menuitem"
                            >
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Logout confirmation dialog */}
            {showLogoutDialog && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Confirmação de logout"
                >
                    {/* overlay */}
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelLogout} />

                    {/* dialog */}
                    <div className="relative z-50 max-w-sm w-full bg-white rounded-xl shadow-2xl p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Deseja mesmo sair da conta?</h3>
                        <p className="text-sm text-gray-600 mb-4">Você será desconectado e retornará à tela de login.</p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={cancelLogout}
                                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={doLogout}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                            >
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
