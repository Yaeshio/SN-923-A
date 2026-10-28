import { z } from 'zod';

export type ActionState<T> = 
    | { success: true; data: T }
    | { success: false; error: string; fieldErrors?: Partial<Record<string, string[]>> };

export async function safeAction<TInput, TOutput>(
    schema: z.ZodType<TInput>,
    input: unknown,
    action: (parsedInput: TInput) => Promise<TOutput>
): Promise<ActionState<TOutput>> {
    try {
        const result = schema.safeParse(input);
        if (!result.success) {
            return {
                success: false,
                error: 'Validation failed',
                fieldErrors: result.error.flatten().fieldErrors,
            };
        }

        const data = await action(result.data);
        return { success: true, data };
    } catch (error) {
        // Here we can add more robust error handling logic,
        // specifically catching domain errors and converting them.
        console.error('Action Error:', error);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}
