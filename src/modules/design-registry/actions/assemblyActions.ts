'use server';

import { revalidatePath } from 'next/cache';
import { safeAction } from '@/shared/actions/safeAction';
import { requireUser } from '@/shared/auth/requireUser';
import { createAssemblySchema } from './schemas';
import { AssemblyService } from '../services/AssemblyService';

export const createAssemblyAction = async (formData: FormData) => {
    return safeAction(
        createAssemblySchema,
        { name: formData.get('name') },
        async ({ name }) => {
            const user = await requireUser();
            const assembly = await AssemblyService.create(user.id, name);
            revalidatePath('/assemblies');
            return assembly;
        }
    );
};
