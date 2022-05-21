pragma circom 2.0.0;

// [assignment] implement a variation of mastermind from https://en.wikipedia.org/wiki/Mastermind_(board_game)#Variation as a circuit
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

template MastermindVariation() {
    // Public inputs guess
    signal input guess[4];
    signal input hitBlow[4]; //1 blow 2 hit
    signal input solHash;

    // Private inputs solutions
    signal input solutions[4];
    signal input salt;
    
    // Outputs
    signal output hash;

    var colors = 6; //max colors to select

    component lessThan[12];
    component equals[12];
    component equalsHB[16];

    //assert colors < colors (6)
    for (var i=0; i<4; i++) {
        lessThan[i] = LessThan(4);
        lessThan[i].in[0] <== guess[i];
        lessThan[i].in[1] <== colors;
        lessThan[i].out === 1;

        lessThan[i+4] = LessThan(4);
        lessThan[i+4].in[0] <== solutions[i];
        lessThan[i+4].in[1] <== colors;
        lessThan[i+4].out === 1;

        //assert hit and blow <=2
        lessThan[i+8] = LessThan(4);
        lessThan[i+8].in[0] <== hitBlow[i];
        lessThan[i+8].in[1] <== 3;
        lessThan[i+8].out === 1;
    }

    //assert differents colors to guess
    var k=0;
    for (var i=0; i<3; i++) {
        for (var j=i+1; j<4; j++) {
            equals[k] = IsEqual();
            equals[k].in[0] <== guess[i];
            equals[k].in[1] <== guess[j];
            equals[k].out === 0;
            k++;
        }
    }

    //assert differents colors to solutions
    for (var i=0; i<3; i++) {
        for (var j=i+1; j<4; j++) {
            equals[k] = IsEqual();
            equals[k].in[0] <== solutions[i];
            equals[k].in[1] <== solutions[j];
            equals[k].out === 0;
            k++;
        }
    }

    // hit & blow set
    var spouts[4] = [0, 0, 0, 0];
    var spout=0;
    component equalHB[20];

    for (var j=0; j<4; j++) {
        for (k=0; k<4; k++) {
            equalHB[4*j+k] = IsEqual();
            equalHB[4*j+k].in[0] <== solutions[k];
            equalHB[4*j+k].in[1] <== guess[j];
            spout += equalHB[4*j+k].out;
            if (j == k) {
               spout += equalHB[4*j+k].out;
            }
        }
        spouts[j] = spout;
        spout = 0;
    }

    //assert blow and hits
    for (var i=0; i<4; i++) {
        equalHB[i+16] = IsEqual();
        equalHB[i+16].in[0] <== spouts[i];
        equalHB[i+16].in[1] <== hitBlow[i];
        equalHB[i+16].out === 1;
    }

    // Verify that the hash of the private solution matches hash
    component poseidon = Poseidon(5);
    poseidon.inputs[0] <== salt;
    for (var i=0; i<4; i++) {
        poseidon.inputs[i+1] <== solutions[i];
    }
    hash <== poseidon.out;
    solHash === hash;
}

component main {public [guess, hitBlow, solHash ]} =  MastermindVariation();