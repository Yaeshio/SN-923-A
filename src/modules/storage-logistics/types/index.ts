export enum BoxStatus {
    AVAILABLE = 'AVAILABLE',
    OCCUPIED = 'OCCUPIED',
}

export interface Box {
    id: string;
    name: string;
    status: BoxStatus;
}
