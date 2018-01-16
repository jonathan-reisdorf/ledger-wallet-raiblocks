'use strict';
const bip39 = require( 'bip39' );
const bigi = require( 'bigi' );

const React = require( 'react' );
const ReactDOM = require( 'react-dom' );

const Row = require( 'react-bootstrap' ).Row;
const Col = require( 'react-bootstrap' ).Col;
const Grid = require( 'react-bootstrap' ).Grid;
const Table = require( 'react-bootstrap' ).Table;

const ec = require( 'elliptic' ).ec;
const CryptoJS = require( 'crypto-js' );

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const base58 = require( 'base-x' )( BASE58 );

const comm_node = require('ledgerco/src/ledger-comm-node');

process.stdout.write( 'STARTED comm_node \n' );
process.stdout.write( JSON.stringify(comm_node) + '\n' );
process.stdout.write( comm_node + '\n' );
process.stdout.write( Object.getOwnPropertyNames(comm_node) + '\n' );
process.stdout.write( 'SUCCESS comm_node \n' );

const net = 'TestNet';

const mnemonic = 'online ramp onion faculty trap clerk near rabbit busy gravity prize employ exit horse found slogan effort dash siren buzz sport pig coconut element';

const bip44_path =
    '8000002C'
    + '80000378'
    + '80000000'
    + '80000000'
    + '80000000';

let ledgerDeviceInfo;

let publicKeyInfo;

let publicKey;

let accounts;

let signature;

let signatureInfo;

let balance;

let balanceInfo;

let encodeTransactionResponse;

let signedTransaction;

let sentTransaction;

let sentTransactionInfo;

let bip44Path;

let getLedgerDeviceInfo = () => {
    process.stdout.write( 'getLedgerDeviceInfo \n' );

    comm_node.list_async().then( result => {
        if ( !result.length ) {
            process.stdout.write( 'getLedgerDeviceInfo "No device found"\n' );
            ledgerDeviceInfo = 'Failure : No device found';
            renderApp();
        } else {
            comm_node.create_async().then( comm => {
                let deviceInfo = comm.device.getDeviceInfo();
                comm.device.close();

                ledgerDeviceInfo = 'Success: ' + JSON.stringify( deviceInfo );
                renderApp();
                setAllLedgerInfoTimer();
            } )
                .catch( reason => {
                    comm.device.close();
                    ledgerDeviceInfo = 'An error occured: ' + JSON.stringify( reason );
                    renderApp();
                    setAllLedgerInfoTimer();
                } );
        }
    } );
};

let getPublicKeyInfo = () => {
    publicKey = undefined;
    publicKeyInfo = undefined;
    comm_node.create_async().then( comm => {
        let message = Buffer.from( '8004000000' + bip44_path, 'hex' );
        let validStatus = [0x9000];
        comm.exchange( message.toString( 'hex' ), validStatus ).then( response => {
            comm.device.close();

            // process.stdout.write( 'Public Key Response [' + response.length + '] ' + response + '\n' );

            let publicKey = response.substring( 0, 130 );

            process.stdout.write( `Public Key [${ publicKey.length }] ${ publicKey }\n` );

            publicKeyInfo = publicKey;

            renderApp();
            setAllLedgerInfoTimer();
        } ).catch( reason => {
            comm.device.close();
            process.stdout.write( `error reason ${ reason }\n` );
            publicKeyInfo = 'An error occured[1]: ' + reason;
            renderApp();
            setAllLedgerInfoTimer();
        } );
    } )
        .catch( reason => {
            comm.device.close();
            process.stdout.write( `error reason ${ reason }\n` );
            publicKeyInfo = 'An error occured[2]: ' + reason;
            renderApp();
            setAllLedgerInfoTimer();
        } );
};

let allLedgerInfoPollIx = 0;

let setAllLedgerInfoTimer = () => {
    setImmediate( getAllLedgerInfo );
};

let getAllLedgerInfo = () => {
    process.stdout.write( `getAllLedgerInfo ${ allLedgerInfoPollIx }\n` );
    let resetPollIndex = false;
    switch ( allLedgerInfoPollIx ) {
        case 0:
            getLedgerDeviceInfo();
            break;
        case 1:
            getPublicKeyInfo();
            break;
        default:
            allLedgerInfoPollIx = 0;
            resetPollIndex = true;
    }
    if ( resetPollIndex ) {
        // periodically check for a new device, disabled for now to not spam the logs.
        // setTimeout( getAllLedgerInfo, 10000 );
    } else {
        allLedgerInfoPollIx++;
    }
};

setAllLedgerInfoTimer();

let App = React.createClass( {

    getInitialState: () => {
        return {};
    },

    render: () => {
        return (
            <Grid>
                <h3>Ledger NodeJS</h3>
                <Row>
                    <Col>
                        Public Key
                        <p style={{ wordBreak: 'break-all' }}><code>{publicKeyInfo}</code></p>
                        <p>Destination Address <input type="text" size="40" id="toAddress" placeholder="Destination Address" /></p>
                        <p>Amount <input type="number" step="0.000001" min="1" id="amount" size="30" /></p>
                        <p>
                            <button onClick={( e ) => encodeTransaction()}>Encode</button>
                        </p>
                        <p>Encoded Transaction, before signing</p>
                        <p style={{ wordBreak: 'break-all' }}>
                            {encodeTransactionResponse}
                        </p>
                        <p>
                            <button onClick={( e ) => createSignature()}>Create Signature</button>
                        </p>
                        Signature
                            <p style={{ wordBreak: 'break-all' }}><code>{signatureInfo}</code></p>
                        <p>
                            <button onClick={( e ) => signTransaction()}>Sign Transaction</button>
                        </p>
                        Signed Transaction
                            <p style={{ wordBreak: 'break-all' }}><code>{signedTransaction}</code></p>
                        <p>
                            <button onClick={( e ) => sendTransaction()}>Send Transaction</button>
                        </p>
                        Sent Transaction
                        <p style={{ wordBreak: 'break-all' }}><code>{sentTransactionInfo}</code></p>
                    </Col>
                </Row>
            </Grid>
        );
    }
} );

let createSignature = () => {
    let textToSign = encodeTransactionResponse + bip44_path;

    signature = undefined;
    signatureInfo = `Ledger Signing Text of Length [${ textToSign.length }], Please Confirm Using the Device's Buttons. ${ textToSign }`;
    renderApp();

    process.stdout.write( signatureInfo + '\n' );

    let validStatus = [0x9000];

    let messages = [];

    let bufferSize = 255 * 2;
    let offset = 0;
    while ( offset < textToSign.length ) {
        let chunk;
        let p1;
        if ( ( textToSign.length - offset ) > bufferSize ) {
            chunk = textToSign.substring( offset, offset + bufferSize );
        } else {
            chunk = textToSign.substring( offset );
        }
        if ( ( offset + chunk.length ) === textToSign.length ) {
            p1 = '80';
        } else {
            p1 = '00';
        }

        let chunkLength = chunk.length / 2;

        process.stdout.write( `Ledger Signature chunkLength ${ chunkLength }\n` );

        let chunkLengthHex = chunkLength.toString( 16 );
        while ( chunkLengthHex.length < 2 ) {
            chunkLengthHex = '0' + chunkLengthHex;
        }

        process.stdout.write( `Ledger Signature chunkLength hex ${ chunkLengthHex }\n` );

        messages.push( '8002' + p1 + '00' + chunkLengthHex + chunk );
        offset += chunk.length;
    }

    comm_node.create_async( 0, false ).then( comm => {
        for ( let ix = 0; ix < messages.length; ix++ ) {
            let message = messages[ix];
            process.stdout.write( `Ledger Message (${ ix }/${ messages.length }) ${ message }\n` );

            comm.exchange( message, validStatus ).then( response => {
                process.stdout.write( `Ledger Signature Response ${ response }\n` );
                if ( response !== '9000' ) {
                    comm.device.close();

                    /**
                     * https://stackoverflow.com/questions/25829939/specification-defining-ecdsa-signature-data
                     * <br>
                     * the signature is TLV encoded.
                     * the first byte is 30, the 'signature' type<br>
                     * the second byte is the length (always 44)<br>
                     * the third byte is 02, the 'number: type<br>
                     * the fourth byte is the length of R (always 20)<br>
                     * the byte after the encoded number is 02, the 'number: type<br>
                     * the byte after is the length of S (always 20)<br>
                     * <p>
                     * eg:
                     * 304402200262675396fbcc768bf505c9dc05728fd98fd977810c547d1a10c7dd58d18802022069c9c4a38ee95b4f394e31a3dd6a63054f8265ff9fd2baf68a9c4c3aa8c5d47e9000
                     * is
                     * 30LL0220RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR0220SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
                     */

                    let rLenHex = response.substring( 6, 8 );
                    // process.stdout.write( 'Ledger Signature rLenHex ' + rLenHex + '\n' );
                    let rLen = parseInt( rLenHex, 16 ) * 2;
                    // process.stdout.write( 'Ledger Signature rLen ' + rLen + '\n' );
                    let rStart = 8;
                    // process.stdout.write( 'Ledger Signature rStart ' + rStart + '\n' );
                    let rEnd = rStart + rLen;
                    // process.stdout.write( 'Ledger Signature rEnd ' + rEnd + '\n' );

                    while ( ( response.substring( rStart, rStart + 2 ) === '00' ) && ( ( rEnd - rStart ) > 64 ) ) {
                        rStart += 2;
                    }

                    let r = response.substring( rStart, rEnd );
                    process.stdout.write( `Ledger Signature R [${ rStart },${ rEnd }]:${ rEnd - rStart } ${ r }\n` );
                    let sLenHex = response.substring( rEnd + 2, rEnd + 4 );
                    // process.stdout.write( 'Ledger Signature sLenHex ' + sLenHex + '\n' );
                    let sLen = parseInt( sLenHex, 16 ) * 2;
                    // process.stdout.write( 'Ledger Signature sLen ' + sLen + '\n' );
                    let sStart = rEnd + 4;
                    // process.stdout.write( 'Ledger Signature sStart ' + sStart + '\n' );
                    let sEnd = sStart + sLen;
                    // process.stdout.write( 'Ledger Signature sEnd ' + sEnd + '\n' );

                    while ( ( response.substring( sStart, sStart + 2 ) === '00' ) && ( ( sEnd - sStart ) > 64 ) ) {
                        sStart += 2;
                    }

                    let s = response.substring( sStart, sEnd );
                    process.stdout.write( `Ledger Signature S [${ sStart },${ sEnd }]:${ sEnd - sStart } ${ s }\n` );

                    let msgHashStart = sEnd + 4;
                    let msgHashEnd = msgHashStart + 64;
                    let msgHash = response.substring( msgHashStart, msgHashEnd );
                    process.stdout.write( `Ledger Signature msgHash [${ msgHashStart },${ msgHashEnd }] ${ msgHash }\n` );

                    signature = r + s;
                    signatureInfo = `Signature of Length [${ signature.length }] : ${ signature }`;
                    process.stdout.write( signatureInfo + '\n' );

                    process.stdout.write( `Check Signature of Length [${ checkSignature.length }] : ${ checkSignature }\n` );
                    renderApp();
                }
            } )
                .catch( reason => {
                    comm.device.close();
                    signatureInfo = 'An error occured[1]: ' + reason;
                    process.stdout.write( `Signature Reponse ${ signatureInfo }\n` );
                    renderApp();
                } );
        }
    } )
        .catch( reason => {
            comm.device.close();
            signatureInfo = 'An error occured[2]: ' + reason;
            process.stdout.write( `Signature Reponse ${ signatureInfo }\n` );
            renderApp();
        } );
};

let renderApp = () => ReactDOM.render( <App />, document.getElementById( 'example' ) );

renderApp();

