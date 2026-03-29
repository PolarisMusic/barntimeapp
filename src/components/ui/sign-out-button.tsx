"use client";

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign Out
      </button>
    </form>
  );
}
