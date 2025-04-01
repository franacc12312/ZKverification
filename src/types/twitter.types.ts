export interface TwitterUserData {
    id: string;
    created_at: string;
    [key: string]: any; // Para otros campos que podamos recibir
}

export interface ECDSASignature {
    r: string;
    s: string;
}

export interface PublicKey {
    x: string;
    y: string;
}

export interface TwitterData {
    twitter_data: TwitterUserData;
    messageHash: string;
    signature: ECDSASignature;
    publicKey: PublicKey;
} 