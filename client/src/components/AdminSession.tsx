import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { getStaff, type Staff } from "@/lib/adminContracts";
import { readAdminToken, AdminApiError } from "@/lib/adminApi";

const Context = createContext<{ staff: Staff | null; error: string | null }>({
  staff: null,
  error: null,
});
export const useStaffSession = () => useContext(Context);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const secured =
    location.startsWith("/admin/") &&
    !location.startsWith("/admin/accept-invite");
  useEffect(() => {
    if (!secured) {
      setStaff(null);
      setError(null);
      return;
    }
    let live = true;
    const refresh = async () => {
      if (!readAdminToken()) {
        navigate("/admin", { replace: true });
        return;
      }
      try {
        const current = await getStaff();
        if (live) {
          setStaff(current);
          setError(null);
        }
      } catch (e) {
        if (!live) return;
        setStaff(null);
        setError(
          e instanceof Error ? e.message : "계정 정보를 확인하지 못했습니다."
        );
        if (e instanceof AdminApiError && e.needsSignIn)
          navigate("/admin", { replace: true });
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [secured, navigate]);
  return (
    <Context.Provider value={{ staff, error }}>{children}</Context.Provider>
  );
}
