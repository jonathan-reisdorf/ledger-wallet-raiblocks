const assert = require("chai").assert;
const bitcoinSecp256k1 = require("bitcoinjs-lib");
const bip39 = require("bip39");
const wif = require("wif")
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = require("base-x")(BASE58);

const fixtures = require('./testData.json')

const path = fixtures.path;
const mnemonic = fixtures.mnemonic;
const expectedSeed = fixtures.expectedSeed;
const expectedRootKey = "xprv9s21ZrQH143K2VwqRtd5JzUCFE8DydwgpB3tdALwST7jhz3ghx7TLL7LJh4mYfrz1ZizS7bTkPh3gwmu1ZG362GzsTX97TS1oKzA4hLD155";

const expectedPrivateKey = "5eaad5da87a9279f4cc11deed13b6befcd76f840922fa9668b2f3a71fcd778cd";

const expectedWIF = "KzPjQ11RSrDHHCPpqpwB6Q2Zn1vxqixtWCQeyXaVYWUi969JtTnh";

describe("bitcoinSecp256k1", function () {
  it("mnemonic", function () {
    const actualSeed = bip39.mnemonicToSeed(mnemonic);
    assert.equal(actualSeed.toString("hex"), expectedSeed, "seed must match expected");

    const rootNode = bitcoinSecp256k1.HDNode.fromSeedBuffer(actualSeed, bitcoinSecp256k1.bitcoin);
    assert.equal(rootNode.toBase58(), expectedRootKey, "RootKey must match expected");

    const actualPathNode = rootNode.derivePath(path);
    const actualPathNodeChild0 = actualPathNode.derive(0);
    const actualPrivateKey = actualPathNodeChild0.keyPair.d.toBuffer(32).toString("hex");
    assert.equal(actualPrivateKey, expectedPrivateKey, "private key must match expected");

    const actualWIF = actualPathNodeChild0.keyPair.toWIF();
    assert.equal(actualWIF, expectedWIF, "WIF must match expected");
  });
});

const expectedSlip100RootKey = "e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35";
const expectedSlip100M_PrivateKey = "edb2e14f9ee77d26dd93b4ecede8d16ed408ce149b6cd80b0715a2d911a0afea";
// const expectedSlip100WIF = "";

describe("slip-0010-secp256k1", function () {
  it("mnemonic", function () {
    const actualSeed = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");

    const rootNode = bitcoinSecp256k1.HDNode.fromSeedBuffer(actualSeed, bitcoinSecp256k1.bitcoin);
    assert.equal(rootNode.keyPair.d.toBuffer(32).toString("hex"), expectedSlip100RootKey, "RootKey must match expected");

    const actualPathNode = rootNode.deriveHardened(0);
    assert.equal(actualPathNode.keyPair.d.toBuffer(32).toString("hex"), expectedSlip100M_PrivateKey, "M_PrivateKey must match expected");
  });
});