export interface Manga {
    id: string;
    title: string;
    coverUrl: string;
    publicUrl: string;
    source: string; // e.g., "MANGADEX"
}

export interface Chapter {
    id: string;
    name: string;
    number: number;
    uploadDate: number;
    scanlator: string;
}

export interface MangaDetails extends Manga {
    description: string;
    author: string;
    genres: string[];
    status: 'ONGOING' | 'COMPLETED' | 'UNKNOWN';
}

export interface MangaPage {
    url: string;
}