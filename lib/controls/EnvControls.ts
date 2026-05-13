// lib\controls\EnvControls.ts
export const APP_ENV = (typeof process !== 'undefined' && process.env ? process.env.APP_ENV || "development" : "development");

export const isProduction = APP_ENV === "production";

export const isTest = !isProduction;