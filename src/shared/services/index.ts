export * from './StorageService';

export interface MockDbService {
    transaction<T>(cb: (tx: any) => Promise<T>): Promise<T>;
}

// Helper to provide transaction context like MockDbService did
export const DbService: MockDbService = {
    transaction: async (cb) => {
        // In real implementation, this would be db.transaction
        // Since we have a real DB client now, we can use it or keep this as a shim
        return cb(null as any); 
    },
};
