"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("projectCode");

    router.replace("/login");
  }

  return (
    <button
      type="button"
      className="logoutButton"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
}