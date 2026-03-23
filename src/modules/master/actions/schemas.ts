import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
});

export const deleteProjectSchema = z.object({
  id: z.string().uuid(),
});

export const createUnitSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, '名前を入力してください'),
});

export const deleteUnitSchema = z.object({
  id: z.string().uuid(),
});

export const createPartSchema = z.object({
  unitId: z.string().uuid(),
  partNumber: z.string().min(1, '部品番号を入力してください'),
  stlUrl: z.string().url().optional().or(z.literal('')),
});

export const updatePartSchema = z.object({
  id: z.string().uuid(),
  partNumber: z.string().min(1).optional(),
  status: z.enum(['PENDING', 'ACTIVE']).optional(),
});

export const deletePartSchema = z.object({
  id: z.string().uuid(),
});

export const createMachineSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  type: z.string().min(1, 'タイプを入力してください'),
});

export const forceSetMachineStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['READY', 'RUNNING', 'MAINTENANCE']),
});

export const createBoxSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
});

export const deleteBoxSchema = z.object({
  id: z.string().uuid(),
});

export const forceSetBoxStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['AVAILABLE', 'OCCUPIED']),
});
