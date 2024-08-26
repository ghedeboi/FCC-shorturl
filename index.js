require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient } = require('mongodb');
const dns = require('dns');
const { URL } = require('url');
const mySecret = process.env['DB_URL']

const client = new MongoClient(mySecret);
const db = client.db("urlshortener");
const urls = db.collection("urls");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', function (req, res) {
    console.log(req.body);
    const url = req.body.url;

    // Check if the URL starts with 'http://' or 'https://'
    const urlPattern = /^(http:\/\/|https:\/\/)/;

    if (!urlPattern.test(url)) {
        return res.json({ error: 'invalid url' });
    }

    // Parse the URL using the URL constructor
    let hostname;
    try {
        const urlObject = new URL(url);
        hostname = urlObject.hostname;
    } catch (e) {
        return res.json({ error: 'invalid url' });
    }

    dns.lookup(hostname, async (err, address) => {
        if (err || !address) {
            return res.json({ error: 'invalid url' });
        } else {
            try {
                const urlCount = await urls.countDocuments({});
                const urlDoc = {
                    url: req.body.url,
                    short_url: urlCount + 1, // increment to ensure unique short_url
                };

                const result = await urls.insertOne(urlDoc);
                console.log(result);
                res.json({ original_url: url, short_url: urlDoc.short_url });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    });
});


app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = parseInt(req.params.short_url);  // Convert to integer
  console.log("Accessing short_url:", shortUrl);

  try {
    const urlDoc = await urls.findOne({ short_url: shortUrl });  // Query by integer value

    if (urlDoc) {
      const originalUrl = urlDoc.url;
      console.log("Redirecting to:", originalUrl);
      res.redirect(originalUrl);  // Redirect to the original URL
    } else {
      res.status(404).json({ error: "No short URL found for the given input" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});
