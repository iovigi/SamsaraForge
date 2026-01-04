const mongoose = require('mongoose');

console.log("Testing Mongoose Connection inside API...");
mongoose.connect('mongodb://localhost:27017/samsara-forge')
    .then(() => {
        console.log("Connected Successfully!");
        process.exit(0);
    })
    .catch(e => {
        console.error("Connection Failed:", e);
        process.exit(1);
    });
