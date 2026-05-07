import Link from "next/link";
import { GraduationCap, Home } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";

type Audience = "instructor" | "admin" | "student" | "guest";

async function resolveAudience(): Promise<Audience> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "guest";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return "admin";
  if (profile?.role === "instructor") return "instructor";
  return "student";
}

const COPY = {
  instructor: {
    eyebrow: "404",
    title: "Page not found",
    body: "The page you’re looking for doesn’t exist or has been moved.",
    cta: "Back to dashboard",
    href: "/instructor",
  },
  admin: {
    eyebrow: "404",
    title: "Page not found",
    body: "The page you’re looking for doesn’t exist or has been moved.",
    cta: "Back to overview",
    href: "/admin",
  },
  student: {
    eyebrow: "404",
    title: "Page introuvable",
    body: "La page que vous cherchez n’existe pas ou a été déplacée.",
    cta: "Retour au tableau de bord",
    href: "/student",
  },
  guest: {
    eyebrow: "404",
    title: "Page introuvable",
    body: "La page que vous cherchez n’existe pas ou a été déplacée.",
    cta: "Retour à l’accueil",
    href: "/",
  },
} satisfies Record<Audience, { eyebrow: string; title: string; body: string; cta: string; href: string }>;

export default async function NotFound(): Promise<React.JSX.Element> {
  const audience = await resolveAudience();
  const copy = COPY[audience];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-16">
      <div className="flex items-center gap-3 mb-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">English Learn</span>
      </div>

      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest text-primary">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-4 text-base text-muted-foreground">{copy.body}</p>

        <div className="mt-8 flex justify-center">
          <Link href={copy.href} className={buttonVariants({ size: "lg" })}>
            <Home className="mr-2 h-4 w-4" />
            {copy.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
