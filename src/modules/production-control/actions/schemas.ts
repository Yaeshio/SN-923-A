import { z } from 'zod';
import { ItemStatus } from '../types';

export const orderPartsSchema = z.object({
    partId: z.string().min(1, 'Part ID is required'),
    machineId: z.string().min(1, 'Machine ID is required'),
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
});

export const updateStatusSchema = z.object({
    itemId: z.string().min(1, 'Item ID is required'),
    newStatus: z.nativeEnum(ItemStatus),
    reason_code: z.any().optional(), // Can refine to actual ReasonCode type later
    comment: z.string().optional(),
});
