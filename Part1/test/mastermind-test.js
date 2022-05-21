const hre = require('hardhat');
const { ethers, waffle } = hre
const { groth16 } = require("snarkjs");
const { expect } = require("chai");
const HASH = "18311343803305413584032950907343924921402256932959498859603879453231417631685";

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

//[assignment] write your own unit test to show that your Mastermind variation circuit is working as expected
describe('MastermindVariation', function () {
    let verifier;
    beforeEach(async function () {
           const Verifier =await ethers.getContractFactory('Verifier');
           verifier = await Verifier.deploy();
           await verifier.deployed();
     });

     it('should guess less than 6', async function () {
        const input = {
            "guess": [0, 6, 2, 3],
            "solutions": [0, 1, 2, 3],
            "hitBlow": [0,0,0,0],
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);

     });

     it('should solutions less than 6', async function () {
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [0, 1, 2, 6],
            "hitBlow": [0,0,0,0],
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });


     it('should guess colors be different', async function () {
        const input = {
            "guess": [1, 1, 2, 3],
            "solutions": [0, 1, 2, 3],
            "hitBlow": [0,0,0,0],
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });


     it('should solutions colors be different', async function () {
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [0, 1, 2, 2],
            "hitBlow": [0,0,0,0],
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });


     it('should hit and blow <3', async function () {
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [0, 1, 2, 3],
            "hitBlow": [1,2,0,3],
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });

     it('should not verify the solution on blows fails', async function () {
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [3, 2, 1, 0],
            "hitBlow": [1, 0, 1, 0],
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });

     it('should not verify the solution on hits fails', async function () {
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [3, 1, 2, 0],
            "hitBlow": [1, 1, 2, 1],
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });
     
     it('should verify the solution on blows', async function () {
        const hash = '1777277235915767316413086087329044818051298499936897961862053055117000839929';
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [3, 2, 1, 0],
            "hitBlow": [1, 1, 1, 1],
            "salt":231,
            "solHash": hash
        }
        const { proof, publicSignals } = await groth16.fullProve(input, "contracts/circuits/MastermindVariation_js/MastermindVariation.wasm","contracts/circuits/circuit_final.zkey");

        // generate the calldata based on the proof and the public signals
        const { a, b, c, Input } = await generateCallData(publicSignals, proof);
        
        // verify the proof 
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;

     });

     it('should verify the solution on hits', async function () {
        const hash = '1777277235915767316413086087329044818051298499936897961862053055117000839929';
        const input = {
            "guess": [0, 2, 1, 3],
            "solutions": [3, 2, 1, 0],
            "hitBlow": [1, 2, 2, 1],
            "salt":231,
            "solHash": hash
        }
        const { proof, publicSignals } = await groth16.fullProve(input, "contracts/circuits/MastermindVariation_js/MastermindVariation.wasm","contracts/circuits/circuit_final.zkey");

        // generate the calldata based on the proof and the public signals
        const { a, b, c, Input } = await generateCallData(publicSignals, proof);
        // verify the proof 
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;

     });

     it('should verify the solution on win', async function () {
        const hash = '18311343803305413584032950907343924921402256932959498859603879453231417631685';
        const input = {
            "guess": [0, 2, 1, 3],
            "solutions": [0, 2, 1, 3],
            "hitBlow": [2, 2, 2, 2],
            "salt": 231,
            "solHash": hash
        }
        const { proof, publicSignals } = await groth16.fullProve(input, "contracts/circuits/MastermindVariation_js/MastermindVariation.wasm","contracts/circuits/circuit_final.zkey");

        // generate the calldata based on the proof and the public signals
        const { a, b, c, Input } = await generateCallData(publicSignals, proof);
        // verify the proof 
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;

     });

});

async function generateCallData(publicSignals, proof) {
    const editedPublicSignals = unstringifyBigInts(publicSignals);
    const editedProof = unstringifyBigInts(proof);
    const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
    // console.log("calldata:",calldata);
    // parse calldata to get the arguments
    const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    // console.log("args",argv);
    // get pairing for build the proof
    const a = [argv[0], argv[1]];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
    const c = [argv[6], argv[7]];
    // console.log("proof", a,b,c);
    // get signal output (2)
    const Input = argv.slice(8);
    return { a, b, c, Input };
}

async function assertionFailInProofGeneration(input) {
    try {
        await groth16.fullProve(input, "contracts/circuits/MastermindVariation_js/MastermindVariation.wasm", "contracts/circuits/circuit_final.zkey");
        fail();
    } catch (error) {
        expect(error.toString().includes("Assert Failed")).to.be.true;
    }
}
