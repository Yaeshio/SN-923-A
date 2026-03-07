export interface MockStorageService {
    uploadFile(file: any, path: string): Promise<string>;
    getDownloadUrl(path: string): Promise<string>;
    deleteFile(path: string): Promise<void>;
}

export interface MockDbService {
    transaction<T>(cb: () => Promise<T>): Promise<T>;
}

// Just empty definitions for tests to mock against
export const StorageService: MockStorageService = {
    uploadFile: async () => '',
    getDownloadUrl: async () => '',
    deleteFile: async () => { },
};

export const DbService: MockDbService = {
    transaction: async (cb) => cb(),
};
