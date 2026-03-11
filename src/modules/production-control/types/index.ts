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

export interface PartItem {
    id: string;
    part_id: string;
    machine_id: string;
    box_id: string;
    status: ItemStatus;
    updated_at: Date;
}

export interface Machine {
    id: string;
    name: string;
    type: string;
    status: MachineStatus;
}

export interface StatusHistory {
    id: string;
    part_item_id: string;
    status_from: ItemStatus | null;
    status_to: ItemStatus;
    reason_code?: ReasonCode;
    comment?: string;
    changed_at: Date;
}
