import { describe, it, expect, beforeEach } from 'vitest';
import { MachineStatusPipelineImpl } from '../../../../src/modules/master/pipelines/MachineStatusPipeline';
import { BoxStatusPipelineImpl } from '../../../../src/modules/master/pipelines/BoxStatusPipeline';
import { createTestMachine, createTestBox } from '../../../factories';
import { db } from '../../../../src/shared/db';
import { machines, boxes } from '../../../../src/shared/db/schema';
import { eq } from 'drizzle-orm';

describe('Master Status Pipelines', () => {
    describe('MachineStatusPipeline', () => {
        let pipeline: MachineStatusPipelineImpl;

        beforeEach(() => {
            pipeline = new MachineStatusPipelineImpl();
        });

        it('製造機のステータスを強制的に上書きできること', async () => {
            const machine = await createTestMachine({ status: 'READY' });
            
            await pipeline.execute({ id: machine.id, status: 'MAINTENANCE' });

            const updated = await db.query.machines.findFirst({
                where: eq(machines.id, machine.id),
            });
            expect(updated?.status).toBe('MAINTENANCE');
        });
    });

    describe('BoxStatusPipeline', () => {
        let pipeline: BoxStatusPipelineImpl;

        beforeEach(() => {
            pipeline = new BoxStatusPipelineImpl();
        });

        it('保管BOXのステータスを強制的に上書きできること', async () => {
            const box = await createTestBox({ status: 'AVAILABLE' });
            
            await pipeline.execute({ id: box.id, status: 'OCCUPIED' });

            const updated = await db.query.boxes.findFirst({
                where: eq(boxes.id, box.id),
            });
            expect(updated?.status).toBe('OCCUPIED');
        });
    });
});
