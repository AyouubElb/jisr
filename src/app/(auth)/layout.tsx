import { BookOpen, GraduationCap, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side: Branded visual panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-amber-600 p-12 text-stone-900">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-amber-200/20 blur-2xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            English Learn
          </span>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Maitrisez l&apos;anglais,
              <br />
              un cours a la fois.
            </h2>
            <p className="max-w-md text-lg text-stone-800/80">
              Rejoignez une plateforme d&apos;apprentissage moderne avec des
              cours structures, des sessions en direct et un accompagnement
              personnalise.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            <FeatureItem
              icon={<BookOpen className="h-5 w-5" />}
              title="Cours par niveau CECRL"
              description="De A1 a C2, progressez a votre rythme"
            />
            <FeatureItem
              icon={<Users className="h-5 w-5" />}
              title="Sessions en direct"
              description="Pratiquez avec votre instructeur"
            />
            <FeatureItem
              icon={<Sparkles className="h-5 w-5" />}
              title="Ressources illimitees"
              description="Acces aux supports et materiels"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-stone-800/70">
          &copy; {new Date().getFullYear()} English Learn. Tous droits reserves.
        </div>
      </div>

      {/* Right side: Auth form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo (only shown on small screens) */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              English Learn
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-stone-900">{title}</p>
        <p className="text-sm text-stone-800/75">{description}</p>
      </div>
    </div>
  );
}
