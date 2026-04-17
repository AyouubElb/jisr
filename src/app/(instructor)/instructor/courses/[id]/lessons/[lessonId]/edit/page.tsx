"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Loader2,
  Pencil,
  Save,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUpload } from "@/components/course/file-upload";
import { useLesson, useUpdateLesson } from "@/lib/hooks/useLessons";
import { useCourse } from "@/lib/hooks/useCourses";
import {
  createLessonSchema,
  type CreateLessonInput,
} from "@/lib/schemas/course.schema";

const MAX_DOCX_SIZE_MB = 10;

const LESSON_TYPE_LABEL: Record<CreateLessonInput["type"], string> = {
  grammar: "Grammaire",
  vocabulary: "Vocabulaire",
  resource: "Ressource",
};

export default function LessonEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: course } = useCourse(courseId);
  const { mutate: updateLesson, isPending: isSaving } =
    useUpdateLesson(courseId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const form = useForm<CreateLessonInput>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: { title: "", content: "", type: "grammar" },
  });

  // Hydrate form once lesson loads
  useEffect(() => {
    if (!lesson) return;
    form.reset({
      title: lesson.title,
      content: lesson.content ?? "",
      type: lesson.type as CreateLessonInput["type"],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  const type = form.watch("type");
  const content = form.watch("content");
  const title = form.watch("title");

  const sectionTitle = course?.sections?.find((s) =>
    s.lessons?.some((l) => l.id === lessonId),
  )?.title;

  const wordCount = (content ?? "")
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  // ── Import from Word ───────────────────────────────────────
  const hasContent = (content ?? "").replace(/<[^>]*>/g, "").trim().length > 0;

  const runImport = async (file: File): Promise<void> => {
    setIsImporting(true);
    try {
      const mammoth = (await import("mammoth")).default;
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      form.setValue("content", result.value, { shouldDirty: true });

      if (!title.trim()) {
        const nameWithoutExt = file.name.replace(/\.docx$/i, "");
        form.setValue("title", nameWithoutExt, { shouldDirty: true });
      }

      if (result.messages.length > 0) {
        toast.success(
          `Import reussi. ${result.messages.length} element${result.messages.length !== 1 ? "s" : ""} non supporte${result.messages.length !== 1 ? "s" : ""} ignore${result.messages.length !== 1 ? "s" : ""}.`,
        );
      } else {
        toast.success("Import reussi");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Erreur d'import : ${error.message}`
          : "Erreur d'import",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Seuls les fichiers .docx sont supportes");
      return;
    }
    if (file.size > MAX_DOCX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier ne doit pas depasser ${MAX_DOCX_SIZE_MB} Mo`);
      return;
    }

    if (hasContent) {
      setPendingImportFile(file);
    } else {
      void runImport(file);
    }
  };

  const onSave = (data: CreateLessonInput): void => {
    updateLesson(
      { id: lessonId, updates: data },
      {
        onSuccess: () => {
          router.push(`/instructor/courses/${courseId}`);
        },
      },
    );
  };

  // ── Loading ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid flex-1 gap-4 lg:grid-cols-4">
          <Skeleton className="h-full rounded-xl lg:col-span-1" />
          <Skeleton className="h-full rounded-xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Lecon introuvable</p>
        <Link href={`/instructor/courses/${courseId}`}>
          <Button variant="outline">Retour au cours</Button>
        </Link>
      </div>
    );
  }

  // ── Bento layout ─────────────────────────────────────────────
  return (
    <form
      onSubmit={form.handleSubmit(onSave)}
      className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:p-6"
    >
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 sm:px-4 sm:py-3">
        <Link href={`/instructor/courses/${courseId}`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            title="Retour au cours"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <BookOpen className="h-5 w-5 shrink-0 text-primary/70" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-amber-950 sm:text-base">
            {title || lesson.title}
          </p>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            {sectionTitle && (
              <>
                <span className="truncate">{sectionTitle}</span>
                <span>·</span>
              </>
            )}
            <span>{LESSON_TYPE_LABEL[type]}</span>
            <span>·</span>
            <span>
              {wordCount} mot{wordCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isImporting}
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5"
          title="Importer depuis un fichier Word (.docx)"
        >
          {isImporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isImporting ? "Import..." : "Importer Word"}
          </span>
        </Button>
        <Button type="submit" disabled={isSaving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* ── Bento grid ───────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* ── Left column: settings + documents ─────────────── */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto sm:gap-4 lg:col-span-1">
          {/* Settings card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">
                Parametres
              </h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Titre</Label>
                <Input
                  placeholder="ex : Present Simple"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={type ?? ""}
                  onValueChange={(v) =>
                    form.setValue("type", v as CreateLessonInput["type"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grammar">Grammaire</SelectItem>
                    <SelectItem value="vocabulary">Vocabulaire</SelectItem>
                    <SelectItem value="resource">Ressource</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.type.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Documents card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">
                Documents
              </h2>
            </div>
            <FileUpload courseId={courseId} lessonId={lessonId} />
          </div>
        </div>

        {/* ── Right column: rich text editor ─────────────────── */}
        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-amber-950">
                Contenu de la lecon
              </h2>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <RichTextEditor
              content={content}
              onChange={(html) =>
                form.setValue("content", html, { shouldDirty: true })
              }
              placeholder="Commencez a ecrire votre lecon ici..."
              className="min-h-full"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingImportFile !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImportFile(null);
        }}
        title="Remplacer le contenu actuel ?"
        description="Le contenu de la lecon sera remplace par celui du fichier Word. Cette action ne peut pas etre annulee."
        confirmLabel="Remplacer"
        onConfirm={() => {
          const file = pendingImportFile;
          setPendingImportFile(null);
          if (file) void runImport(file);
        }}
      />
    </form>
  );
}
