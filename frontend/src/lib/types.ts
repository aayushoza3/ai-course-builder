// src/lib/types.ts
export type CourseStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'canceled';

export type Course = {
  id: number;
  title: string;
  description?: string | null;
  status: CourseStatus;
  task_id?: string | null;
};

export type Resource = {
  id: number;
  url: string;
  title: string;
  provider: string;
};

export type Lesson = {
  id: number;
  title: string;
  content_md?: string | null;
  resources: Resource[];
};

export type Module = {
  id: number;
  title: string;
  order: number;
  lessons: Lesson[];
};

export type CourseDetail = Course & { modules: Module[] };
