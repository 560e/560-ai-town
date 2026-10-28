export type PlaceType = "plaza" | "service" | "education" | "office" | "retail" | "task" | "community";
export type Point = [number, number];

export interface Place {
  id: string;
  name: string;
  shortName: string;
  number: string;
  parentId: string | null;
  type: PlaceType;
  public: boolean;
  requiredTagIds: string[];
  position: Point;
  size: Point;
  heightLimit: number;
  description: string;
  route?: string;
  externalUrl?: string;
}

export interface SitePlot {
  id: string;
  name: string;
  position: Point;
  size: Point;
}

export interface Road {
  id: string;
  position: Point;
  size: Point;
  primary?: boolean;
}

export type CameraCommand = { type: "reset" | "zoom-in" | "zoom-out" | "plan"; serial: number };
