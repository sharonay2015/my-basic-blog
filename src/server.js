import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';

// create backend app
const app = express();

// tell server where to serve static files from
app.use(express.static(path.join(__dirname, '/build')));
// parse json object, adds body property to request parameter 
app.use(bodyParser.json());

// function to set up database connection 
const withDB = async (operations, res) => {
  try {
    // connect to local database, return promise
    const client = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true }, { useNewUrlParser: true })

    // specify database to be used
    const db = client.db('basic-blog');

    // call operations function with db variable
    await operations(db);

  } catch (error) {
    res.status(500).json({ message: 'Error connecting to db' })
  }
}

// ********** define endpoints for app **********
// GET ARTICLE INFO
app.get('/api/articles/:name', async (req, res) => {
  withDB(async (db) => {
    // extract article name from url parameter
    const articleName = req.params.name;

    // findone query to find matching article
    const articleInfo = await db.collection('articles').findOne({ name: articleName })

    // response from the db
    res.status(200).json(articleInfo);
  }, res);
})

// UPVOTES
app.post('/api/articles/:name/upvote', async (req, res) => {
  withDB(async (db) => {
    // extract article name from url parameter
    const articleName = req.params.name;

    // findone query to find matching article
    const articleInfo = await db.collection('articles').findOne({ name: articleName });

    // update query to increase # of upvotes
    await db.collection('articles').updateOne({ name: articleName }, {
      '$set': {
        upvotes: articleInfo.upvotes + 1,
      },
    });
    // get the updated version of article 
    const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });

    // send updated article info as a response to client for up-to-date info
    res.status(200).json(updatedArticleInfo);
  }, res);
})

// COMMENTS
app.post('/api/articles/:name/add-comment', (req, res) => {
  const { username, text } = req.body;
  const articleName = req.params.name;

  withDB(async (db) => {
    // findone query to find matching article
    const articleInfo = await db.collection('articles').findOne({ name: articleName });
    await db.collection('articles').updateOne({ name: articleName }, {
      '$set': {
        // get existing comments and add new comment
        comments: articleInfo.comments.concat({ username, text }),
      },
    });
    // get the updated version of article info
    const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });

    // send updated article info as a response
    res.status(200).json(updatedArticleInfo);
  }, res);
})

// tells app all request should be passed on to app, unless caught by another api route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/build/index.html'));
})
// start server
app.listen(8000, () => console.log('Listening on port 8000'));
