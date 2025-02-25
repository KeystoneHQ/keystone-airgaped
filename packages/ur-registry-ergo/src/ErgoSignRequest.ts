import {
  CryptoKeypath,
  DataItem,
  DataItemMap,
  decodeToDataItem,
  PathComponent,
  RegistryItem,
} from "@keystonehq/bc-ur-registry";
import { ExtendedRegistryTypes } from "./RegistryType";
import { ErgoUnspentBox } from "./ErgoUnspentBox";
import * as uuid from "uuid";

export enum DataType {
  TRANSACTION = 1,
}

enum Keys {
  requestId = 1,
  signData,
  dataType,
  derivationPaths,
  boxes,
  origin,
}

type signRequestProps = {
  requestId: Buffer;
  signData: Buffer;
  dataType: DataType;
  derivationPaths: CryptoKeypath[];
  boxes: ErgoUnspentBox[];
  origin?: string;
};

export class ErgoSignRequest extends RegistryItem {
  private requestId: Buffer;
  private signData: Buffer;
  private dataType: DataType;
  private derivationPaths: CryptoKeypath[];
  private boxes: ErgoUnspentBox[];
  private origin?: string;

  getRegistryType = () => ExtendedRegistryTypes.ERGO_SIGN_REQUEST;

  constructor(args: signRequestProps) {
    super();
    this.requestId = args.requestId;
    this.signData = args.signData;
    this.dataType = args.dataType;
    this.derivationPaths = args.derivationPaths;
    this.boxes = args.boxes;
    this.origin = args.origin;
  }

  public getRequestId = () => this.requestId;
  public getSignData = () => this.signData;
  public getDataType = () => this.dataType;
  public getDerivationPaths = () =>
    this.derivationPaths.map((key) => key.getPath());
  public getBoxes = () => this.boxes;
  public getOrigin = () => this.origin;

  public toDataItem = () => {
    const map: DataItemMap = {};
    map[Keys.requestId] = this.requestId;
    map[Keys.signData] = this.signData;
    map[Keys.dataType] = this.dataType;
    map[Keys.derivationPaths] = this.derivationPaths.map((item) => {
      const dataItem = item.toDataItem();
      dataItem.setTag(item.getRegistryType().getTag());
      return dataItem;
    });
    map[Keys.boxes] = this.boxes.map((box) => {
      const dataItem = box.toDataItem();
      dataItem.setTag(box.getRegistryType().getTag());
      return dataItem;
    });
    if (this.origin) {
      map[Keys.origin] = this.origin;
    }
    return new DataItem(map);
  };

  public static fromDataItem = (dataItem: DataItem) => {
    const map = dataItem.getData();
    const signData = map[Keys.signData];
    const requestId = map[Keys.requestId];
    const dataType = map[Keys.dataType];
    const derivationPaths = map[Keys.derivationPaths].map((item: DataItem) =>
      CryptoKeypath.fromDataItem(item)
    );
    const origin = map[Keys.origin] ? map[Keys.origin] : undefined;
    const boxes = map[Keys.boxes].map((box: DataItem) =>
      ErgoUnspentBox.fromDataItem(box)
    );
    return new ErgoSignRequest({
      requestId,
      signData,
      dataType,
      derivationPaths,
      boxes,
      origin,
    });
  };

  public static fromCBOR = (_cborPayload: Buffer) => {
    const dataItem = decodeToDataItem(_cborPayload);
    return ErgoSignRequest.fromDataItem(dataItem);
  };

  public static constructErgoSignRequest(
    uuidString: string,
    signData: Buffer,
    derivationPaths: string[],
    boxes: ErgoUnspentBox[],
    origin?: string
  ): ErgoSignRequest {
    const derivationPathObjects = derivationPaths.map((path) => {
      const paths = path.replace(/[m|M]\//, "").split("/");
      const pathComponent = paths.map((path) => {
        const index = parseInt(path.replace("'", ""));
        let isHardened = false;
        if (path.endsWith("'")) {
          isHardened = true;
        }
        return new PathComponent({ index, hardened: isHardened });
      });
      return new CryptoKeypath(pathComponent);
    });
    return new ErgoSignRequest({
      requestId: Buffer.from(uuid.parse(uuidString) as Uint8Array),
      signData,
      dataType: DataType.TRANSACTION,
      derivationPaths: derivationPathObjects,
      boxes: boxes,
      origin: origin || undefined,
    });
  }
}
