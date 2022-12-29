require('dotenv').config();
const mongoose = require('mongoose');
const Note = require('./model/note');

mongoose.set('strictQuery', false);
const DB_URI = process.env.DB_URI;
mongoose
	.connect(DB_URI)
	.then((res) => console.log('connected to remote database'))
	.catch((err) => console.log(err));

const io = require('socket.io')(3001, {
	cors: {
		origin: ['http://localhost:1212', 'http://localhost:4343'],
		methods: ['GET', 'POST'],
	},
});

io.on('connection', (socket) => {
	console.log('client connected to local server');

	socket.on('get-notes', async () => {
		const notes = await getAllNotes();

		console.log('loaded notes');
		socket.emit('notes-loaded', notes);
	});

	socket.on('get-note', async (noteId) => {
		const note = await findOrCreateDocument(noteId);

		socket.join(noteId);
		console.log('joined room');

		socket.emit('load-note', note);
		console.log('sent document data to client');

		socket.on('send-content', (delta) => {
			socket.broadcast.to(noteId).emit('receive-change', delta);
			console.log('received new changes from client ' + delta);
		});

		socket.on('update-content', async (content) => {
			await Note.findByIdAndUpdate(noteId, { content });
			console.log('updated note content in database');
		});

		socket.on('update-title', async (title) => {
			await Note.findByIdAndUpdate(noteId, { title });
			socket.broadcast.to(noteId).emit('receive-title', title);

			console.log('updated note title in database');
		});

		socket.on('update-color', async (color) => {
			await Note.findByIdAndUpdate(noteId, { color });
			socket.broadcast.to(noteId).emit('receive-label', color);

			console.log('updated note color in database');
		});

		socket.on('add-label', async ({ name, color }) => {
			await Note.findByIdAndUpdate(
				noteId,
				{
					$push: { labels: { name, color } },
				},
				{ returnNewDocument: true },
				(err, doc, res) => {
					if (err) {
						console.log(err);
						return;
					}
					console.log(doc);
					console.log(res);
				}
			);
			socket.broadcast.to(noteId).emit('label-updated', { name, color });

			console.log('updated note label in database');
		});

		// socket.on('update-collaborators', async (title) => {
		// 	await Note.findByIdAndUpdate(noteId, { title });
		// 	console.log('updated note title to database');
		// });

		// socket.on('add-comments', async ({ _id, content, commenter, reactions }) => {
		// 	await Note.findByIdAndUpdate(
		// 		noteId,
		// 		{
		// 			$push: { comments: { _id, content, commenter, reactions } },
		// 		},
		// 		{ returnDocument: 'after' },
		// 		(err, doc, res) => {
		// 			if (err) {
		// 				console.log(err);
		// 				return;
		// 			}
		// 			console.log(doc);
		// 			console.log(res);
		// 			socket.broadcast.to(noteId).emit('comment-added', doc);
		// 		}
		// 	);

		// 	console.log('updated note comments to database');
		// });

		// socket.on('react-to-comment', async ({ commentId, reaction }) => {
		// 	await Note.updateOne(
		// 		{
		// 			_id: noteId,
		// 			comments: {
		// 				$elemMatch: {
		// 					_id: commentId,
		// 				},
		// 			},
		// 		},
		// 		{
		// 			$push: { 'comments.$[outer].reactions': reaction },
		// 		},
		// 		{
		// 			arrayFilters: [{ 'outer._id': commentId }],
		// 			returnDocument: 'after',
		// 		},
		// 		(err, doc, res) => {
		// 			if (err) {
		// 				console.log(err);
		// 				return;
		// 			}
		// 			console.log(doc);
		// 			console.log(res);
		// 		}
		// 	);

		// 	console.log('updated note comments to database');
		// });
	});
});

async function findOrCreateDocument(id) {
	if (id == null) return;

	const document = await Note.findById(id);
	if (document) {
		console.log('found document with id: ' + id);
		return document;
	}

	const newNote = await Note.create({
		_id: id,
		title: '',
		content: '',
		color: '',
		labels: [],
		comments: [],
	});
	console.log('created note with id: ' + id);

	return newNote;
}

async function getAllNotes() {
	const notes = await Note.find();
	return notes;
}
