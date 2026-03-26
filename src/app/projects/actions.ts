'use server';

import { db } from "@/shared/db";
import { projects } from "@/shared/db/schema";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name) return;

  await db.insert(projects).values({ name });
  revalidatePath("/projects");
}
