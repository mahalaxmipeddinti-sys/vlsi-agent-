export interface ICData {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}
export type ICCategory = any;
export const icDatabase: Record<string, any> = {};
export const getICData = (...args: any[]): any => null;
export const getIcById = (...args: any[]): any => null;
export const generateDatabase = (...args: any[]): any => [];