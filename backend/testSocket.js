const { io } = require("socket.io-client");

const BACKEND_URL = "http://localhost:4000";
const PROJECT_CODE = "CR-QPAY";

// Paste Naitik's JWT here
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWI3NWZlYTQwMmU4YjQ2YmI4YWJlODYiLCJpYXQiOjE3OTA5NDEzMzEsImV4cCI6MTc5MTU0NjEzMX0.7Y33n9rkOkCUuikVY4u1S3H5tPKPU5dLI-MtcbIfstc";

const socket = io(BACKEND_URL, {
    reconnection: false,
    auth: {
        token: TOKEN
    }
});

socket.on("connect", () => {
    console.log("Naitik connected:", socket.id);

    socket.emit("join-project", {
        projectCode: PROJECT_CODE
    });

    setTimeout(() => {
        console.log("\nSending Naitik activity...");

        socket.emit("activity", {
            projectCode: PROJECT_CODE,
            file: "c:\\Users\\win 10\\b.js",
            function: "calculateTotal",
            lineRange: {
                start: 1,
                end: 4
            },
            editedLine: 2,
            timestamp: new Date()
        });

        console.log("Naitik activity sent.");
        console.log("Waiting for overlap alert...\n");
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
    console.log("Naitik disconnected:", reason);
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});