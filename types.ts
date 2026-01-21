
export type City = 
  | '千代田区' | '中央区' | '港区' | '新宿区' | '文京区' | '台東区' | '墨田区' | '江東区' 
  | '品川区' | '目黒区' | '大田区' | '世田谷区' | '渋谷区' | '中野区' | '杉並区' | '豊島区' 
  | '北区' | '荒川区' | '板橋区' | '練馬区' | '足立区' | '葛飾区' | '江戸川区';

export interface SankeyNode {
  id: string;
  name: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface BudgetResponse {
  data: SankeyData;
  explanation: string;
  sources: { title: string; uri: string }[];
}
