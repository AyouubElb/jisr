"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  useLessonMaterials,
  useExerciseMaterials,
  useUploadMaterial,
  useDeleteMaterial,
  useSignedUrl,
} from "@/lib/hooks/useMaterials";
import {
  FileText,
  Image,
  Upload,
  X,
  Download,
  Loader2,
} from "lucide-react";

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp";
const MAX_SIZE_MB = 10;

interface SavedFileUploadProps {
  courseId: string;
  lessonId?: string;
  exerciseId?: string;
  /** Not used in saved mode — omit */
  pendingFiles?: never;
  onPendingFilesChange?: never;
}

interface PendingFileUploadProps {
  /** Not used in pending mode */
  courseId?: never;
  lessonId?: never;
  exerciseId?: never;
  /** Local files queued before save */
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
}

type FileUploadProps = SavedFileUploadProps | PendingFileUploadProps;

export function FileUpload(props: FileUploadProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPendingMode = "pendingFiles" in props && props.pendingFiles !== undefined;

  // Saved-mode hooks — only valid when IDs exist
  const { data: lessonMaterials, isLoading: isLoadingLesson } =
    useLessonMaterials(!isPendingMode ? props.lessonId : undefined);
  const { data: exerciseMaterials, isLoading: isLoadingExercise } =
    useExerciseMaterials(!isPendingMode ? props.exerciseId : undefined);

  const { mutate: upload, isPending: isUploading } = useUploadMaterial();
  const { mutate: deleteMaterial } = useDeleteMaterial();
  const { mutate: getSignedUrl } = useSignedUrl();

  const isLoading = isLoadingLesson || isLoadingExercise;
  const savedMaterials = !isPendingMode
    ? (props.lessonId ? lessonMaterials : exerciseMaterials) ?? []
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Le fichier ne doit pas depasser ${MAX_SIZE_MB} Mo`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (isPendingMode) {
      props.onPendingFilesChange([...props.pendingFiles, file]);
    } else {
      upload({
        file,
        courseId: props.courseId,
        lessonId: props.lessonId,
        exerciseId: props.exerciseId,
      });
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDownload = (fileUrl: string, fileName: string): void => {
    getSignedUrl(fileUrl, {
      onSuccess: (url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      },
    });
  };

  const fileIcon = (fileType: string): React.JSX.Element => {
    if (fileType.startsWith("image/")) {
      return <Image className="h-4 w-4 shrink-0 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 shrink-0 text-orange-500" />;
  };

  const formatExt = (name: string): string =>
    name.split(".").pop()?.toUpperCase() ?? "";

  return (
    <div className="space-y-2">
      {/* Saved materials list */}
      {!isPendingMode && !isLoading && savedMaterials.length > 0 && (
        <div className="space-y-1.5">
          {savedMaterials.map((mat) => (
            <div
              key={mat.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              {fileIcon(mat.file_type)}
              <span className="min-w-0 flex-1 truncate text-sm">{mat.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatExt(mat.name)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="Telecharger"
                onClick={() => handleDownload(mat.file_url, mat.name)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                title="Supprimer"
                onClick={() =>
                  deleteMaterial({
                    id: mat.id,
                    fileUrl: mat.file_url,
                    lessonId: props.lessonId,
                    exerciseId: props.exerciseId,
                  })
                }
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pending files list (create mode) */}
      {isPendingMode && props.pendingFiles.length > 0 && (
        <div className="space-y-1.5">
          {props.pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              {fileIcon(file.type)}
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatExt(file.name)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                title="Retirer"
                onClick={() =>
                  props.onPendingFilesChange(
                    props.pendingFiles.filter((_, i) => i !== index),
                  )
                }
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isPendingMode && isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {!isPendingMode && isUploading ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Ajouter un document
          </>
        )}
      </Button>
    </div>
  );
}
