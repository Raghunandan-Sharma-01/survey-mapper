export interface Category {
  subId: string;
  title: string;
  items: string[];
}

export interface TabData {
  id: string;
  title: string;
  heading: string;
  description?: string;
  categories?: Category[];
  items?: string[]; 
}