"use client";

import { cloneElement, useState, type ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, UserPlus } from "lucide-react";
import {
  useAllStudents,
  useCourseEnrollments,
  useAddStudent,
} from "@/lib/hooks/useEnrollments";

interface AddStudentDialogProps {
  courseId: string;
  trigger: ReactElement<{ disabled?: boolean }>;
  isPublished: boolean;
}

export function AddStudentDialog({
  courseId,
  trigger,
  isPublished,
}: AddStudentDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: enrollments } = useCourseEnrollments(courseId);
  const { data: allStudents } = useAllStudents();
  const { mutate: addStudent } = useAddStudent();

  if (!isPublished) {
    return (
      <Tooltip>
        <TooltipTrigger render={cloneElement(trigger, { disabled: true })} />
        <TooltipContent>
          Publish the course before enrolling students
        </TooltipContent>
      </Tooltip>
    );
  }

  const enrolledIds = new Set(enrollments?.map((e) => e.student_id) ?? []);
  const filtered = (allStudents ?? []).filter(
    (s) =>
      !enrolledIds.has(s.id) &&
      s.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add student</DialogTitle>
          <DialogDescription>
            Select a student to enroll in this course
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {!filtered.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search
                  ? "No results"
                  : "All students are already enrolled"}
              </p>
            ) : (
              filtered.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
                  onClick={() => {
                    addStudent({ courseId, studentId: student.id });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {student.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">
                      {student.full_name}
                    </span>
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
