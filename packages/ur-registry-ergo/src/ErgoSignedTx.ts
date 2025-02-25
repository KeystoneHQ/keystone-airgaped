import {
  Buffer,
  DataItem,
  DataItemMap,
  decodeToDataItem,
  RegistryItem,
} from "@keystonehq/bc-ur-registry";
import { ExtendedRegistryTypes } from "./RegistryType";

enum Keys {
  requestId = 1,
  signedTx,
}

export class ErgoSignedTx extends RegistryItem {
  private requestId: Buffer;
  private signedTx: Buffer;

  getRegistryType = () => ExtendedRegistryTypes.ERGO_SIGNED_TX;

  constructor(requestId: Buffer, signedTx: Buffer) {
    super();
    this.requestId = requestId;
    this.signedTx = signedTx;
  }

  public getRequestId = () => this.requestId;
  public getSignedTx = () => this.signedTx;

  public toDataItem = () => {
    const map: DataItemMap = {};
    map[Keys.requestId] = this.requestId;
    map[Keys.signedTx] = this.signedTx;
    return new DataItem(map);
  };

  public static fromDataItem = (dataItem: DataItem) => {
    const map = dataItem.getData();
    const requestId = map[Keys.requestId];
    const signedTx = map[Keys.signedTx];
    return new ErgoSignedTx(requestId, signedTx);
  };

  public static fromCBOR = (_cborPayload: Buffer) => {
    const dataItem = decodeToDataItem(_cborPayload);
    return ErgoSignedTx.fromDataItem(dataItem);
  };
}
