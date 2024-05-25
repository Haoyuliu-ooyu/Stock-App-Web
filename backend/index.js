const express = require('express');
var cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const { MongoClient, ObjectId} = require('mongodb');
const bodyParser = require('body-parser');
const FINNHUB_API_KEY = 'cn84rq1r01qplv1emol0cn84rq1r01qplv1emolg';
const POLYGON_API_KEY = 'pUkjcmUBqpUDDDdtXApPfAV11xTUSEL8';


app.use(cors());
app.use(bodyParser.json());

const dbUrl = "mongodb+srv://hliu8571:rZY296ZkHNuPUpjp@csci571-assignment3.dsipz51.mongodb.net/?retryWrites=true&w=majority&appName=CSCI571-Assignment3";
const dbName = 'HW3';
let db;


const client = new MongoClient(dbUrl)

process.on('SIGINT', async () => {
  await client.close();
  process.exit();
});

//get all watchlist
app.get('/api/watchlist', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const watchlist = db.collection('Watchlist');

    const tickers = await watchlist.find({}).toArray(); // Fetches all documents

    res.status(200).json(tickers);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  } finally {
    // await client.close();
  }
});

//mongodb update watchlist
app.post('/api/watchlist', async (req, res) => {
  const data = req.body;
  try {
    await client.connect();
    const db = client.db(dbName);
    const watchlist = db.collection('Watchlist');

    const existingTicker = await watchlist.findOne({ ticker: data.ticker });
    if (existingTicker) {
      res.status(400).send('Ticker already exists.');
      return; // Stop execution if the ticker already exists
    }
    const result = await watchlist.insertOne(data);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  } finally {
    // await client.close();
  }
})

//delete from watchlist
app.delete('/api/watchlist/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  try {
    await client.connect();
    const db = client.db(dbName);
    const watchlist = db.collection('Watchlist');
    const result = await watchlist.deleteOne({ ticker: ticker });
    if (result.deletedCount === 0) {
      res.status(404).send("Ticker not found or could not be deleted.");
    } else {
      res.status(200).json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  } finally {
    // await client.close();
  }
});

//get balance
app.get('/api/balance', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const balanceDb = db.collection('Balance');

    const balance = await balanceDb.find({}).toArray(); // Fetches all documents

    res.status(200).json(balance[0].balance);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  } finally {
    // await client.close();
  }
});

//update balance
app.post('/api/balance', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const balanceDb = db.collection('Balance');

    const newBalance = req.body.balance;

    const filter = {};
    const updateDoc = {
      $set: {
        balance: newBalance,
      },
    };
    const result = await balanceDb.updateOne(filter, updateDoc);

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      res.status(404).send('Document not found and not upserted');
    } else {
      res.status(200).send(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

//get portfolio
app.get('/api/portfolio', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const portfolioDb = db.collection('Portfolio');
    const portfolio = await portfolioDb.find({}).toArray();
    res.status(200).json(portfolio);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

//delete a stock from portfolio


//mongodb create portfolio
app.post('/api/portfolio', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const portfolioDb = db.collection('Portfolio');

    const portfolioData = req.body;

    const filter = { ticker: portfolioData.ticker };
    const updateDoc = {
      $set: portfolioData,
    };

    const options = { upsert: true };

    const result = await portfolioDb.updateOne(filter, updateDoc, options);
    res.status(200).send(result)
    // if (result.upsertedCount > 0) {
    //   res.status(201).send('Portfolio created successfully');
    // } else if (result.modifiedCount > 0) {
    //   res.status(200).send('Portfolio updated successfully');
    // } else {
    //   res.status(200).send('No changes made to the portfolio');
    // }
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

app.delete('/api/portfolio/:ticker', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const portfolioDb = db.collection('Portfolio');

    // Assuming the unique identifier (e.g., userId) is passed as a query parameter
    const deleteTicker = req.params.ticker

    const result = await portfolioDb.deleteOne({ ticker: deleteTicker });
    res.status(200).send(result)

    // if (result.deletedCount === 0) {
    //   res.status(404).send("Portfolio not found.");
    // } else {
    //   res.status(200).send("Portfolio deleted successfully.");
    // }
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  } finally {
    // await client.close();
  }
});






//company profile
app.get('/api/profile/:symbol', async (req,res) => {
  const { symbol } = req.params;
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//hourly
app.get('/api/hourly/:symbol/:from/:to', async (req,res) => {
  const {symbol, from, to} = req.params;
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/hour/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//company history
app.get('/api/history/:symbol', async (req,res) => {
  const {symbol} = req.params;
  const today = new Date();
  const twoYearsAgo = new Date(new Date().setFullYear(today.getFullYear() - 2));
  const fromDate = twoYearsAgo.toISOString().split('T')[0];
  const toDate = today.toISOString().split('T')[0];
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//company lates price
app.get('/api/quote/:symbol', async (req,res) => {
  const { symbol } = req.params;
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//search autocomplete
app.get('/api/autocomplete/:query', async (req,res) => {
  const { query } = req.params;
  const url = `https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});



//company history
app.get('/api/news/:symbol', async (req,res) => {
  const {symbol} = req.params;
  const today = new Date();
  const sixMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 6));
  const sixMonthsAndOneDayAgo = new Date(sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 1));
  const fromDate = sixMonthsAndOneDayAgo.toISOString().split('T')[0];
  const toDate = today.toISOString().split('T')[0];
  const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//company reco trend
app.get('/api/recommendation-trends/:symbol', async (req,res) => {
  const { symbol } = req.params;
  const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//insider sentiment
app.get('/api/insider-sentiment/:symbol', async (req,res) => {
  const { symbol } = req.params;
  const url = `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${symbol}&from=2022-01-01&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//peers
app.get('/api/peers/:symbol', async (req,res) => {
  const { symbol } = req.params;
  const url = `https://finnhub.io/api/v1/stock/peers?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

//earning
app.get('/api/earning/:symbol', async (req,res) => {
  const { symbol } = req.params;
  const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error from Finnhub API: ${response.statusText}`);
      }
      const data = await response.json();
      replaceNullWithZero(data);
      res.json(data);
  } catch (error) {
      console.error('Error calling Finnhub API:', error);
      res.status(500).json({ message: 'Error calling external API' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function replaceNullWithZero(obj) {
  for (let key in obj) {
      if (obj[key] === null) {
          obj[key] = 0; // Replace null with 0
      } else if (typeof obj[key] === 'object') {
          replaceNullWithZero(obj[key]); // Recurse into the object
      }
  }
}

function timestampToYMD(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Pad with leading zeros
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}