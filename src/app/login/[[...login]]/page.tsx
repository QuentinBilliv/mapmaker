"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { signInSchema, type SignInFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/ui/Field";
import Link from "next/link";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormValues) => {
    setServerError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", data.email);
      formData.set("password", data.password);
      formData.set("flow", "signIn");
      await signIn("password", formData);
      router.replace("/dashboard");
    } catch {
      setServerError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="w-80 space-y-4">
        <h1 className="text-lg font-semibold text-center">Sign in</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Email" required error={errors.email?.message}>
            <Input
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
          </Field>
          <Field label="Password" required error={errors.password?.message}>
            <Input
              type="password"
              placeholder="Your password"
              {...register("password")}
            />
          </Field>
          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
