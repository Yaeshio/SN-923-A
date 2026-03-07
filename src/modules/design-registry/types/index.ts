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
    project_id: string;
    name: string;
}

export interface Part {
    id: string;
    unit_id: string;
    part_number: string;
    stl_url: string;
    status: PartStatus;
}
