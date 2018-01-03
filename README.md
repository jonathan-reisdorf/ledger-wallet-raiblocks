# ledger-wallet-raiblocks

To use:
```
npm install;
npm start;
```

### helpful has tools:
Hash of a hex message:
echo -n "<hex>" | shasum -a 256

Hash of the binary code inside a hex message:
perl -e 'print pack("H*","<hex>")' | shasum -a 256
