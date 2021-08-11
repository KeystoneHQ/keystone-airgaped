import { EventEmitter } from 'events';
import HDKey from 'hdkey';
import sdk, { SupportedResult } from '@keystonehq/sdk';
import { toChecksumAddress, publicToAddress, BN, stripHexPrefix } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import { CryptoHDKey, DataType, ETHSignature, EthSignRequest } from '@keystonehq/bc-ur-registry-eth';
import * as uuid from 'uuid';
import { PlayStatus, ReadStatus } from '@keystonehq/sdk';

const keyringType = 'Air Gaped Device';
const pathBase = 'm';
const MAX_INDEX = 1000;

type StoredKeyring = {
    xfp: string;
    xpub: string;
    hdPath: string;
    accounts: string[];
    currentAccount: number;
    page: number;
    perPage: number;
    paths: Record<string, number>;
};

type PagedAccount = { address: string; balance: any; index: number };

sdk.bootstrap();
const keystoneSDK = sdk.getSdk();

const readKeyringCryptoHDKey = async (): Promise<{ xfp: string; xpub: string; hdPath: string }> => {
    const decodedResult = await keystoneSDK.read([SupportedResult.UR_CRYPTO_HDKEY], {
        title: 'Sync Keystone',
        description: 'Please scan the QR code displayed on your Keystone',
        renderInitial: {
            walletMode: 'Web3',
            link: 'https://keyst.one/defi',
        },
        URTypeErrorMessage:
            'The scanned QR code is not the sync code from the Keystone hardware wallet. Please verify the code and try again ( Keystone firmware V1.3.0 or newer required).',
    });
    if (decodedResult.status === ReadStatus.success) {
        const { result } = decodedResult;
        const cryptoHDKey = CryptoHDKey.fromCBOR(result.cbor);
        const hdPath = `m/${cryptoHDKey.getOrigin().getPath()}`;
        const xfp = cryptoHDKey.getOrigin().getSourceFingerprint()?.toString('hex');
        if (!xfp) {
            throw new Error('invalid crypto-hd-key, cannot get source fingerprint');
        }
        const xpub = cryptoHDKey.getBip32Key();
        return {
            xfp,
            xpub,
            hdPath,
        };
    } else {
        throw new Error('Reading canceled');
    }
};

class AirGapedKeyring extends EventEmitter {
    static type = keyringType;
    static async getKeyring(): Promise<AirGapedKeyring> {
        const { xfp, xpub, hdPath } = await readKeyringCryptoHDKey();
        return new AirGapedKeyring({
            xfp,
            xpub,
            hdPath,
            perPage: 5,
            page: 0,
            accounts: [],
            currentAccount: 0,
            paths: {},
        });
    }

    static getEmptyKeyring(): AirGapedKeyring {
        return new AirGapedKeyring({
            xfp: '',
            xpub: '',
            hdPath: '',
            perPage: 5,
            page: 0,
            accounts: [],
            currentAccount: 0,
            paths: {},
        });
    }

    private xfp: string;
    private xpub: string;
    private hdPath: string;
    private accounts: string[];
    private currentAccount: number;
    private page: number;
    private perPage: number;
    private paths: Record<string, number>;
    private hdk: HDKey;
    private latestAccount: number;

    constructor(opts: StoredKeyring) {
        super();
        this.xfp = '';
        this.xpub = '';
        this.hdPath = '';
        this.page = 0;
        this.perPage = 5;
        this.accounts = [];
        this.currentAccount = 0;
        this.paths = {};
        this.latestAccount = 0;
        this.deserialize(opts);
    }

    async readKeyring(): Promise<void> {
        const { xpub, xfp, hdPath } = await readKeyringCryptoHDKey();
        this.xfp = xfp;
        this.xpub = xpub;
        this.hdPath = hdPath;
    }

    private checkKeyring() {
        if (!this.xfp || !this.xpub || !this.hdPath) {
            throw new Error('keyring not fulfilled, please call function `readKeyring` firstly');
        }
    }

    serialize(): Promise<StoredKeyring> {
        return Promise.resolve({
            xfp: this.xfp,
            xpub: this.xpub,
            hdPath: this.hdPath,
            accounts: this.accounts,
            currentAccount: this.currentAccount,
            page: this.page,
            perPage: this.perPage,
            paths: this.paths,
        });
    }

    deserialize(opts: StoredKeyring): void {
        this.xfp = opts.xfp;
        this.xpub = opts.xpub;
        this.hdPath = opts.hdPath;
        this.accounts = opts.accounts;
        this.currentAccount = opts.currentAccount;
        this.page = opts.page;
        this.perPage = opts.perPage;
        this.paths = opts.paths;
    }

    setCurrentAccount(index: number): void {
        this.currentAccount = index;
    }

    getCurrentAccount(): number {
        return this.currentAccount;
    }

    getCurrentAddress(): string {
        return this.accounts[this.currentAccount];
    }

    addAccounts(n = 1): Promise<string[]> {
        return new Promise((resolve, reject) => {
            try {
                const from = this.latestAccount;
                const to = from + n;
                const newAccounts = [];

                for (let i = from; i < to; i++) {
                    const address = this._addressFromIndex(pathBase, i);
                    newAccounts.push(address);
                    this.page = 0;
                    this.latestAccount++;
                }
                this.accounts = this.accounts.concat(newAccounts);
                resolve(this.accounts);
            } catch (e) {
                reject(e);
            }
        });
    }

    getFirstPage(): Promise<PagedAccount[]> {
        this.page = 0;
        return this.__getPage(1);
    }

    getNextPage(): Promise<PagedAccount[]> {
        return this.__getPage(1);
    }

    getPreviousPage(): Promise<PagedAccount[]> {
        return this.__getPage(-1);
    }

    __getPage(increment: number): Promise<PagedAccount[]> {
        this.page += increment;

        if (this.page <= 0) {
            this.page = 1;
        }

        return new Promise((resolve, reject) => {
            try {
                const from = (this.page - 1) * this.perPage;
                const to = from + this.perPage;

                const accounts = [];

                for (let i = from; i < to; i++) {
                    const address = this._addressFromIndex(pathBase, i);
                    accounts.push({
                        address,
                        balance: null,
                        index: i,
                    });
                    this.paths[toChecksumAddress(address)] = i;
                }
                resolve(accounts);
            } catch (e) {
                reject(e);
            }
        });
    }

    getAccounts(): string[] {
        return this.accounts;
    }

    removeAccount(address: string): void {
        if (!this.accounts.map((a) => a.toLowerCase()).includes(address.toLowerCase())) {
            throw new Error(`Address ${address} not found in this keyring`);
        }
        this.accounts = this.accounts.filter((a) => a.toLowerCase() !== address.toLowerCase());
    }

    async readSignature(sendRequestID: string): Promise<{ r: Buffer; s: Buffer; v: Buffer }> {
        const result = await keystoneSDK.read([SupportedResult.UR_ETH_SIGNATURE], {
            title: 'Scan Keystone',
            description: 'Please scan the QR code displayed on your Keystone',
        });
        if (result.status === ReadStatus.canceled) {
            throw new Error('#ktek_error[read-cancel]: read signature canceled');
        } else {
            const ethSignature = ETHSignature.fromCBOR(result.result.cbor);
            const requestIdBuffer = ethSignature.getRequestId();
            const signature = ethSignature.getSignature();
            if (requestIdBuffer) {
                const requestId = uuid.stringify(requestIdBuffer);
                if (requestId !== sendRequestID) {
                    throw new Error('read signature error: mismatched requestId');
                }
            }
            const r = signature.slice(0, 32);
            const s = signature.slice(32, 64);
            const v = signature.slice(64, 65);
            return {
                r,
                s,
                v,
            };
        }
    }
    // tx is an instance of the ethereumjs-transaction class.

    private static serializeTx(tx: Transaction): Buffer {
        // need use EIP-155
        // @ts-ignore
        tx.v = new BN(tx.common.chainId());
        // @ts-ignore
        tx.r = new BN(0);
        // @ts-ignore
        tx.s = new BN(0);
        return tx.serialize();
    }

    async signTransaction(address: string, tx: Transaction): Promise<Transaction> {
        const hdPath = this._pathFromAddress(address);
        const chainId = tx.common.chainId();
        const requestId = uuid.v4();
        const ethSignRequest = EthSignRequest.constructETHRequest(
            AirGapedKeyring.serializeTx(tx),
            DataType.transaction,
            hdPath,
            this.xfp,
            requestId,
            chainId,
        );

        const status = await keystoneSDK.play(ethSignRequest.toUR(), {
            hasNext: true,
            title: 'Scan with your Keystone',
            description:
                'After your Keystone has signed the transaction, click on "Scan Keystone" to receive the signature',
        });

        if (status === PlayStatus.canceled) throw new Error('#ktek_error[play-cancel]: play canceled');

        const { r, s, v } = await this.readSignature(requestId);
        const txJson = tx.toJSON();
        return Transaction.fromTxData(
            {
                to: txJson['to'],
                gasLimit: txJson['gasLimit'],
                gasPrice: txJson['gasPrice'],
                data: txJson['data'],
                nonce: txJson['nonce'],
                value: txJson['value'],
                r,
                s,
                v,
            },
            { common: tx.common },
        );
    }

    signMessage(withAccount: string, data: string): Promise<string> {
        return this.signPersonalMessage(withAccount, data);
    }

    async signPersonalMessage(withAccount: string, messageHex: string): Promise<string> {
        let usignedHex = stripHexPrefix(messageHex);
        const hdPath = this._pathFromAddress(withAccount);
        const requestId = uuid.v4();
        const ethSignRequest = EthSignRequest.constructETHRequest(
            Buffer.from(usignedHex, 'hex'),
            DataType.personalMessage,
            hdPath,
            this.xfp,
            requestId,
            undefined,
            withAccount,
        );
        const status = await keystoneSDK.play(ethSignRequest.toUR(), {
            hasNext: true,
            title: 'Scan with your Keystone',
            description:
                'After your Keystone has signed this message, click on "Scan Keystone" to receive the signature',
        });
        if (status === PlayStatus.canceled) throw new Error('#ktek_error[play-cancel]: play canceled');
        const { r, s, v } = await this.readSignature(requestId);
        return '0x' + Buffer.concat([r, s, v]).toString('hex');
    }

    async signTypedData(withAccount: string, typedData: any): Promise<string> {
        const hdPath = this._pathFromAddress(withAccount);
        const requestId = uuid.v4();
        const ethSignRequest = EthSignRequest.constructETHRequest(
            Buffer.from(JSON.stringify(typedData), 'utf-8'),
            DataType.typedData,
            hdPath,
            this.xfp,
            requestId,
            undefined,
            withAccount,
        );
        const status = await keystoneSDK.play(ethSignRequest.toUR(), {
            hasNext: true,
            title: 'Scan with your Keystone',
            description: 'After your Keystone has signed this data, click on "Scan Keystone" to receive the signature',
        });
        if (status === PlayStatus.canceled) throw new Error('#ktek_error[play-cancel]: play canceled');
        const { r, s, v } = await this.readSignature(requestId);
        return '0x' + Buffer.concat([r, s, v]).toString('hex');
    }

    _addressFromIndex(pb: string, i: number): string {
        this.checkKeyring();
        if (!this.hdk) {
            // @ts-ignore
            this.hdk = HDKey.fromExtendedKey(this.xpub);
        }
        const dkey = this.hdk.derive(`${pb}/0/${i}`);
        const address = '0x' + publicToAddress(dkey.publicKey, true).toString('hex');
        return toChecksumAddress(address);
    }

    _pathFromAddress(address: string): string {
        const checksummedAddress = toChecksumAddress(address);
        let index = this.paths[checksummedAddress];
        if (typeof index === 'undefined') {
            for (let i = 0; i < MAX_INDEX; i++) {
                if (checksummedAddress === this._addressFromIndex(pathBase, i)) {
                    index = i;
                    break;
                }
            }
        }

        if (typeof index === 'undefined') {
            throw new Error('Unknown address');
        }
        return `${this.hdPath}/0/${index}`;
    }
}

export default AirGapedKeyring;
