// [bonus] unit test for bonus.circom

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
describe('Bonus', function () {
    let verifier;
    beforeEach(async function () {
           const Verifier =await ethers.getContractFactory('VerifierBonus');
           verifier = await Verifier.deploy();
           await verifier.deployed();
     });

     it('should guess less than 10', async function () {
        const input = {
            "guess": [0, 10, 2, 3],
            "solutions": [0, 1, 2, 3],
            "ask": [1,2,1],
            "win": 0,
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);

     });

     it('should solutions less than 10', async function () {
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [0, 1, 2, 10],
            "ask": [1,2,1],
            "win": 0,
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });

     
     it('should ask invalid characteristic', async function () {
        const input = {
            "guess": [1, 1, 2, 3],
            "solutions": [0, 1, 2, 3],
            "ask": [5,2,1],
            "win": 0,
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });

     it('should ask invalid characteristic to ask', async function () {
        const input = {
            "guess": [1, 1, 2, 3],
            "solutions": [0, 1, 2, 3],
            "ask": [3,10,1],
            "win": 0,
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });


     it('should ask invalid ask response', async function () {
        const input = {
            "guess": [1, 1, 2, 3],
            "solutions": [0, 1, 2, 3],
            "ask": [3,2,2],
            "win": 0,
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });

     it('should invalid response in ask', async function () {
        const input = {
            "guess": [1, 1, 2, 3],
            "solutions": [0, 1, 2, 3],
            "ask": [1,1,1],
            "win": 0,
            "salt":231,
            "solHash": HASH
        }
        await assertionFailInProofGeneration(input);
     });

    it('should verify the solution when lose', async function () {
        const hash = '1777277235915767316413086087329044818051298499936897961862053055117000839929';
        const input = {
            "guess": [0, 1, 2, 3],
            "solutions": [3, 2, 1, 0],
            "ask": [1,2,1],
            "win": 0,
            "salt":231,
            "solHash": hash
        }
        const { proof, publicSignals } = await groth16.fullProve(input, "contracts/circuits/bonus_js/bonus.wasm","contracts/circuits/circuit_final_bonus.zkey");

        // generate the calldata based on the proof and the public signals
        const { a, b, c, Input } = await generateCallData(publicSignals, proof);
        
        // verify the proof 
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;

     });

     it('should verify the solution when win', async function () {
        const hash = '1777277235915767316413086087329044818051298499936897961862053055117000839929';
        const input = {
            "guess": [3, 2, 1, 0],
            "solutions":[3, 2, 1, 0],
            "ask": [1,1,0],
            "win": 1,
            "salt":231,
            "solHash": hash
        }
        const { proof, publicSignals } = await groth16.fullProve(input, "contracts/circuits/bonus_js/bonus.wasm","contracts/circuits/circuit_final_bonus.zkey");

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
        await groth16.fullProve(input, "contracts/circuits/bonus_js/bonus.wasm", "contracts/circuits/circuit_final_bonus.zkey");
        fail();
    } catch (error) {
        expect(error.toString().includes("Assert Failed")).to.be.true;
    }
}
