require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const client = require('./data/lib/client');
// Initiate database connection


// Application Setup
const ensureAuth = require('./data/lib/auth/ensure-auth');
const createAuthRoutes = require('./data/lib/auth/create-auth-routes');
const request = require('superagent');

const authRoutes = createAuthRoutes({
    async selectUser(email) {
        const result = await client.query(`
            SELECT id, email, hash, display_name as "displayName" 
            FROM users
            WHERE email = $1;
        `, [email]);
        return result.rows[0];
    },
    async insertUser(user, hash) {
        console.log(user);
        const result = await client.query(`
            INSERT into users (email, hash, display_name)
            VALUES ($1, $2, $3)
            RETURNING id, email, display_name;
        `, [user.email, hash, user.display_name]);
        return result.rows[0];
    }
});

const app = express();
app.use(morgan('dev')); // http logging
app.use(cors()); // enable CORS request
app.use(express.static('public')); // server files from /public folder
app.use(express.json()); // enable reading incoming json data

app.use(express.json()); // enable reading incoming json data
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

app.use('/api', ensureAuth);

app.use('/api/me', ensureAuth);

app.get('/api/me/favorites', async (req, res) => {
    try {
        const myQuery = `
            SELECT * FROM favorites
            WHERE user_id=$1
        `;
        
        const favorites = await client.query(myQuery, [req.userId]);
        
        res.json(favorites.rows);

    } catch (e) {
        console.error(e);
    }
});

app.post('/api/me/favorites', async(req, res) => {
    try {
        const {
            pokemon,
            type_1,
            base_experience,
            url_image
        } = req.body;

        const newFavorites = await client.query(`
            INSERT INTO favorites (pokemon, type_1, base_experience, url_image, user_id)
            values ($1, $2, $3, $4, $5)
            returning *
        `, [
            pokemon, 
            type_1, 
            base_experience,
            url_image, 
            req.userId,
        ]);

        res.json(newFavorites.rows[0]);

    } catch (e) {
        console.error(e);
    }
});

app.get('/api/pokedex', async (req, res) => {
    const data = await request.get(`https://alchemy-pokedex.herokuapp.com/api/pokedex?pokemon=${req.query.search}`);

    res.json(data.body.results);
});

app.listen(process.env.PORT, () => {
    console.log('listening at ', process.env.PORT);
});