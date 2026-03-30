import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext"; // adjust path

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Work Smarter</h1>
      <p>Logging out…</p>
    </div>
  );
}
