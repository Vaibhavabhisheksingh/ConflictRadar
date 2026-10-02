const { io } = require("socket.io-client");

const BACKEND_URL = "http://localhost:4000";
const PROJECT_CODE = "CR-QPAY";

// Paste Developer 3's JWT here
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWI3MzI0YzQwMmU4YjQ2YmI4YWJhOGMiLCJpYXQiOjE3OTA2NTMzNDksImV4cCI6MTc5MTI1ODE0OX0.eKSVU1p2AkGp2UQT8GTQ3QBR_wPA8klgKwDyrJkWVio";

const socket = io(BACKEND_URL, {
    reconnection: false,
    auth: {
        token: TOKEN
    }
});

socket.on("connect", () => {
    console.log("Developer 3 connected:", socket.id);

    socket.emit("join-project", {
        projectCode: PROJECT_CODE
    });

    setTimeout(() => {
        console.log("\nSending Developer 3 activity...");

        socket.emit("activity", {
            projectCode: PROJECT_CODE,
            file: "c:\\Users\\win 10\\b.js",
            function: "calculateAdd",
            lineRange: {
                start: 6,
                end: 9
            },
            editedLine: 7,
            timestamp: new Date()
        });

        console.log("Developer 3 activity sent.");
        console.log("Waiting for overlap alerts...\n");
    }, 2000);
});

socket.on("roster-update", (data) => {
    console.log("ROSTER:", data.roster);
});

socket.on("overlap-alert", (data) => {
    console.log("\n🔥🔥🔥 OVERLAP ALERT RECEIVED 🔥🔥🔥");
    console.log(JSON.stringify(data, null, 2));
});

socket.on("join-error", (data) => {
    console.log("JOIN ERROR:", data);
});

socket.on("disconnect", (reason) => {
    console.log("Developer 3 disconnected:", reason);
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});