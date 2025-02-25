import {
  Buffer,
  DataItem,
  DataItemMap,
  decodeToDataItem,
  RegistryItem,
} from "@keystonehq/bc-ur-registry";
import { ExtendedRegistryTypes } from "./RegistryType";
import { ErgoAsset } from "./ErgoAsset";

enum Keys {
  boxId = 1,
  value,
  ergoTree,
  assets,
}

export interface ErgoUnspentBoxProps {
  boxId: string;
  value: string; // e.g. "10000000000000"
  ergoTree: string;
  assets?: ErgoAsset[];
}

export class ErgoUnspentBox extends RegistryItem {
  private boxId: string;
  private value: string; // e.g. "10000000000000"
  private ergoTree: string;
  private assets?: ErgoAsset[];

  getRegistryType = () => ExtendedRegistryTypes.ERGO_UNSPENT_BOX;

  constructor(args: ErgoUnspentBoxProps) {
    super();
    this.boxId = args.boxId;
    this.value = args.value;
    this.ergoTree = args.ergoTree;
    this.assets = args.assets;
  }

  public getBoxId = () => this.boxId;
  public getValue = () => this.value;
  public getErgoTree = () => this.ergoTree;
  public getAssets = () => this.assets;

  public toDataItem = () => {
    const map: DataItemMap = {};
    map[Keys.boxId] = this.boxId;
    map[Keys.value] = this.value;
    map[Keys.ergoTree] = this.ergoTree;
    if (this.assets) {
      map[Keys.assets] = this.assets.map((asset) => {
        const res = asset.toDataItem();
        res.setTag(asset.getRegistryType().getTag());
        return res;
      });
    }
    return new DataItem(map);
  };

  public static fromDataItem = (dataItem: DataItem) => {
    const map = dataItem.getData();
    const boxId = map[Keys.boxId];
    const value = map[Keys.value];
    const ergoTree = map[Keys.ergoTree];
    const assets = map[Keys.assets]
      ? map[Keys.assets].map((asset: DataItem) => ErgoAsset.fromDataItem(asset))
      : undefined;
    return new ErgoUnspentBox({
      boxId,
      value,
      ergoTree,
      assets,
    });
  };

  public static fromCBOR = (_cborPayload: Buffer) => {
    const dataItem = decodeToDataItem(_cborPayload);
    return ErgoUnspentBox.fromDataItem(dataItem);
  };

  public static constructErgoUnspentBox(
    boxId: string,
    value: string,
    ergoTree: string,
    assets?: ErgoAsset[]
  ): ErgoUnspentBox {
    return new ErgoUnspentBox({
      boxId,
      value,
      ergoTree,
      assets,
    });
  }
}
