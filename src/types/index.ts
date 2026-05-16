export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
}