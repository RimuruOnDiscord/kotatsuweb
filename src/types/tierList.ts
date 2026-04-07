export type TierRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface TierItem {
  id: string;
  imageUrl: string;
  name?: string;
}

export interface TierList {
  id: string;
  name: string;
  items: {
    S: TierItem[];
    A: TierItem[];
    B: TierItem[];
    C: TierItem[];
    D: TierItem[];
    F: TierItem[];
    unranked: TierItem[];
  };
  created_at: string;
  updated_at: string;
}
