"use client";

import React from "react";

interface HeaderProps {
    titulo: string;
    sidebarOpen?: boolean;
    setSidebarOpen?: (open: boolean) => void;
}

export default function Header({ titulo, sidebarOpen, setSidebarOpen }: HeaderProps) {
    return (
        <header className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 text-white py-4 px-4 sm:px-6 flex items-center justify-between shadow-lg sticky top-0 z-10">
            <div className="flex items-center">
                {setSidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-white hover:bg-white/20 p-2 rounded-xl transition-colors md:hidden"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                )}
                <h1 className="ml-3 font-semibold text-lg sm:text-xl">{titulo}</h1>
            </div>
        </header>
    );
}
