export enum PartStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
}

export interface Project {
    id: string;
    name: string;
}

export interface Unit {
    id: string;
    projectId: string;
    name: string;
}

export interface Part {
    id: string;
    unitId: string;
    partNumber: string;
    stlUrl: string;
    status: PartStatus;
}
