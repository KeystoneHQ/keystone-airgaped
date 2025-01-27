import { UR } from "@ngraveio/bc-ur";

type DecodedSuccess = {
  result: UR;
  status: ReadStatus.success;
};

type DecodedCanceled = {
  status: ReadStatus.canceled;
};

export type DecodedResult = DecodedSuccess | DecodedCanceled;

export enum ReadStatus {
  canceled = "canceled",
  success = "success",
}

export enum PlayStatus {
  canceled = "canceled",
  success = "success",
}

export type Play = (
  data: UR,
  options?: {
    refreshSpeed?: number;
    hasNext?: boolean;
    title?: string;
    description?: string;
    maxFragmentLength? : number;
  }
) => Promise<PlayStatus>;

export type Read = (
  expect: SupportedResult[],
  options?: {
    title?: string;
    description?: string;
    renderInitial?: {
      walletMode: string;
      link: string;
      description?: string[];
    };
    URTypeErrorMessage?: string;
  }
) => Promise<DecodedResult>;

export type SDK = {
  read: Read,
  play: Play,
  cameraReady: boolean
}

export enum SupportedResult {
  UR_BYTES = "bytes",
  UR_CRYPTO_HDKEY = "crypto-hdkey",
  UR_CRYPTO_ACCOUNT = "crypto-account",
  UR_ETH_SIGN_REQUEST = "eth-sign-request",
  UR_ETH_SIGNATURE = "eth-signature",
  UR_CRYPTO_MULTI_ACCOUNTS = "crypto-multi-accounts",
  UR_SOL_SIGN_REQUEST = "sol-sign-request",
  UR_SOL_SIGNATURE = "sol-signature",
  UR_APTOS_SIGN_REQUEST='aptos-sign-request',
  UR_APTOS_SIGNATURE = 'aptos-signature',
  UR_ARWEAVE_SIGN_REQUEST = 'arweave-sign-request',
  UR_ARWEAVE_SIGNATURE = 'arweave-signature',
  UR_ARWEAVE_CRYPTO_ACCOUNT = 'arweave-crypto-account',
  UR_COSMOS_SIGN_REQUEST = 'cosmos-sign-request',
  UR_COSMOS_SIGNATURE = 'cosmos-signature',
  UR_PSBT = "crypto-psbt",
  UR_BTC_SIGN_REQUEST = 'btc-sign-request',
  UR_BTC_SIGNATURE = 'btc-signature',
}
