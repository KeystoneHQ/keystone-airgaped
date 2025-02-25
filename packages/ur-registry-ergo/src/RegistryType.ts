import { RegistryType } from "@keystonehq/bc-ur-registry";

export const ExtendedRegistryTypes = {
  ERGO_SIGN_REQUEST: new RegistryType("ergo-sign-request", 8401),
  ERGO_SIGNED_TX: new RegistryType("ergo-signed-tx", 8402),
  ERGO_UNSPENT_BOX: new RegistryType("ergo-unspent-box", 8403),
  ERGO_ASSET: new RegistryType("ergo-asset", 8404),
};
