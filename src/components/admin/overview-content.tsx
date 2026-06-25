"use client";

import { useAdminStats } from "@/lib/hooks/useAdmin";
import { StatCard } from "@/components/ui/stat-card";
import { RecentInvitesCard } from "@/components/admin/recent-invites-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, Mail, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminOverviewContent(): React.JSX.Element {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Vue d&apos;ensemble</h1>
        <p className="text-muted-foreground">Etat de la plateforme en temps reel</p>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Instructeurs"
          value={stats?.totalInstructors ?? 0}
          icon={<GraduationCap className="h-4 w-4" />}
          loading={isLoading}
          description="Comptes actifs"
        />
        <StatCard
          label="Etudiants"
          value={stats?.totalStudents ?? 0}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
          description="Sur la plateforme"
        />
        <StatCard
          label="Cours publies"
          value={stats?.totalCourses ?? 0}
          icon={<BookOpen className="h-4 w-4" />}
          loading={isLoading}
          description="Accessibles aux etudiants"
        />
        <StatCard
          label="Inscriptions"
          value={stats?.totalEnrollments ?? 0}
          icon={<Mail className="h-4 w-4" />}
          loading={isLoading}
          description="Total toutes classes"
        />
      </div>

      {/* ── BENTO GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Recent invites — spans 3 cols */}
        <RecentInvitesCard />

        {/* Quick actions — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions rapides</CardTitle>
            <CardDescription>Gestion de la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/invites" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="mr-2 h-4 w-4" />
                Creer une invitation
              </Button>
            </Link>
            <Link href="/admin/instructors" className="block">
              <Button variant="outline" className="w-full justify-start">
                <GraduationCap className="mr-2 h-4 w-4" />
                Gerer les instructeurs
              </Button>
            </Link>
            <Link href="/admin/students" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Voir les etudiants
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
