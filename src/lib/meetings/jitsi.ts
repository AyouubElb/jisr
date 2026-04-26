export function generateJitsiUrl(courseId: string): string {
  const shortCourseId = courseId.slice(0, 8);
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `https://meet.jit.si/english-platform-${shortCourseId}-${randomSuffix}`;
}
