"use client";

import { useFormStatus } from "react-dom";

export function FormButton({
  children,
  className,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "danger" | "secondary";
}) {
  const { pending } = useFormStatus();

  const baseClasses = "rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  };

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${baseClasses} ${variantClasses[variant]} ${className || ""}`}
    >
      {pending ? "..." : children}
    </button>
  );
}
