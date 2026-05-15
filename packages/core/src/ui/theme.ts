export interface Theme {
    primary: string;
    secondary: string;
    danger: string;
    text: string;
    bg: string;
    fontFamily: string;
}

export const DEFAULT_THEME: Theme = {
    primary: '#7df9ff',
    secondary: '#9d4edd',
    danger: '#ff5577',
    text: '#e6f1ff',
    bg: '#020617',
    fontFamily: 'monospace'
};
