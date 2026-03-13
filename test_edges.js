import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./packages/api/prisma/dev.db');

db.all("SELECT * FROM Workflow WHERE name LIKE '%Test WKFL 5%' ORDER BY updatedAt DESC LIMIT 1", (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
        console.log("Found workflow!");
        console.log(JSON.stringify(JSON.parse(rows[0].connections), null, 2));
    }
});
db.close();
