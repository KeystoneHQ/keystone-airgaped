// @ts-nocheck
import { ErgoAsset, ErgoSignRequest, ErgoUnspentBox, DataType } from "../src";
import { CryptoKeypath, PathComponent } from "@keystonehq/bc-ur-registry";
import * as uuid from "uuid";

describe("ergo-sign-request", () => {
  it("test should generate ergo-sign-request", () => {
    const signData = Buffer.from(
      "9402011a9f15bfac9379c882fe0b7ecb2288153ce4f2def4f272214fb80f8e2630f04c00000001fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e4003c0843d0008cd02dc5b9d9d2081889ef00e6452fb5ad1730df42444ceccb9ea02258256d2fbd262e4f25601006400c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304e4f2560000809bee020008cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aae4f25601006400cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aa0000",
      "hex"
    );

    const derivationPath = new CryptoKeypath([
      new PathComponent({ index: 44, hardened: true }),
      new PathComponent({ index: 429, hardened: true }),
      new PathComponent({ index: 0, hardened: true }),
      new PathComponent({ index: 0, hardened: false }),
      new PathComponent({ index: 6, hardened: false }),
    ]);

    const boxes = [
      new ErgoUnspentBox({
        boxId:
          "1a9f15bfac9379c882fe0b7ecb2288153ce4f2def4f272214fb80f8e2630f04c",
        value: "8000000",
        ergoTree:
          "0008cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aa",
        assets: [
          new ErgoAsset(
            "fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e40",
            "200"
          ),
        ],
      }),
    ];

    const ergoRequestId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const idBuffer = uuid.parse(ergoRequestId) as Uint8Array;

    const origin = "ergo-wallet";

    const ergoSignRequest = new ErgoSignRequest({
      requestId: Buffer.from(idBuffer),
      signData,
      derivationPaths: [derivationPath],
      boxes,
      dataType: DataType.TRANSACTION,
      origin,
    });

    const cborHex = ergoSignRequest.toCBOR().toString("hex");
    const ur = ergoSignRequest.toUREncoder(1000).nextPart();
    expect(ur).toBe(
      "ur:ergo-sign-request/oladgdndcawmgtfrkigrpmndutdnbtkgfssbjnaohkadftmwaoadcynebzrspsmukksplfzebdkbsbcplobzfnvewzuewkwzjpclgwrobsmndsdywtgsaeaeaeadzordpsjkemtigysebssrtnbnsblngwgteytyaedigockcefmottoenctesrhckfzaxrtlrfsaeaysnaouohpntntcxlylonnwtbaiegmzohtttjkbtwkdkfytosfrhwdaodalfhftdzotdidvewzhfadaeieaertlrfsbeahaaaeaaaebaenbeaoaanbbdaysnaokkrniykbytuorkpsgonbidmdtoltbdataondztuydptodetahkwzlyhpcmyachmkwdaottmootnylkstosadjkaejkadbeadaoaaaottmtlsaxadmuotlkstpronjkaeaeadmusapronjkadaejyjkaojkaxlsadaysnwypsmupaonjkaavewzhfaeaelandwyaoaeaysnaxlozsgheolyflembecnpksblrjzmtskkbjpsnsnjkrflptdaogdfgkbhpkkuroepkvewzhfadaeieaesnaxlozsgheolyflembecnpksblrjzmtskkbjpsnsnjkrflptdaogdfgkbhpkkuroepkaeaeaxadaalytaaddyoyadlecsdwykcfadpmykaeykaewkamwkahlytacxteoxadksfzehhsesiyehecidiyhsiaeseoemesiaeteteyiyihdyidemihiaideyeyeteteheceoiaiheeiyeyieihiyeeiyeyemeyeyeheeiyidetdyiyetiheyeneodyiydyeeiaaoioetdydydydydydyaxksfddydydyetiaiedyeoetetiyhseceeeoeoeteheeemeoemehdyeyeohshsiaideteeeniaeseniaecemihemeyiaieiaieemeoidiaetecieeydyeyecdyeeenemihecidemesieiyhseyhshsaalytacxtyoeadksfziyididhshsiaemeoeoemiedyecehiaehdyiyiaeoiehsdyiaiaideteneeiyeeieeoeyieeedydyeyemececehihehiaeoihhseoiaiheoenehiyeoesidesehiheedyaoiaeydydyamjeihjpiojldpkthsjzjzihjychasfrlg"
    );
    const ergoSignRequestDecoded = ErgoSignRequest.fromCBOR(
      Buffer.from(cborHex, "hex")
    );
    expect(uuid.stringify(ergoSignRequestDecoded.getRequestId())).toBe(
      ergoRequestId
    );
    expect(ergoSignRequestDecoded.getOrigin()).toBe(origin);
    expect(ergoSignRequestDecoded.getSignData().toString("hex")).toEqual(
      "9402011a9f15bfac9379c882fe0b7ecb2288153ce4f2def4f272214fb80f8e2630f04c00000001fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e4003c0843d0008cd02dc5b9d9d2081889ef00e6452fb5ad1730df42444ceccb9ea02258256d2fbd262e4f25601006400c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304e4f2560000809bee020008cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aae4f25601006400cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aa0000"
    );
    expect(ergoSignRequestDecoded.getDerivationPaths()[0]).toEqual(
      "44'/429'/0'/0/6"
    );
    expect(ergoSignRequestDecoded.getBoxes()[0].getErgoTree()).toEqual(
      boxes[0].getErgoTree()
    );
  });

  it("should construct an ergo-sign-request object from string", () => {
    const signData = Buffer.from(
      "9402011a9f15bfac9379c882fe0b7ecb2288153ce4f2def4f272214fb80f8e2630f04c00000001fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e4003c0843d0008cd02dc5b9d9d2081889ef00e6452fb5ad1730df42444ceccb9ea02258256d2fbd262e4f25601006400c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304e4f2560000809bee020008cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aae4f25601006400cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aa0000",
      "hex"
    );
    const requestId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const boxes = [
      new ErgoUnspentBox({
        boxId:
          "1a9f15bfac9379c882fe0b7ecb2288153ce4f2def4f272214fb80f8e2630f04c",
        value: "8000000",
        ergoTree:
          "0008cd0388fa54338147371023aacb846c96c57e72cdcd73bc85d20250467e5b79dfa2aa",
        assets: [
          new ErgoAsset(
            "fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e40",
            "200"
          ),
        ],
      }),
    ];

    const derivationPaths = ["m/44'/429'/0'/0/6"];

    const request = ErgoSignRequest.constructErgoSignRequest(
      requestId,
      signData,
      derivationPaths,
      boxes,
      "ergo-wallet"
    );

    const ur = request.toUREncoder(1000).nextPart();
    expect(ur).toBe(
      "ur:ergo-sign-request/oladgdndcawmgtfrkigrpmndutdnbtkgfssbjnaohkadftmwaoadcynebzrspsmukksplfzebdkbsbcplobzfnvewzuewkwzjpclgwrobsmndsdywtgsaeaeaeadzordpsjkemtigysebssrtnbnsblngwgteytyaedigockcefmottoenctesrhckfzaxrtlrfsaeaysnaouohpntntcxlylonnwtbaiegmzohtttjkbtwkdkfytosfrhwdaodalfhftdzotdidvewzhfadaeieaertlrfsbeahaaaeaaaebaenbeaoaanbbdaysnaokkrniykbytuorkpsgonbidmdtoltbdataondztuydptodetahkwzlyhpcmyachmkwdaottmootnylkstosadjkaejkadbeadaoaaaottmtlsaxadmuotlkstpronjkaeaeadmusapronjkadaejyjkaojkaxlsadaysnwypsmupaonjkaavewzhfaeaelandwyaoaeaysnaxlozsgheolyflembecnpksblrjzmtskkbjpsnsnjkrflptdaogdfgkbhpkkuroepkvewzhfadaeieaesnaxlozsgheolyflembecnpksblrjzmtskkbjpsnsnjkrflptdaogdfgkbhpkkuroepkaeaeaxadaalytaaddyoyadlecsdwykcfadpmykaeykaewkamwkahlytacxteoxadksfzehhsesiyehecidiyhsiaeseoemesiaeteteyiyihdyidemihiaideyeyeteteheceoiaiheeiyeyieihiyeeiyeyemeyeyeheeiyidetdyiyetiheyeneodyiydyeeiaaoioetdydydydydydyaxksfddydydyetiaiedyeoetetiyhseceeeoeoeteheeemeoemehdyeyeohshsiaideteeeniaeseniaecemihemeyiaieiaieemeoidiaetecieeydyeyecdyeeenemihecidemesieiyhseyhshsaalytacxtyoeadksfziyididhshsiaemeoeoemiedyecehiaehdyiyiaeoiehsdyiaiaideteneeiyeeieeoeyieeedydyeyemececehihehiaeoihhseoiaiheoenehiyeoesidesehiheedyaoiaeydydyamjeihjpiojldpkthsjzjzihjychasfrlg"
    );
  });
});
