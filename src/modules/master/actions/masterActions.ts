'use server';

import { db } from "../../../shared/db";
import { projects, units, parts, machines, boxes } from "../../../shared/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { safeAction } from "../../../shared/actions/safeAction";
import * as schemas from "./schemas";
import { MachineStatusPipelineImpl } from "../pipelines/MachineStatusPipeline";
import { BoxStatusPipelineImpl } from "../pipelines/BoxStatusPipeline";

const MASTER_PATH = "/master";

// Projects
export const createProjectAction = async (input: unknown) => {
  return safeAction(schemas.createProjectSchema, input, async (data) => {
    const [result] = await db.insert(projects).values(data).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

export const deleteProjectAction = async (input: unknown) => {
  return safeAction(schemas.deleteProjectSchema, input, async (data) => {
    const [result] = await db.delete(projects).where(eq(projects.id, data.id)).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

// Units
export const createUnitAction = async (input: unknown) => {
  return safeAction(schemas.createUnitSchema, input, async (data) => {
    const [result] = await db.insert(units).values(data).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

export const deleteUnitAction = async (input: unknown) => {
  return safeAction(schemas.deleteUnitSchema, input, async (data) => {
    const [result] = await db.delete(units).where(eq(units.id, data.id)).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

// Parts
export const createPartAction = async (input: unknown) => {
  return safeAction(schemas.createPartSchema, input, async (data) => {
    const [result] = await db.insert(parts).values(data).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

export const updatePartAction = async (input: unknown) => {
  return safeAction(schemas.updatePartSchema, input, async (data) => {
    const { id, ...updateData } = data;
    const [result] = await db.update(parts).set(updateData).where(eq(parts.id, id)).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

export const deletePartAction = async (input: unknown) => {
  return safeAction(schemas.deletePartSchema, input, async (data) => {
    const [result] = await db.delete(parts).where(eq(parts.id, data.id)).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

// Machines
export const createMachineAction = async (input: unknown) => {
  return safeAction(schemas.createMachineSchema, input, async (data) => {
    const [result] = await db.insert(machines).values(data).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

export const forceSetMachineStatusAction = async (input: unknown) => {
  return safeAction(schemas.forceSetMachineStatusSchema, input, async (data) => {
    const pipeline = new MachineStatusPipelineImpl();
    const result = await pipeline.execute(data);
    revalidatePath(MASTER_PATH);
    return result;
  });
};

// Boxes
export const createBoxAction = async (input: unknown) => {
  return safeAction(schemas.createBoxSchema, input, async (data) => {
    const [result] = await db.insert(boxes).values(data).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

export const deleteBoxAction = async (input: unknown) => {
  return safeAction(schemas.deleteBoxSchema, input, async (data) => {
    const [result] = await db.delete(boxes).where(eq(boxes.id, data.id)).returning();
    revalidatePath(MASTER_PATH);
    return result;
  });
};

export const forceSetBoxStatusAction = async (input: unknown) => {
  return safeAction(schemas.forceSetBoxStatusSchema, input, async (data) => {
    const pipeline = new BoxStatusPipelineImpl();
    const result = await pipeline.execute(data);
    revalidatePath(MASTER_PATH);
    return result;
  });
};
