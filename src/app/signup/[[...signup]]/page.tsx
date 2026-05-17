"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { consumeStoredRef } from "@/components/analytics/RefTracker";
import { signUpSchema, type SignUpFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Field from "@/components/ui/Field";
import Link from "next/link";

export default function SignUpPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormValues) => {
    setServerError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", data.email);
      formData.set("password", data.password);
      formData.set("flow", "signUp");
      await signIn("password", formData);
      track("signup", { ref: consumeStoredRef() ?? "direct" });
      router.replace("/dashboard");
    } catch {
      setServerError("Could not create account. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="w-80 space-y-4">
        <h1 className="text-lg font-semibold text-center">Create account</h1>
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
              placeholder="Min. 8 characters"
              {...register("password")}
            />
          </Field>
          <Field label="Confirm password" required error={errors.confirmPassword?.message}>
            <Input
              type="password"
              placeholder="Repeat your password"
              {...register("confirmPassword")}
            />
          </Field>
          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
