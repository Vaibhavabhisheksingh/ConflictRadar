
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from '../components/LogoutButton';
import "./page.css";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function ProjectPage() {
  const router = useRouter();

  const [showJoin, setShowJoin] = useState(false);
  const [showGithub, setShowGithub] = useState(false);

  const [projectCode, setProjectCode] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function isValidGithubUrl(url) {
    if (!url) return true;

    try {
      const parsed = new URL(url);

      return (
        parsed.protocol === "https:" &&
        parsed.hostname === "github.com" &&
        parsed.pathname.split("/").filter(Boolean).length >= 2
      );
    } catch {
      return false;
    }
  }

  async function handleCreateProject(skipGithub = false) {
    setError("");
    setLoading(true);

    try {
      const githubUrl = githubRepoUrl.trim();

      if (!skipGithub && githubUrl && !isValidGithubUrl(githubUrl)) {
        setError(
          "Please enter a valid GitHub repository URL, e.g. https://github.com/username/repository",
        );
        return;
      }
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${BACKEND_URL}/project/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          githubRepoUrl: skipGithub
            ? undefined
            : githubRepoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.projectCode) {
        throw new Error(data.error || "Failed to create project.");
      }

      localStorage.setItem("projectCode", data.projectCode);

      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinProject(e) {
    e.preventDefault();

    setError("");

    const code = projectCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter a project code.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${BACKEND_URL}/project/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectCode: code,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to join project.");
      }

      localStorage.setItem("projectCode", code);

      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <LogoutButton />
      <div
        style={{
          width: "400px",
          padding: "35px",
          border: "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h1>ConflictRadar</h1>

        <p>What would you like to do?</p>

        {!showJoin ? (
          <>
            {!showGithub ? (
              <>
                <button
                  onClick={() => {
                    setError("");
                    setShowGithub(true);
                  }}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginBottom: "15px",
                    cursor: "pointer",
                  }}
                >
                  Create Project
                </button>

                <button
                  onClick={() => {
                    setError("");
                    setShowJoin(true);
                  }}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    cursor: "pointer",
                  }}
                >
                  I Have a Project Code
                </button>
              </>
            ) : (
              <>
                <h2>Create Project</h2>

                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#555",
                  }}
                >
                  Add your GitHub repository URL to associate this ConflictRadar
                  project with your code repository. This can be useful for
                  future GitHub integration and project identification.
                </p>

                <input
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginBottom: "10px",
                    boxSizing: "border-box",
                  }}
                />

                <button
                  onClick={() => handleCreateProject(false)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Creating..." : "Create with GitHub"}
                </button>

                <button
                  onClick={() => handleCreateProject(true)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "10px",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Creating..." : "Skip for Now"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowGithub(false);
                    setGithubRepoUrl("");
                    setError("");
                  }}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "10px",
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>
              </>
            )}
          </>
        ) : (
          <form onSubmit={handleJoinProject}>
            <h2>Join Project</h2>

            <input
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="Project Code (e.g. CR-KEHG)"
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "15px",
                boxSizing: "border-box",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                cursor: "pointer",
              }}
            >
              {loading ? "Joining..." : "Join Project"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowJoin(false);
                setError("");
              }}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "10px",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </form>
        )}

        {error && <p style={{ color: "red", marginTop: "15px" }}>{error}</p>}
      </div>
    </main>
  );
}
