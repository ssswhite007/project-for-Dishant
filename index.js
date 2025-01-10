const express = require("express");  
const app = express();  
const axios = require("axios");  
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const { MongoClient } = require('mongodb');

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function fetchAndStoreData() {
    try {
        // Connect to MongoDB
        await client.connect();
        const database = client.db('university_db');
        const collection = database.collection('universities');

        // URL to scrape
        const url = "http://universities.hipolabs.com/search?country=United+States";

        // Fetch data from the URL
        const response = await axios.get(url);
        const data = response.data;
        // console.log(data);

        // Insert data into MongoDB
        if (Array.isArray(data)) {
            const formattedData = data.map(item => ({
                country: item.country,
                domains: item.domains,
                web_pages: item.web_pages,
                alpha_two_code: item.alpha_two_code,
                name: item.name,
                'state-province': item['state-province'] || null // Handle missing state-province
            }));

            await collection.insertMany(formattedData);
            console.log(`Inserted ${formattedData.length} records into MongoDB.`);
        } else {
            console.log("Unexpected data format");
        }
    } catch (error) {
        console.error("Error fetching or storing data:", error);
    } finally {
        // Close the MongoDB connection
        await client.close();
    }
}

async function exportDataToCSV() {
    try {
        // Connect to MongoDB
        await client.connect();
        const database = client.db('university_db');
        const collection = database.collection('universities');

        // Fetch data from MongoDB
        const data = await collection.find({}).toArray();

        // Define CSV writer
        const csvWriter = createCsvWriter({
            path: 'universities.csv',
            header: [
                { id: 'country', title: 'Country' },
                { id: 'domains', title: 'Domains' },
                { id: 'web_pages', title: 'Web Pages' },
                { id: 'alpha_two_code', title: 'Alpha Two Code' },
                { id: 'name', title: 'Name' },
                { id: 'state_province', title: 'State Province' }
            ]
        });

        // Write data to CSV
        await csvWriter.writeRecords(data);
        console.log('CSV file was written successfully');

        // Optionally, read the file to simulate a download
        const csvData = fs.readFileSync('universities.csv', 'utf8');
        console.log('CSV Data:', csvData);

    } catch (error) {
        console.error("Error exporting data to CSV:", error);
    } finally {
        // Close the MongoDB connection
        await client.close();
    }
}

app.get("/demo", async (req, res) => {  
    try {  
        const apiData = await fetchAndStoreData();  
        res.json({ success: true, data: apiData });  
    } catch (error) {  
        console.error(error);  
        res.status(500).json({ success: false, error: error.message });  
    }  
});  
app.get("/get-csv", async (req, res) => {  
    try {  
        const apiData = await exportDataToCSV();  
        res.json({ success: true, data: apiData });  
    } catch (error) {  
        console.error(error);  
        res.status(500).json({ success: false, error: error.message });  
    }  
});

const PORT = process.env.PORT || 5000;  
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));