require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
var dns = require('dns');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGO_URL;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(error => {
  if (error){
    return console.error(error);
  }
  console.log("Connected to MongoDB successfully");
});

const collection = client.db("freeCodeCamp").collection("urlShorterner");

async function createAndSaveUrl(original_url){
  const short_url = await collection.countDocuments() + 1;
  const document = {
    original_url: original_url,
    short_url: short_url
  }
  await collection.insertOne(document, (error, res) => {
    if (error){
      return console.error(error);
    }
  });
  const addedDocument = {
    original_url: document.original_url,
    short_url: document.short_url
  }
  return addedDocument;
};

async function getOriginalUrl(short_url){
  let document = await collection.findOne({
    short_url: Number(short_url)
  });
  return document.original_url;
};

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({extended:true})); // body-parsing middleware

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', async (req, res) => {
  const original_url = req.body.url;
  if (isValidUrl(original_url)){
    const hostname = new URL(original_url).hostname;
    const isValidHostname = dns.lookup(hostname, (error, address, family) => {
      if (error){
        console.error(error);
        return false;
      }
      return true;
    });
    if (isValidHostname){
      const document = await createAndSaveUrl(original_url);
      res.json(document);
    }
    else{
      return res.json({error: 'invalid url'});
    }
  }
  else{
    return res.json({error: 'invalid url'});
  }
});

app.get('/api/shorturl/:short_url?', async (req, res) => {
  const short_url = req.params.short_url;
  const original_url = await getOriginalUrl(short_url);
  res.redirect(original_url);
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

function isValidUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (error) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}
