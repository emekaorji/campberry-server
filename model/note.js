const { Schema, model } = require('mongoose');

const Label = {
	name: String,
	color: String,
};

const User = {
	_id: String,
	name: String,
	email: String,
	image: String,
	permissions: [String],
};

const Comment = new Schema(
	{
		_id: String,
		content: String,
		commenter: User,
		reactions: { type: [String], defaultValue: [] },
	},
	{ timestamps: true }
);

const Note = new Schema(
	{
		_id: String,
		title: String,
		content: Object,
		color: String,
		labels: [Label],
		owner: User,
		collaborators: [User],
		comments: [Comment],
	},
	{ timestamps: true, _id: false }
);

module.exports = model('Note', Note);
