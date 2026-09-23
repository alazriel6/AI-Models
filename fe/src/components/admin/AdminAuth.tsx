import React, { createContext, useContext, useState, useEffect } from "react";

interface AdminAuthContextType {
    isAdmin: boolean;
    login: (passcode: string) => boolean;
    logout: () => void;
    updatePasscode: (oldCode: string, newCode: string) => boolean;
}

const PASSCODE_STORAGE_KEY = "models_guide_admin_key";
const SESSION_AUTH_KEY = "models_guide_admin_authenticated";
const DEFAULT_PASSCODE = "admin123";

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        return sessionStorage.getItem(SESSION_AUTH_KEY) === "true";
    });

    useEffect(() => {
        // Ensure initial key is setup if none exists
        if (!localStorage.getItem(PASSCODE_STORAGE_KEY)) {
            localStorage.setItem(PASSCODE_STORAGE_KEY, DEFAULT_PASSCODE);
        }
    }, []);

    const login = (passcode: string): boolean => {
        const stored = localStorage.getItem(PASSCODE_STORAGE_KEY) || DEFAULT_PASSCODE;
        if (passcode.trim() === stored) {
            setIsAdmin(true);
            sessionStorage.setItem(SESSION_AUTH_KEY, "true");
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_AUTH_KEY);
    };

    const updatePasscode = (oldCode: string, newCode: string): boolean => {
        const stored = localStorage.getItem(PASSCODE_STORAGE_KEY) || DEFAULT_PASSCODE;
        if (oldCode.trim() === stored && newCode.trim().length >= 4) {
            localStorage.setItem(PASSCODE_STORAGE_KEY, newCode.trim());
            return true;
        }
        return false;
    };

    return (
        <AdminAuthContext.Provider value={{ isAdmin, login, logout, updatePasscode }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
}
