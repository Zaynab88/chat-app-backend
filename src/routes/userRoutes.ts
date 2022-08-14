import User from "../entities/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Raw } from "typeorm";
import express  from 'express'
const router = express();

router.post("/add", async (req, res) => {
	try {
		const { firstName, lastName, email, password } = req.body;

		const user = await User.findOne({ where: { email: email } });

		const hashPassword = await bcrypt.hash(password, 10);

		if (!user) {
			const newUser = await User.create({
				firstName,
				lastName,
				email,
				password: hashPassword
			})
			await newUser.save()
			const token = jwt.sign(
				{ email: newUser.email },
				process.env.TOKEN_KEY!, {
				expiresIn: "1d",
			})
			res.json({
				newUser,
				token
			});
		} else {
			res.status(400).send("user alredy exists")
		}
	} catch (err) {
		res.status(500).json(err);
	}
})

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await User.findOne({
			where: {
				email: Raw((alias) => `LOWER(${alias}) Like LOWER(:value)`, {
					value: `%${email}%`,
				}),
			},
			relations: {
				conversations: {users: true, messages: {user: true}}
			}
		});



		if (!user) {
			return res.status(400).json({ message: "User Not Found" })
		}
		const correctPass = await bcrypt.compare(password, user?.password!)
		if (!correctPass) {
			return res.status(400).json({ message: "incorrect Password" })

		}

		const token = jwt.sign({ email: user?.email }, process.env.TOKEN_KEY!, {
			expiresIn: '1d'
		});
		return res.json({ data: token, user: user })

	} catch (err) {
		res.status(500).json(err);
	}
})

router.get('/me', async (req, res) => {
	let token = req.get("auth")!
		try {
			let payload;
			payload = jwt.verify(token, process.env.TOKEN_KEY!)
			res.json(payload);
		} catch (err) {
			res.status(400).json(err)
		}
  })  
  
  router.get('/all', async (req, res) => {
		try {
			const users = await User.find();
			return res.json(users);
		} catch (err) {
			res.status(400).json(err)
		}
  })
    

export default router