import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import api from "./api/axios";

// Extract inner component to use the hook
const Home = () => {
  const { user, token, login, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<any>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, password);
  };

  const getProtectedData = async () => {
    try {
      const res = await api.get("/me");
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch");
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Login (Bun + React + TS)</h2>
        <form onSubmit={handleLogin} style={{ display: "flex", gap: 10 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="user"
          />
          <input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Hi, {user.username}</h1>
      <p>
        Your role: <strong>{user.role}</strong>
      </p>

      <div
        style={{
          background: "#eee",
          padding: 10,
          borderRadius: 5,
          marginBottom: 10,
        }}
      >
        <small>Current Access Token (In Memory):</small>
        <br />
        <code style={{ wordBreak: "break-all" }}>{token}</code>
      </div>

      <button onClick={getProtectedData}>Call Protected API</button>
      <button onClick={() => logout()} style={{ marginLeft: 10 }}>
        Logout
      </button>

      {data && (
        <pre
          style={{
            marginTop: 20,
            background: "#222",
            color: "#fff",
            padding: 10,
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
}

export default App;
