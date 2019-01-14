// Require libraries
let socketio = require('socket.io');
let express = require('express');
let XLSX = require('xlsx');

//firebase initilise
let admin = require("firebase-admin");
let serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://compsciproject-1dacd.firebaseio.com"
});
let db = admin.database();

// Make your express server
let app = express()
    .use(express.static('templates'))
    .listen(8000);
console.log("listening on port 8000");

// Start up Socket.IO:
let io = socketio.listen(app);


// function to convert users into database
function sheet_to_firebase_users(xlsvFile) {
    let ref = db.ref('/');
// read fixture from file and import worksheet
    let workbook = XLSX.readFile(xlsvFile);
    let first_sheet_name = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[first_sheet_name];

// convert worksheet to json
    worksheet = XLSX.utils.sheet_to_json(worksheet, {header: 1});
    let numItemsSheet = worksheet.length;
    let numItemsColumn = worksheet[0].length;
    let usersRef = ref.child("gameData");
    usersRef.update({numUsers: ([numItemsSheet]-1)});
    ref.child("/users").remove();

    for (let i = 1; i < numItemsSheet; i++) {
        for (let j = 0; j < numItemsColumn; j++) {
            let usersChild = ref.child("/users/"+worksheet[i][0]);
            usersChild.update({
                [worksheet[0][j]]: worksheet[i][j]});
                }
            }
    }

// function to convert fixture into firebase
function sheet_to_firebase_fixtures(xlsvFile) {
    let ref = db.ref('/');
    let fixtures = db.ref(`/fixtures`); // channel name for users
// read fixture from file and import worksheet
    // file =./input_documents/simulatedDatabase.xlsx
    let workbook = XLSX.readFile(xlsvFile);
    let first_sheet_name = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[first_sheet_name];

// convert worksheet to json
    worksheet = XLSX.utils.sheet_to_json(worksheet, {header: 1});
    let numItemsSheet = worksheet.length;
    let numItemsColumn = worksheet[0].length;
    let numRounds = worksheet[numItemsSheet-1][0].split(' ')[1];

    let matchDataRef = ref.child("gameData");
    matchDataRef.update({numRounds: [numRounds]});

    fixtures.once("value", function () {
        fixtures.remove();
            let roundNum = 0;
            // add child for rounds
            let fireChild = fixtures.child("Round"+roundNum);
            for (let i = 1; i < numItemsSheet; i+= 2) {
                // if new round add new child
                if( worksheet[i-1][0] !== worksheet[i][0]){
                    roundNum += 1;
                    fireChild = fixtures.child("Round"+roundNum);
                }
                // key for elements in round
                let newKey = fireChild.push();
                let newKeyId = newKey.key;
                // add each element into round
                for (let j = 0; j < numItemsColumn; j++) {
                    fireChild.child(newKeyId).update({
                        [worksheet[0][j]]: worksheet[i][j]
                    });
                }
            }
    });

    // function to find number of teams
    ref.once("value", function(data){
        let numTeams = data.child("fixtures/Round1").numChildren()*2;
        let gameChild = ref.child("gameData");
            gameChild.update({numTeams: [numTeams]})

    })

}

// function to convert fixture into firebase
function sheet_to_firebase_results(xlsvFile) {
    let ref = db.ref('/');
    let results = db.ref(`/results`); // channel name for users
// read fixture from file and import worksheet
    // file =./input_documents/simulatedDatabase.xlsx
    let workbook = XLSX.readFile(xlsvFile);
    let first_sheet_name = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[first_sheet_name];

// convert worksheet to json
    worksheet = XLSX.utils.sheet_to_json(worksheet, {header: 1});
    let numItemsSheet = worksheet.length;
    let numItemsColumn = worksheet[0].length;
    let numRounds = worksheet[numItemsSheet-1][0].split(' ')[1];

    let matchDataRef = ref.child("gameData");
    matchDataRef.update({numRounds: [numRounds]});

    results.once("value", function () {
        results.remove();
        let roundNum = 0;
        // add child for rounds
        let fireChild = results.child("Round"+roundNum);
        for (let i = 1; i < numItemsSheet; i+= 2) {
            // if new round add new child
            if( worksheet[i-1][0] !== worksheet[i][0]){
                roundNum += 1;
                fireChild = results.child("Round"+roundNum);
            }
            // key for elements in round
            let newKey = fireChild.push();
            let newKeyId = newKey.key;
            // add each element into round
            for (let j = 0; j < numItemsColumn; j++) {
                fireChild.child(newKeyId).update({
                    [worksheet[0][j]]: worksheet[i][j]
                });
            }
        }
    });

}

// SERVER START HERE
sheet_to_firebase_users('./input_documents/simulatedDatabase.xlsx');
sheet_to_firebase_fixtures('./input_documents/afl_fixture_2018.xlsx');
sheet_to_firebase_results('./input_documents/afl_results_2018.xlsx');

//initialise firebase variables
let ref = db.ref("/");
let scoresChild = ref.child("scores");
scoresChild.remove();
let gameChild = ref.child("gameData");
gameChild.update({"currentRound": 1});
gameChild.child("usersTipped").remove();
