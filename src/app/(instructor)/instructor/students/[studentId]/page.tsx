"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InstructorStudentDetailRedirect(): React.JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const studentId = params.studentId as string;
    const courseId = searchParams.get("courseId") ?? "";
    router.replace(`/instructor/students?student=${studentId}&courseId=${courseId}`);
  }, [params, searchParams, router]);

  return <div />;
}
