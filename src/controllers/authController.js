const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const User = require('../models/User');

const register = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password minimal 8 huruf'
    }),
    role: Joi.string().valid('teacher', 'student').required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const { name, username, email, password, role } = value;

  try {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) return res.status(400).json({ message: 'Email sudah digunakan!' });

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(400).json({ message: 'Username sudah digunakan!' });

    const lastUser = await User.findOne({
      order: [['id', 'DESC']],
      where: { role }
    });

    let number = lastUser ? parseInt(lastUser.id.slice(2)) + 1 : 1;
    const prefix = role === 'teacher' ? 'TE' : 'ST';
    const newID = `${prefix}${number.toString().padStart(3, '0')}`;

    const newUser = await User.create({
      id: newID,
      name,
      username,
      email,
      password_hash: await bcrypt.hash(password, 10),
      role,
      subscription_id: 1, // Default: Free
    });

    return res.status(201).json({
      message: 'Registrasi berhasil! Silakan login.',
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().allow('', null),
    email: Joi.string().email().allow('', null), 
    password: Joi.string().required().messages({
      'any.required': 'Password wajib diisi'
    })
  }).custom((value, helpers) => {
    if (!value.username && !value.email) {
      return helpers.message('Silakan isi username atau email');
    }
    return value;
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const { username, email, password } = value;

  try {
    // Cari user berdasarkan username ATAU email
    const user = await User.findOne({
      where: username ? { username } : { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'User tidak ditemukan' }); // Unauthorized
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(403).json({ message: 'Password salah' }); // Forbidden
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, subs: user.subscription_id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: err.message });
  }
};


module.exports = {
    login,
    register,
};