// src/components/ErrorAlert.tsx
"use client";

import { useEffect, useState } from "react";

interface ErrorAlertProps {
    message: string;
    onClose?: () => void;
    duration?: number; // tempo em ms para sumir automaticamente
}

export default function ErrorAlert({ message, onClose, duration = 5000 }: ErrorAlertProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setVisible(true);

            const timer = setTimeout(() => {
                setVisible(false);
                onClose?.();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    if (!message) return null;

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center space-x-3 transition-all transform ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
        >
            <span className="font-medium">{message}</span>
            {onClose && (
                <button
                    className="ml-3 font-bold text-white hover:text-gray-200 transition-colors"
                    onClick={() => {
                        setVisible(false);
                        onClose();
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}
