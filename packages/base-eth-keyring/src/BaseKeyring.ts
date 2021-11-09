import HDKey from 'hdkey';
import { toChecksumAddress, publicToAddress, BN, stripHexPrefix } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import { CryptoHDKey, DataType, EthSignRequest, extend, CryptoAccount } from '@keystonehq/bc-ur-registry-eth';
import * as uuid from 'uuid';
import { InteractionProvider } from './InteractionProvider';

const keyringType = 'QR Hardware Wallet Device';
const pathBase = 'm';
const MAX_INDEX = 1000;

export type StoredKeyring = {
    //common props;
    version: number;
    initialized: boolean;
    accounts: string[];
    currentAccount: number;
    page: number;
    perPage: number;
    name: string;
    keyringMode?: string;
    keyringAccount?: string;
    xfp: string;

    //hd props;
    xpub: string;
    hdPath: string;
    indexes: Record<string, number>;
    childrenPath: string;

    //pubkey props;
    paths: Record<string, string>;
};

export type PagedAccount = { address: string; balance: any; index: number };

const DEFAULT_CHILDREN_PATH = '0/*';

enum KEYRING_MODE {
    hd = 'hd',
    pubkey = 'pubkey',
}

enum KEYRING_ACCOUNT {
    standard = 'account.standard',
    ledger_live = 'account.ledger_live',
    ledger_legacy = 'account.ledger_legacy',
}

export class BaseKeyring {
    // @ts-ignore
    private version = 1;
    getInteraction = (): InteractionProvider => {
        throw new Error(
            '#ktek_error, method getInteraction not implemented, please extend BaseKeyring by overwriting this method.',
        );
    };
    static type = keyringType;
    protected xfp: string;
    protected type = keyringType;
    protected keyringMode: KEYRING_MODE;
    protected initialized: boolean;
    protected xpub: string;
    protected hdPath: string;
    protected childrenPath: string;
    protected accounts: string[];
    protected currentAccount: number;
    protected page: number;
    protected perPage: number;
    protected indexes: Record<string, number>;
    protected hdk: HDKey;
    protected name: string;
    protected paths: Record<string, string>;
    protected keyringAccount: KEYRING_ACCOUNT;

    private unlockedAccount: number;

    constructor(opts?: StoredKeyring) {
        //common props
        this.page = 0;
        this.perPage = 5;
        this.accounts = [];
        this.currentAccount = 0;
        this.unlockedAccount = 0;
        this.name = 'QR Hardware';
        this.keyringMode = KEYRING_MODE.hd;
        this.keyringAccount = KEYRING_ACCOUNT.standard;
        this.initialized = false;

        //hd props;
        this.xfp = '';
        this.xpub = '';
        this.hdPath = '';
        this.childrenPath = DEFAULT_CHILDREN_PATH;
        this.indexes = {};

        //pubkey props;
        this.paths = {};

        this.deserialize(opts);
    }

    protected requestSignature = async (
        _requestId: string,
        signRequest: EthSignRequest,
        requestTitle?: string,
        requestDescription?: string,
    ): Promise<{ r: Buffer; s: Buffer; v: Buffer }> => {
        const ethSignature = await this.getInteraction().requestSignature(
            signRequest,
            requestTitle,
            requestDescription,
        );
        const requestIdBuffer = ethSignature.getRequestId();
        const signature = ethSignature.getSignature();
        if (requestIdBuffer) {
            const requestId = uuid.stringify(requestIdBuffer);
            if (requestId !== _requestId) {
                throw new Error('read signature error: mismatched requestId');
            }
        }
        const r = signature.slice(0, 32);
        const s = signature.slice(32, 64);
        const v = signature.slice(64);
        return {
            r,
            s,
            v,
        };
    };

    private __readCryptoHDKey = (cryptoHDKey: CryptoHDKey) => {
        const hdPath = `m/${cryptoHDKey.getOrigin().getPath()}`;
        const xfp = cryptoHDKey.getOrigin().getSourceFingerprint()?.toString('hex');
        const childrenPath = cryptoHDKey.getChildren()?.getPath() || DEFAULT_CHILDREN_PATH;
        const name = cryptoHDKey.getName();
        if (cryptoHDKey.getNote() === KEYRING_ACCOUNT.standard) {
            this.keyringAccount = KEYRING_ACCOUNT.standard;
        } else if (cryptoHDKey.getNote() === KEYRING_ACCOUNT.ledger_legacy) {
            this.keyringAccount = KEYRING_ACCOUNT.ledger_legacy;
        }
        if (!xfp) {
            throw new Error('invalid crypto-hdkey, cannot get source fingerprint');
        }
        const xpub = cryptoHDKey.getBip32Key();
        this.xfp = xfp;
        this.xpub = xpub;
        this.hdPath = hdPath;
        this.childrenPath = childrenPath;
        if (name !== undefined && name !== '') {
            this.name = name;
        }
        this.initialized = true;
    };

    private __readCryptoAccount = (cryptoAccount: CryptoAccount): boolean => {
        const xfp = cryptoAccount.getMasterFingerprint()?.toString('hex');
        if (!xfp) {
            throw new Error('invalid crypto-account, cannot get master fingerprint');
        }
        this.xfp = xfp;
        this.initialized = true;
        let changed = false;
        cryptoAccount.getOutputDescriptors()?.forEach((od) => {
            try {
                const cryptoHDKey = od.getHDKey();
                if (cryptoHDKey) {
                    const key = cryptoHDKey.getKey();
                    const path = `M/${cryptoHDKey.getOrigin().getPath()}`;
                    const address = '0x' + publicToAddress(key, true).toString('hex');
                    this.name = cryptoHDKey.getName();
                    if (cryptoHDKey.getNote() === KEYRING_ACCOUNT.ledger_live) {
                        this.keyringAccount = KEYRING_ACCOUNT.ledger_live;
                    }
                    if (this.paths[toChecksumAddress(address)] === undefined) {
                        changed = true;
                    }
                    this.paths[toChecksumAddress(address)] = path;
                }
            } catch (e) {
                throw new Error(`KeystoneError#invalid_data, ${e}`);
            }
        });
        return changed;
    };

    //initial read
    async readKeyring(): Promise<void> {
        const result = await this.getInteraction().readCryptoHDKeyOrCryptoAccount();
        if (result.getRegistryType() === extend.RegistryTypes.CRYPTO_HDKEY) {
            this.keyringMode = KEYRING_MODE.hd;
            this.__readCryptoHDKey(result as CryptoHDKey);
        } else {
            this.keyringMode = KEYRING_MODE.pubkey;
            this.__readCryptoAccount(result as CryptoAccount);
        }
    }

    // private __readLedgerLiveAccounts = async () => {
    //     const result = await this.getInteraction().readCryptoHDKeyOrCryptoAccount();
    //     if (result.getRegistryType() === extend.RegistryTypes.CRYPTO_ACCOUNT) {
    //         const changed = this.__readCryptoAccount(result as CryptoAccount);
    //         if (!changed) {
    //             throw new Error(`#KeystoneError#ledger_live.no_new_account`);
    //         }
    //     } else {
    //         throw new Error(`KeystoneError#ledger_live.unexpected_urtype`);
    //     }
    // };

    public getName = (): string => {
        return this.name;
    };

    protected checkKeyring() {
        if (!this.xfp || !this.xpub || !this.hdPath) {
            throw new Error('keyring not fulfilled, please call function `readKeyring` firstly');
        }
    }

    serialize(): Promise<StoredKeyring> {
        return Promise.resolve({
            //common
            initialized: this.initialized,
            accounts: this.accounts,
            currentAccount: this.currentAccount,
            page: this.page,
            perPage: this.perPage,
            keyringAccount: this.keyringAccount,
            keyringMode: this.keyringMode,
            name: this.name,
            version: this.version,
            xfp: this.xfp,

            //hd
            xpub: this.xpub,
            hdPath: this.hdPath,
            childrenPath: this.childrenPath,
            indexes: this.indexes,

            //pubkey
            paths: this.paths,
        });
    }

    deserialize(opts?: StoredKeyring): void {
        if (opts) {
            //common props;
            this.accounts = opts.accounts;
            this.currentAccount = opts.currentAccount;
            this.page = opts.page;
            this.perPage = opts.perPage;
            this.name = opts.name;
            this.initialized = opts.initialized;
            this.keyringMode = (opts.keyringMode as KEYRING_MODE) || KEYRING_MODE.hd;
            this.keyringAccount = (opts.keyringAccount as KEYRING_ACCOUNT) || KEYRING_ACCOUNT.standard;
            this.xfp = opts.xfp;

            //hd props;
            this.xpub = opts.xpub;
            this.hdPath = opts.hdPath;
            this.indexes = opts.indexes;

            this.paths = opts.paths;

            this.childrenPath = opts.childrenPath || DEFAULT_CHILDREN_PATH;
        }
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

    setAccountToUnlock = (index) => {
        this.unlockedAccount = parseInt(index, 10);
    };

    addAccounts(n = 1): Promise<string[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const from = this.unlockedAccount;
                const to = from + n;
                const newAccounts = [];

                for (let i = from; i < to; i++) {
                    const address = await this.__addressFromIndex(pathBase, i);
                    newAccounts.push(address);
                    this.page = 0;
                    this.unlockedAccount++;
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

    private __getNormalPage = (increment: number): Promise<PagedAccount[]> => {
        this.page += increment;
        if (this.page <= 0) {
            this.page = 1;
        }
        return new Promise(async (resolve, reject) => {
            try {
                const from = (this.page - 1) * this.perPage;
                const to = from + this.perPage;

                const accounts = [];

                for (let i = from; i < to; i++) {
                    const address = await this.__addressFromIndex(pathBase, i);
                    accounts.push({
                        address,
                        balance: null,
                        index: i,
                    });
                    this.indexes[toChecksumAddress(address)] = i;
                }
                resolve(accounts);
            } catch (e) {
                reject(e);
            }
        });
    };

    private __getLedgerLivePage = (increment: number): Promise<PagedAccount[]> => {
        const nextPage = this.page + increment;
        return new Promise(async (resolve, reject) => {
            try {
                const from = (nextPage - 1) * this.perPage;
                const to = from + this.perPage;

                const accounts = [];

                for (let i = from; i < to; i++) {
                    const address = await this.__addressFromIndex(pathBase, i);
                    accounts.push({
                        address,
                        balance: null,
                        index: i,
                    });
                }

                this.page += increment;
                resolve(accounts);
            } catch (e) {
                reject(e);
            }
        });
    };

    async __getPage(increment: number): Promise<PagedAccount[]> {
        if (!this.initialized) {
            await this.readKeyring();
        }
        if (this.keyringMode === KEYRING_MODE.hd) {
            return this.__getNormalPage(increment);
        } else {
            return this.__getLedgerLivePage(increment);
        }
    }

    getAccounts() {
        return Promise.resolve(this.accounts);
    }

    removeAccount(address: string): void {
        if (!this.accounts.map((a) => a.toLowerCase()).includes(address.toLowerCase())) {
            throw new Error(`Address ${address} not found in this keyring`);
        }
        this.accounts = this.accounts.filter((a) => a.toLowerCase() !== address.toLowerCase());
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
        const hdPath = await this._pathFromAddress(address);
        const chainId = tx.common.chainId();
        const requestId = uuid.v4();
        const ethSignRequest = EthSignRequest.constructETHRequest(
            BaseKeyring.serializeTx(tx),
            DataType.transaction,
            hdPath,
            this.xfp,
            requestId,
            chainId,
        );

        const { r, s, v } = await this.requestSignature(
            requestId,
            ethSignRequest,
            'Scan with your Keystone',
            'After your Keystone has signed the transaction, click on "Scan Keystone" to receive the signature',
        );
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
        const usignedHex = stripHexPrefix(messageHex);
        const hdPath = await this._pathFromAddress(withAccount);
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
        const { r, s, v } = await this.requestSignature(
            requestId,
            ethSignRequest,
            'Scan with your Keystone',
            'After your Keystone has signed this message, click on "Scan Keystone" to receive the signature',
        );
        return '0x' + Buffer.concat([r, s, v]).toString('hex');
    }

    async signTypedData(withAccount: string, typedData: any): Promise<string> {
        const hdPath = await this._pathFromAddress(withAccount);
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
        const { r, s, v } = await this.requestSignature(
            requestId,
            ethSignRequest,
            'Scan with your Keystone',
            'After your Keystone has signed this data, click on "Scan Keystone" to receive the signature',
        );
        return '0x' + Buffer.concat([r, s, v]).toString('hex');
    }

    __addressFromIndex = async (pb: string, i: number): Promise<string> => {
        if (this.keyringMode === KEYRING_MODE.hd) {
            this.checkKeyring();
            if (!this.hdk) {
                // @ts-ignore
                this.hdk = HDKey.fromExtendedKey(this.xpub);
            }
            const childrenPath = this.childrenPath.replace('*', String(i)).replaceAll('*', '0');
            const dkey = this.hdk.derive(`${pb}/${childrenPath}`);
            const address = '0x' + publicToAddress(dkey.publicKey, true).toString('hex');
            return toChecksumAddress(address);
        } else {
            const result = Object.entries(this.paths).find((entry) => {
                // @ts-ignore
                const [_, path] = entry;
                return path.split('/')[3].replace("'", '').toString() === i.toString();
            });
            if (result) {
                // @ts-ignore
                const [address, _] = result;
                return toChecksumAddress(address);
            } else {
                //should not be here, just fallback
                throw new Error(`KeystoneError#ledger_live.no_expected_account`);
            }
        }
    };

    async _pathFromAddress(address: string): Promise<string> {
        if (this.keyringMode === KEYRING_MODE.hd) {
            const checksummedAddress = toChecksumAddress(address);
            let index = this.indexes[checksummedAddress];
            if (typeof index === 'undefined') {
                for (let i = 0; i < MAX_INDEX; i++) {
                    if (checksummedAddress === (await this.__addressFromIndex(pathBase, i))) {
                        index = i;
                        break;
                    }
                }
            }

            if (typeof index === 'undefined') {
                throw new Error('Unknown address');
            }
            return `${this.hdPath}/0/${index}`;
        } else {
            const checksummedAddress = toChecksumAddress(address);
            const path = this.paths[checksummedAddress];
            if (typeof path === 'undefined') {
                throw new Error('Unknown address');
            }
            return path;
        }
    }
}
