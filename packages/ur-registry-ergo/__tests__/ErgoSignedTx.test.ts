// @ts-nocheck
import { ErgoSignedTx } from "../src";
import * as uuid from "uuid";

describe("ergo-signed-tx", () => {
  it("test should generate ergo-signed-tx", () => {
    const signedTx = Buffer.from(
      "011a9f15bfac9379c882fe0b7ecb2288153ce4f2def4f272214fb80f8e2630f04c38a3f024d30e683ee9bd4e2b65de9ee3c4b29f051d65a7dc0d670e75a962326cf9daa0d8bf32b067ed3e426b9bc29a3ff9c937f96e02fb9ce1000001fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e4003c0843d0008cd02dc5b9d9d2081889ef00e6452fb5ad1730df42444ceccb9ea02258256d2fbd262e4f25601006400c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304e4f2560000809bee020008cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aae4f25601006400",
      "hex"
    );
    const requestId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const idBuffer = uuid.parse(requestId) as Uint8Array;

    const ergoSignedTx = new ErgoSignedTx(Buffer.from(idBuffer), signedTx);

    const cborHex = ergoSignedTx.toCBOR().toString("hex");
    const ur = ergoSignedTx.toUREncoder(1000).nextPart();
    expect(ur).toBe(
      "ur:ergo-signed-tx/oeadgdndcawmgtfrkigrpmndutdnbtkgfssbjnaohkadgsadcynebzrspsmukksplfzebdkbsbcplobzfnvewzuewkwzjpclgwrobsmndsdywtgsetotwtdktebaisfmwlrygldnihuennvlssprneahcaihosuobtiobakpptideyjzyttnnbtprseypfiowefmfwjendsanyfhytsoemytjtaozonsvyaeaeadzordpsjkemtigysebssrtnbnsblngwgteytyaedigockcefmottoenctesrhckfzaxrtlrfsaeaysnaouohpntntcxlylonnwtbaiegmzohtttjkbtwkdkfytosfrhwdaodalfhftdzotdidvewzhfadaeieaertlrfsbeahaaaeaaaebaenbeaoaanbbdaysnaokkrniykbytuorkpsgonbidmdtoltbdataondztuydptodetahkwzlyhpcmyachmkwdaottmootnylkstosadjkaejkadbeadaoaaaottmtlsaxadmuotlkstpronjkaeaeadmusapronjkadaejyjkaojkaxlsadaysnwypsmupaonjkaavewzhfaeaelandwyaoaeaysnaxlozsgheolyflembecnpksblrjzmtskkbjpsnsnjkrflptdaogdfgkbhpkkuroepkvewzhfadaeieaelykickee"
    );

    const ergoSignedTxDecoded = ErgoSignedTx.fromCBOR(
      Buffer.from(cborHex, "hex")
    );
    expect(uuid.stringify(ergoSignedTxDecoded.getRequestId())).toBe(requestId);
    expect(ergoSignedTxDecoded.getSignedTx().toString("hex")).toEqual(
      "011a9f15bfac9379c882fe0b7ecb2288153ce4f2def4f272214fb80f8e2630f04c38a3f024d30e683ee9bd4e2b65de9ee3c4b29f051d65a7dc0d670e75a962326cf9daa0d8bf32b067ed3e426b9bc29a3ff9c937f96e02fb9ce1000001fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e4003c0843d0008cd02dc5b9d9d2081889ef00e6452fb5ad1730df42444ceccb9ea02258256d2fbd262e4f25601006400c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304e4f2560000809bee020008cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aae4f25601006400"
    );
  });
});
