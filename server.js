const Clarifai = require('clarifai');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const app = express();
const knex = require('knex');
// const app = new Clarifai.App({
// 	apiKey: '5d8f788b035e4b8aa1053d994bab2a0a'
// });
const image = require('./controllers/image');

// const handleApiCall = (req, res) =>{
// 	app.models
//     .predict(
//       Clarifai.FACE_DETECT_MODEL,
//       // '53e1df302c079b3db8a0a36033ed2d15',
//       req.nody.input)
//     .then(data =>{
//     	res.json(data);
//     })
//     .catch(err=> res.status(400).json('unable to work with API'))
// }
 
const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port:'5433',
    user : 'postgres',
    password : 'IL26051991',
    database : 'smart-brain'
  }
});

db.select('*').from('users').then(data=>{
	// console.log(data);
});

app.use(express.json());
app.use(cors());



app.get('/', (req, res)=>{
	res.send('success');
})

app.post('/signin',(req, res) =>{
	const {email, password } = req.body;
	if(!email || !password){
		return res.status(400).json('incorrect form submission');
	}
	db.select('email', 'hash').from('login')
	.where('email', '=', email)
	.then(data=>{
		const isValid = bcrypt.compareSync(password, data[0].hash);
		if(isValid){
			return db.select('*').from('users')
			.where('email', '=', email)
			.then(user =>{
				res.json(user[0])
			})
			.catch(err => res.status(400).json('unable to get user'))
		}else{
			res.status(400).json('wrong credentials')
		}
	})
	.catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register',(req, res)=>{
	const {email, name, password}=req.body;
	if(!email || !name || !password){
		return res.status(400).json('incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	db.transaction(trx => {
		trx.insert({
			hash:hash,
			email:email
		})
		.into('login')
		.returning('email')
		.then(loginEmail =>{
			return trx('users')
			.returning('*')
			.insert({
				email:loginEmail[0],
				name:name,
				joined:new Date()
			})
			.then(user=>{
				res.json(user[0]);
			})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err =>{
		res.status(400).json(('unable to register'));
	})
})

app.get('/profile/:id',(req,res)=>{
	const {id} = req.params;
	db.select('*').from('users').where({
		id: id
	})
	.then(user =>{
		if(user.length){
			res.json(user[0]);	
		}else{
			res.status(400).json('Not found');
		}
	})
	.catch(err => res.status(400).json('error getting user'))
})

// app.put('/image', (req, res)=>{
// 	const {id} = req.body;
// 	db('users').where('id', '=', id)
// 	.increment('entries',1)
// 	.returning('entries')
// 	.then(entries=>{
// 		res.json(entries[0]);
// 	})
// 	.catch(err => res.status(400).json('unable to get entries'))
// })
app.put('/image', (req, res) => { image.handleImage(req, res, db)})

app.post('/imageurl', (req, res)=>{image.handleApiCall(req, res)})


app.listen(3000, ()=>{
	console.log('app is running on port 3000');
})
