/// <reference types="vite/client" />

declare module 'qrcode';
declare module 'uuid';

declare module '*.md' {
  const content: string;
  export default content;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}
