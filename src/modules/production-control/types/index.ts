export enum ItemStatus {
    READY = 'READY',
    PRINTING = 'PRINTING',
    CUTTING = 'CUTTING',
    SANDING = 'SANDING',
    INSPECTION = 'INSPECTION',
    COMPLETED = 'COMPLETED',
    SHIPPED = 'SHIPPED',
    DISCARD = 'DISCARD',
    CANCELLED = 'CANCELLED',
}

export enum MachineStatus {
    READY = 'READY',
    RUNNING = 'RUNNING',
    MAINTENANCE = 'MAINTENANCE',
}

export enum ReasonCode {
    OPERATIONAL_ERROR = 'OPERATIONAL_ERROR',
    QUALITY_ISSUE = 'QUALITY_ISSUE',
    EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
    ORDER_CANCEL = 'ORDER_CANCEL',
}

export interface Box {
    id: string;
    name: string;
    status: string;
}

export interface Part {
    id: string;
    partNumber: string;
    stlUrl?: string | null;
    status: string;
}

export interface PartItem {
    id: string;
    partId: string;
    machineId: string;
    boxId: string | null;
    status: ItemStatus;
    updatedAt: Date;
    part?: Part;
    machine?: Machine;
    box?: Box | null;
}

export interface Machine {
    id: string;
    name: string;
    type: string;
    status: MachineStatus;
}

export interface StatusHistory {
    id: string;
    partItemId: string;
    statusFrom: ItemStatus | null;
    statusTo: ItemStatus;
    reasonCode?: ReasonCode;
    comment?: string;
    changedAt: Date;
}
