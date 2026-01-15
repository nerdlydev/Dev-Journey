import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import { api } from "./api/axios";

const Login = () => {
  const { setToken } = useAuth();
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("password123");

  const login = async () => {
    const { data } = await api.post("/login", { email, password });
    setToken(data.accessToken);
  };

  return (
    <>
      <button onClick={login}>Login</button>
    </>
  );
};

const Dashboard = () => {
  const { token, setToken } = useAuth();
  const [msg, setMsg] = useState("");

  if (!token) return <p>Not logged in</p>;

  return (
    <>
      <button
        onClick={async () => {
          const { data } = await api.get("/api/me");
          setMsg(data.message);
        }}
      >
        Fetch
      </button>

      <button
        onClick={async () => {
          await api.post("/logout");
          setToken(null);
        }}
      >
        Logout
      </button>

      <p>{msg}</p>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Login />
      <Dashboard />
    </AuthProvider>
  );
}
