import {
  Buffer,
  DataItem,
  DataItemMap,
  decodeToDataItem,
  RegistryItem,
} from "@keystonehq/bc-ur-registry";
import { ExtendedRegistryTypes } from "./RegistryType";

enum Keys {
  tokenId = 1,
  amount,
}

export class ErgoAsset extends RegistryItem {
  private tokenId: string;
  private amount: string; // e.g. "10000000000000"

  getRegistryType = () => ExtendedRegistryTypes.ERGO_ASSET;

  constructor(tokenId: string, amount: string) {
    super();
    this.tokenId = tokenId;
    this.amount = amount;
  }

  public getTokenId = () => this.tokenId;
  public getAmount = () => this.amount;

  public toDataItem = () => {
    const map: DataItemMap = {};
    map[Keys.tokenId] = this.tokenId;
    map[Keys.amount] = this.amount;
    return new DataItem(map);
  };

  public static fromDataItem = (dataItem: DataItem) => {
    const map = dataItem.getData();
    const tokenId = map[Keys.tokenId];
    const amount = map[Keys.amount];
    return new ErgoAsset(tokenId, amount);
  };

  public static fromCBOR = (_cborPaylod: Buffer) => {
    const dataItem = decodeToDataItem(_cborPaylod);
    return ErgoAsset.fromDataItem(dataItem);
  };

  public static constructErgoAsset(tokenId: string, amount: string): ErgoAsset {
    return new ErgoAsset(tokenId, amount);
  }
}
