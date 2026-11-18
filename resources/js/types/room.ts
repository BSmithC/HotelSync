export type AreaData = {
    id: number;
    name: string;
    width: number;
    height: number;
};

export type RoomData = {
    id: number;
    name: string;
    capacity: number;
    area_id: number;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    rotation: number;
    shape: string;
    active: boolean;
    description: string | null;
    price: string | null;
    phone: string | null;
    status: string;
    area?: AreaData | null;
};
